const axios = require("axios");
const { criaLogger } = require("../utils/logger");

/**
 * Envia uma mensagem para um thread existente e cria uma execução associada no OpenAI Assistants.
 *
 * @param {Object} data - Dados necessários para o envio da mensagem.
 * @param {string} data.thread_id - ID do thread onde a mensagem será enviada.
 * @param {string} data.user_message - Conteúdo da mensagem do usuário.
 * @param {string} data.nome - Nome da pessoa associada à mensagem.
 * @param {string} data.dadosFornecidos - Dados do contato.
 * @param {string} data.telefoneContato - Telefone do contato para fins de log.
 *
 * @returns {Promise<Object>} Retorna um objeto com o resultado da operação.
 */
async function enviaMensagemThreadExistente({ data }) {
  const threadId = data.thread_id;
  const userMessage = data.user_message;
  const nome = data.nome;
  const telefoneContato = data.telefoneContato;
  const dadosFornecidos = data.dadosFornecidos;

  const apiKey = data.apiKey;
  const assistantId = data.assistantId;

  if (!assistantId || !threadId) {
    throw new Error("Assistant ID or Thread ID is missing.");
  }

  // Construindo a mensagem no formato esperado
  const formattedMessage = `mensagem: ${userMessage} nomePessoa: ${nome} dadosFornecidos: ${dadosFornecidos}`;

  const messageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;
  const runUrl = `https://api.openai.com/v1/threads/${threadId}/runs`;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const logger = criaLogger(telefoneContato);
  const createMessageAndRun = async () => {
    const maxRetries = 3; // Número máximo de tentativas
    let attempts = 0; // Contador de tentativas

    while (attempts < maxRetries) {
      attempts += 1;
      try {
        // Log the content being sent to the assistant
        logger.add(
          ">>> Conteúdo sendo enviado ao assistente",
          formattedMessage
        );

        // Enviando a mensagem
        const messageBody = {
          role: "user",
          content: formattedMessage,
        };

        const messageResponse = await axios.post(messageUrl, messageBody, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        });

        // Criando uma run associada ao assistente
        const runBody = {
          assistant_id: assistantId,
        };

        const runResponse = await axios.post(runUrl, runBody, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        });

        logger.add(
          ">>> Mensagem enviada e run criada com sucesso:",
          runResponse.data.id
        );

        return {
          messageResponse: messageResponse.data,
          runId: runResponse.data.id,
        };
      } catch (error) {
        console.error(`[WAt][enviarMensagemThreadExistente] Erro na tentativa ${attempts}:`, error.message);
        logger.error(">>> Erro na tentativa", attempts);

        if (attempts >= maxRetries) {
          console.error("[WAt]Número máximo de tentativas alcançado.");
          logger.error("Número máximo de tentativas alcançado.");
          throw new Error(
            `Erro ao criar mensagem ou execução após ${maxRetries} tentativas: ${error.message}`
          );
        }

        // console.log("[WAt]Tentando novamente em 2 segundos...");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay antes de tentar novamente
      }
    }
  };

  try {
    //  console.log("[WAt]Iniciando processo...");
    await delay(2000);
    const { messageResponse, runId } = await createMessageAndRun();
    return {
      success: true,
      message: formattedMessage,
      runId,
      messageId: messageResponse.id,
    };
  } catch (error) {
    console.error("[WAt]Erro na execução:", error.message);
    logger.error("Erro na execução:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { enviaMensagemThreadExistente };


