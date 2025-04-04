/** @CustomParams{	"OPENAI_API_KEY": {		"type": "string",		"title": "OpenAI API Key",		"description": "API Key for accessing OpenAI services"	},	"assistant_id": {		"type": "string",		"title": "Assistant ID",		"description": "ID of the assistant you are communicating with"	},	"invoice_text": {		"type": "string",		"title": "Invoice Text",		"description": "Text of the invoice to send to the assistant"	}}*/
const axios = require('axios');

async function consultaOpenAI({ data }) {    
    const apiKey = data.OPENAI_API_KEY;    
    const assistantId = data.assistant_id;    
    const messageContent = data.invoice_text;  
   
    const maxRetries = 10; // Número máximo de tentativas após a primeira

    console.log("API Key recebida:", apiKey);
    console.log("Assistant ID recebido:", assistantId);
    console.log("Conteúdo da mensagem:", messageContent);

    const createThread = async () => {        
        try {            
            console.log("Iniciando criação de thread...");            
            const response = await axios.post('https://api.openai.com/v1/threads', {}, 
                { headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'}});            

            console.log("Thread criada com sucesso. ID:", response.data.id);            
            return response.data.id;        
        } catch (error) {            
            console.error("Erro ao criar thread:", error.response?.data || error.message);            
            throw new Error(`Erro ao criar thread: ${error.response?.data || error.message}`);        
        }    
    };

    const createMessage = async (threadId) => {
        try {            
            console.log(`Enviando mensagem para a thread ${threadId}...`);            
            const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`,
                { role: "user", content: messageContent }, 
                { headers: {'Authorization': `Bearer ${apiKey}`,                        
                'Content-Type': 'application/json','OpenAI-Beta': 'assistants=v2'} });            
                
            console.log("Mensagem enviada com sucesso. ID da mensagem:", response.data.id);            
            return response.data.id;        
        } catch (error) {            
            console.error("Erro ao enviar mensagem:", error.response?.data || error.message);            
            throw new Error(`Erro ao enviar mensagem: ${error.response?.data || error.message}`);        
        }    
    };

    const createRun = async (threadId) => {        
        try {            
            console.log(`Iniciando run para a thread ${threadId} com assistant_id ${assistantId}...`);            
            const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`,                
                { assistant_id: assistantId },                
                { headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' }});            
                console.log("Run iniciado com sucesso. ID do run:", response.data.id);            
                return response.data.id;        
            } catch (error) {            
                console.error("Erro ao iniciar run:", error.response?.data || error.message);            
                throw new Error(`Erro ao iniciar run: ${error.response?.data || error.message}`);        
            }    
    };
    
    const getAssistantResponse = async (threadId) => {        
        try {            
            console.log(`Buscando respostas do assistente na thread ${threadId}...`);            
            const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`,                
                { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' } } );
            
            console.log("Mensagens recebidas da thread:", response.data.data);            
            const assistantMessage = response.data.data.find(msg => msg.role === "assistant");            
            if (assistantMessage) {               
                console.log("Resposta do assistente encontrada:", assistantMessage.content);
                
                // Pegando o conteúdo correto
                const messageContent = assistantMessage.content.find(item => item.type === 'text');
                
                if (messageContent && messageContent.text && messageContent.text.value) {                    
                    try {
                        // Removendo blocos Markdown antes de fazer o parse do JSON
                        const cleanedJSON = messageContent.text.value.replace(/```json|```/g, '').trim();
                        const parsedResponse = JSON.parse(cleanedJSON);
                        
                        return { invoice: parsedResponse }; // Retorna o objeto JSON corretamente                    
                    } catch (parseError) {                        
                        console.error("Erro ao fazer o parse da resposta:", parseError.message);                        
                        throw new Error("Erro ao fazer o parse da resposta do assistente.");                    
                    }                
                } else {                    
                    console.log("Campo 'value' não encontrado na resposta do assistente.");                    
                    throw new Error("Campo 'value' não encontrado na resposta do assistente.");                
                }            
            } else {                
                console.log("Nenhuma resposta do assistente foi encontrada.");                
                return null;            
            }        
        } catch (error) {            
            console.error("Erro ao buscar resposta:", error.response?.data || error.message);            
            throw new Error(`Erro ao buscar resposta: ${error.response?.data || error.message}`);        
        }    
    };
    
    
    
    const waitAndCheckResponse = async (threadId, delay) => {        
        console.log(`Esperando ${delay} segundos antes de verificar a resposta...`);        
        await new Promise(resolve => setTimeout(resolve, delay * 1000)); // Espera o tempo especificado        
        return await getAssistantResponse(threadId); // Checa a resposta após o tempo de espera    

    };
    try {        
        console.log("Iniciando o processo de comunicação com o assistente...");        
        const threadId = await createThread();        
        await createMessage(threadId);
        console.log("Criando o run...");        
        await createRun(threadId);
        // Primeira tentativa após 20 segundos        
        console.log("Tentativa 1: Verificando após 20 segundos...");        
        let invoice = await waitAndCheckResponse(threadId, 20);        
        if (invoice) {            
            console.log("Resposta encontrada na tentativa 1.");            
            return invoice;        
        }
        // Tentativas subsequentes a cada 3 segundos, até o máximo de tentativas        for (let attempt = 2; attempt <= maxRetries + 1; attempt++) {            console.log(`Tentativa ${attempt}: Verificando após 3 segundos...`);            invoice = await waitAndCheckResponse(threadId, 3);            if (invoice) {                console.log(`Resposta encontrada na tentativa ${attempt}.`);                return invoice;            }        }
        console.log("Resposta não encontrada após todas as tentativas.");        
        return { error: "Nenhuma resposta encontrada após as tentativas." };    
    } catch (error) {        
        console.error("Erro geral no processo:", error.message);        
        return { error: error.message };    
    }
}

module.exports = consultaOpenAI;
