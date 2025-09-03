const axios = require("axios");
const { criaLogger } = require("../utils/logger");
const { atualizarNoSupabase } = require("../supabase/atualizar-no-supabase");
/**
 * Busca a última mensagem de uma thread específica, utilizando os dados fornecidos.
 *
 * @param {Object} data - Objeto contendo as informações necessárias para a busca.
 * @param {string} data.threadId - ID da thread que será consultada.
 * @param {string} data.lastMessageId - ID da última mensagem conhecida da thread.
 * @param {string} data.telefoneContato - Telefone do cliente relacionado à thread.
 * @param {Object} [data.filtrosAdicionaisUnicos] - Objeto opcional contendo chaves e valores usados como filtros adicionais para identificar o cliente de forma única.
 * @param {string[]} data.camposConflito - Nomes das colunas que a função insertOuUpsert usará para definir o conflito em caso de upsert
 */

async function buscaUltimaMensagemThread({ data }) {
  const {
    threadId,
    lastMessageId,
    apiKey,
    tabela,
    telefoneContato,
    filtrosAdicionaisUnicos,
    camposConflito,
    supabase
  } = data;
 
  const logger = criaLogger(telefoneContato);
  const filtrosComTelefone = {
    ...filtrosAdicionaisUnicos,
    telefone: telefoneContato,
  };

  try {
    //Formata corretamente independente do tipo do campo no supabase.. string ou numero.
    const filtrosFormatados = Object.entries(filtrosComTelefone).reduce(
      (acc, [chave, valor]) => {
        acc[chave] = ["=", valor];
        return acc;
      },
      {}
    );

    const telefone = { telefone: ["=", telefoneContato] };

    const filtros = Object.assign(telefone, filtrosFormatados);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const resultadoProcessamento = await processNewMessages({
      threadId,
      lastMessageId,
      apiKey,
      tabela,
      telefoneContato,
      logger,
      filtrosComTelefone,
      camposConflito,
      supabase
    });
   
    return resultadoProcessamento;
  } catch (erro) {
    logger.error("Erro em buscaUltimaMensagemThread:", erro.message);
    logger.error("Stack:", erro.stack);

    if (!Array.isArray(camposConflito)) {
      logger.error("ERRO: camposConflito não é um array como esperado!", camposConflito);
    }

    return { status: "erro", mensagem: erro.message };
  }
}

const processNewMessages = async ({
  threadId,
  lastMessageId,
  apiKey,
  tabela,
  logger,
  filtrosComTelefone,
  supabase,
}) => {
  const messagesUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

  try {
    logger.add("==== [ETAPA 2: AGUARDANDO RESPOSTA DO ASSISTENTE] ====");

    const fetchMessagesWithRetries = async (retries = 7, interval = 5000) => {
      logger.add(
        `>>> Iniciando fetchMessagesWithRetries com ${retries} tentativas e intervalo de ${interval}ms.`
      );

      for (let attempt = 1; attempt <= retries; attempt++) {
        logger.add(`>>> Tentativa ${attempt} de buscar mensagens.`);

        try {
          const response = await axios.get(messagesUrl, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2",
            },
          });

          logger.add(
            `>>> Resposta recebida na tentativa ${attempt}. Verificando mensagens...`
          );

          const messages = response.data.data || [];
          logger.add(
            `>>> Número total de mensagens recebidas: ${messages.length}`
          );

          //Filtra apenas as mensagens do usuário
          const userMessages = messages
            .filter((message) => message.role === "user")
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          const lastUserMessage = userMessages[userMessages.length - 1];

          if (!lastUserMessage) {
            logger.add(
              ">>> Nenhuma mensagem do usuário encontrada. Não há como determinar a última resposta do assistente."
            );
            return { message: null, status: "no user messages" };
          }
          // Filtra apenas as mensagens do assistente e ordena por data
          const assistantMessages = messages
            .filter(
              (message) =>
                message.role === "assistant" &&
                new Date(message.created_at) >
                  new Date(lastUserMessage.created_at)
            )
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          logger.add(
            `>>> Número de mensagens do assistente: ${assistantMessages.length}`
          );

          if (assistantMessages.length > 0) {
            const lastAssistantMessage =
              assistantMessages[assistantMessages.length - 1];

            if (
              lastAssistantMessage.content &&
              lastAssistantMessage.content.length > 0
            ) {
              return lastAssistantMessage; // Retorna a última mensagem válida
            } else {
              logger.add(
                `>>> Tentativa ${attempt}: Última mensagem ainda está vazia. Retentando em ${interval}ms...`
              );
            }
          } else {
            logger.add(
              `>>> Tentativa ${attempt}: Nenhuma mensagem do assistente encontrada. Retentando em ${interval}ms...`
            );
          }
        } catch (error) {
          logger.add(
            `>>> Erro na tentativa ${attempt}: ${error.message}. Retentando em ${interval}ms...`
          );
          logger.error(`>>> Stack trace: ${error.stack}`);
        }

        // Aguarda antes da próxima tentativa
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        } else {
          logger.add(">>> Tentativas esgotadas. Falha ao buscar mensagens.");
          throw new Error(
            "Falha ao buscar mensagens após múltiplas tentativas."
          );
        }
      }
    };

    const lastAssistantMessage = await fetchMessagesWithRetries();

    if (!lastAssistantMessage) {
      console.log("[WAt] Nenhuma mensagem de 'assistant' encontrada.");
      return { message: null, status: "no messages found" };
    }

    console.log("[WAt] Resposta recebida da OpenAI");

    if (lastMessageId && lastMessageId === lastAssistantMessage.id) {
      logger.add(
        `>>> A última mensagem (ID = ${lastAssistantMessage.id}) já foi processada.`
      );
      return { message: null, status: "no new messages" };
    }

    const messageText =
      lastAssistantMessage.text ||
      lastAssistantMessage.content ||
      lastAssistantMessage.message ||
      "";

    if (!messageText) {
      throw new Error("Mensagem retornada sem conteúdo esperado.");
    }

    let messageContent;
    if (Array.isArray(messageText) && messageText.length > 0) {
      messageContent = messageText[0].text?.value || "";
    } else if (typeof messageText === "object" && messageText.value) {
      messageContent = messageText.value;
    } else if (typeof messageText === "string") {
      messageContent = messageText;
      console.log(
        "Objeto do Last Assistant Message",
        JSON.stringify(lastAssistantMessage, null, 2)
      );

      console.log(
        "JSON do Last Assistant Message",
        lastAssistantMessage.content[0].text.value
      );
    } else {
      console.log(`[WAt]Estrutura inesperada da mensagem: ${lastAssistantMessage}`);
      // throw new Error("Estrutura inesperada da mensagem.", messageContent);
      console.log(
        "Objeto do Last Assistant Message",
        JSON.stringify(lastAssistantMessage, null, 2)
      );

      console.log(
        "JSON do Last Assistant Message",
        lastAssistantMessage.content[0].text.value
      );
    }
    const parsedContent = JSON.parse(messageContent);

    // TO-DO Verificar se essa atualizacao no supabase pode ser feita no retorno da chamada
    await atualizarNoSupabase(
      supabase,
      tabela,
      filtrosComTelefone,
      { openai_id_ultima_mensagem: lastAssistantMessage.id },
      false
    );

    return parsedContent;
  } catch (error) {
    logger.error("Erro em processNewMessages:", error.message);
    console.error("[WAt]Erro em processNewMessages:", error.message);
    console.log(logger.finish());
    throw error;
  }
};

module.exports = { buscaUltimaMensagemThread };