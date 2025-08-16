
const axios = require('axios');

async function consultaOpenAI({ data }) {    
    const apiKey = data.apiKey;    
    const assistantId = data.assistant_id;    
    const messageContent = data.invoice_text;  
   
    const maxRetries = 10; // Número máximo de tentativas após a primeira

    console.log("[WAt]API Key recebida:", apiKey);
    console.log("[WAt]Assistant ID recebido:", assistantId);
    console.log("[WAt]Conteúdo da mensagem:", messageContent);

    const createThread = async () => {        
        try {            
            console.log("[WAt]Iniciando criação de thread...");            
            const response = await axios.post('https://api.openai.com/v1/threads', {}, 
                { headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'}});            

            console.log("[WAt]Thread criada com sucesso. ID:", response.data.id);            
            return response.data.id;        
        } catch (error) {            
            console.error("[WAt]Erro ao criar thread:", error.response?.data || error.message);            
            throw new Error(`Erro ao criar thread: ${error.response?.data || error.message}`);        
        }    
    };

    const createMessage = async (threadId) => {
        try {            
            console.log(`[WAt]Enviando mensagem para a thread ${threadId}...`);            
            const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`,
                { role: "user", content: messageContent }, 
                { headers: {'Authorization': `Bearer ${apiKey}`,                        
                'Content-Type': 'application/json','OpenAI-Beta': 'assistants=v2'} });            
                
            console.log("[WAt]Mensagem enviada com sucesso. ID da mensagem:", response.data.id);            
            return response.data.id;        
        } catch (error) {            
            console.error("[WAt]Erro ao enviar mensagem:", error.response?.data || error.message);            
            throw new Error(`Erro ao enviar mensagem: ${error.response?.data || error.message}`);        
        }    
    };

    const createRun = async (threadId) => {        
        try {            
            console.log(`[WAt]Iniciando run para a thread ${threadId} com assistant_id ${assistantId}...`);            
            const response = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`,                
                { assistant_id: assistantId },                
                { headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' }});            
                console.log("[WAt]Run iniciado com sucesso. ID do run:", response.data.id);            
                return response.data.id;        
            } catch (error) {            
                console.error("[WAt]Erro ao iniciar run:", error.response?.data || error.message);            
                throw new Error(`Erro ao iniciar run: ${error.response?.data || error.message}`);        
            }    
    };
    
    const getAssistantResponse = async (threadId) => {        
        try {            
            console.log(`[WAt]Buscando respostas do assistente na thread ${threadId}...`);            
            const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`,                
                { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' } } );
            
            console.log("[WAt]Mensagens recebidas da thread:", response.data.data);            
            const assistantMessage = response.data.data.find(msg => msg.role === "assistant");            
            if (assistantMessage) {               
                console.log("[WAt]Resposta do assistente encontrada:", assistantMessage.content);
                
                // Pegando o conteúdo correto
                const messageContent = assistantMessage.content.find(item => item.type === 'text');
                
                if (messageContent && messageContent.text && messageContent.text.value) {                    
                    try {
                        // Removendo blocos Markdown antes de fazer o parse do JSON
                        const cleanedJSON = messageContent.text.value.replace(/```json|```/g, '').trim();
                        const parsedResponse = JSON.parse(cleanedJSON);
                        
                        return { invoice: parsedResponse }; // Retorna o objeto JSON corretamente                    
                    } catch (parseError) {                        
                        console.error("[WAt]Erro ao fazer o parse da resposta:", parseError.message);                        
                        throw new Error("Erro ao fazer o parse da resposta do assistente.");                    
                    }                
                } else {                    
                    console.log("[WAt]Campo 'value' não encontrado na resposta do assistente.");                    
                    throw new Error("Campo 'value' não encontrado na resposta do assistente.");                
                }            
            } else {                
                console.log("[WAt]Nenhuma resposta do assistente foi encontrada.");                
                return null;            
            }        
        } catch (error) {            
            console.error("[WAt]Erro ao buscar resposta:", error.response?.data || error.message);            
            throw new Error(`Erro ao buscar resposta: ${error.response?.data || error.message}`);        
        }    
    };
    
    
    
    const waitAndCheckResponse = async (threadId, delay) => {        
        console.log(`[WAt]Esperando ${delay} segundos antes de verificar a resposta...`);        
        await new Promise(resolve => setTimeout(resolve, delay * 1000)); // Espera o tempo especificado        
        return await getAssistantResponse(threadId); // Checa a resposta após o tempo de espera    

    };
    try {        
        console.log("[WAt]Iniciando o processo de comunicação com o assistente...");        
        const threadId = await createThread();        
        await createMessage(threadId);
        console.log("[WAt]Criando o run...");        
        await createRun(threadId);
        // Primeira tentativa após 20 segundos        
        console.log("[WAt]Tentativa 1: Verificando após 20 segundos...");        
        let invoice = await waitAndCheckResponse(threadId, 20);        
        if (invoice) {            
            console.log("[WAt]Resposta encontrada na tentativa 1.");            
            return invoice;        
        }
        // Tentativas subsequentes a cada 3 segundos, até o máximo de tentativas        for (let attempt = 2; attempt <= maxRetries + 1; attempt++) {            console.log(`[WAt]Tentativa ${attempt}: Verificando após 3 segundos...`);            invoice = await waitAndCheckResponse(threadId, 3);            if (invoice) {                console.log(`[WAt]Resposta encontrada na tentativa ${attempt}.`);                return invoice;            }        }
        console.log("[WAt]Resposta não encontrada após todas as tentativas.");        
        return { error: "Nenhuma resposta encontrada após as tentativas." };    
    } catch (error) {        
        console.error("[WAt]Erro geral no processo:", error.message);        
        return { error: error.message };    
    }
}

module.exports =  { consultaOpenAI };
