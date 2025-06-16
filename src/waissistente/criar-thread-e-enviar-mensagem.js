const axios = require("axios");
const buscarNoSupabase = require("../supabase/buscar-no-supabase");
const criaLogger = require("../utils/logger");
const supabaseCredentials = require("../../credenciais/supabase");
const atualizarNoSupabase = require("../supabase/atualizar-no-supabase");
/**
 * Cria uma nova thread no agente gpt e envia uma mensagem utilizando os dados fornecidos.
 *
 * @param {Object} data - Objeto contendo as informações necessárias para criar a thread e enviar a mensagem.
 * @param {string} data.mensagem - Mensagem que será enviada na thread.
 * @param {string} data.nome - Nome do destinatário ou contato relacionado à mensagem.
 * @param {string} data.dadoContato - Dados do contato relacionado à mensagem.
 * @param {string} data.telefoneContato - Telefone do cliente para quem a mensagem será enviada.
 * @param {Object} [data.filtrosAdicionais] - Objeto opcional contendo chaves e valores usados como filtros adicionais para identificar o cliente de forma única.
 * @param {string[]} [data.camposConflito]
 * * Retorna a resposta da função `criaThreadeEnviaMensagem` dependendo do sucesso ou falha na execução.
 *
 * Em caso de sucesso, retorna um objeto com a resposta do assistente e o ID da thread.
 * Em caso de erro, retorna um objeto com um status de falha e a mensagem de erro.
 *
 * @returns {Object} Objeto contendo o resultado da execução.
 *
 * @example
 * {
 *   value: {
 *     text: string,         // Texto da resposta do assistente
 *     lastMessageId: string, // ID da última mensagem do assistente
 *     status: string,       // Status da resposta ("processed")
 *     resp1: string,        // Resposta 1, dependendo da lógica da aplicação
 *     resp2: string,        // Resposta 2, dependendo da lógica da aplicação
 *     resp3: string,        // Resposta 3, dependendo da lógica da aplicação
 *     resp4: string         // Resposta 4, dependendo da lógica da aplicação
 *   },
 *   thread_id: string      // ID da thread criada ou existente
 * }
 *
 * @example
 * // Em caso de erro
 * {
 *   success: false,        // Indica que houve uma falha
 *   error: string          // Mensagem de erro detalhada
 * }
 */
async function criaThreadeEnviaMensagem({ data }) {
  const apiKey = data.apiKey;
  const assistantId = data.assistantId

  const mensagem = data.mensagem;
  const nome = data.nome;
  const dadosFornecidos = data.dadosFornecidos;
  const telefoneContato = data.telefoneContato;
  const tabela = supabaseCredentials.table_data.table_contatos;
  const logger = criaLogger(telefoneContato);
  const filtrosAdicionais = data.filtrosAdicionais;
  //const camposConflito = data.camposConflito;

  const filtrosComTelefone = {
    ...filtrosAdicionais,
    telefone: telefoneContato,
  };

  const filtrosFormatados = Object.entries(filtrosComTelefone).reduce(
    (acc, [chave, valor]) => {
      acc[chave] = ["=", valor];
      return acc;
    },
    {}
  );

  const withTimeout = async (promise, timeout, stepName) => {
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        console.warn(`>>> Tempo limite atingido na etapa: ${stepName}`);
        reject(new Error(`Tempo limite atingido na etapa: ${stepName}`));
      }, timeout);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  };

  //Função que cria a thread
  const createThread = async () => {
    const createThreadUrl = "https://api.openai.com/v1/threads";
    const threadBody = {};

    const threadResponse = await axios.post(createThreadUrl, threadBody, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
    });
    logger.add(`>>> Thread criada: ${threadResponse.data.id}`);
    return threadResponse.data.id;
  };

  //Função que cria mensagem na Thread
  const createMessage = async (threadId) => {
    const messageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

    const messageBody = {
      role: "user",
      content: `mensagem: ${mensagem} nomePessoa: ${nome} dadosFornecidos: ${dadosFornecidos}`,
    };

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.add(`>>> Tentativa ${attempt} de enviar mensagem...`);

        const messageResponse = await axios.post(messageUrl, messageBody, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        });

        logger.add(">>> Mensagem enviada com sucesso.");
        return messageResponse.data;
      } catch (error) {
        logger.add(
          `>>> Erro ao enviar mensagem (tentativa ${attempt}): ${error.message}`
        );
        if (attempt >= maxRetries) {
          throw new Error(
            `Falha ao enviar mensagem após ${maxRetries} tentativas.`
          );
        }
        await delay(2000);
      }
    }
  };

  //Função que cria a run pós envio da mensagem Thread
  const createRun = async (threadId) => {
    const runUrl = `https://api.openai.com/v1/threads/${threadId}/runs`;

    const runBody = {
      assistant_id: assistantId,
    };

    try {
      const runResponse = await axios.post(runUrl, runBody, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
      });

      return runResponse.data;
    } catch (error) {
      logger.error(`>>> Erro na função createRun para threadId: ${threadId}`);
      logger.error(`>>> Mensagem do erro: ${error.message}`);
      throw error;
    }
  };

  const getAssistantResponse = async (threadId) => {
    const messagesUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

    const maxRetries = 5;
    const interval = 5000;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.add(`>>> Tentativa ${attempt} de buscar resposta...`);

        const response = await axios.get(messagesUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        });

        const messages = response.data.data;
        const assistantMessage = messages.find(
          (msg) => msg.role === "assistant"
        );

        if (assistantMessage) {
          logger.add(">>> Resposta do assistente encontrada.");
          const messageText =
            assistantMessage.text ||
            assistantMessage.content ||
            assistantMessage.message;

          if (!messageText) {
            throw new Error(
              "Estrutura de resposta inesperada: campo 'text' não encontrado na mensagem."
            );
          }

          const messageContent = Array.isArray(messageText)
            ? messageText[0].text.value
            : messageText;

          let parsedContent;
          try {
            parsedContent = JSON.parse(messageContent);
          } catch (e) {
            throw new Error(
              "Falha ao parsear o conteúdo da mensagem como JSON."
            );
          }

          return {
            text: messageContent,
            lastMessageId: assistantMessage.id,
            status: "processed",
            ...parsedContent,
            resp1: "",
            resp2: "",
            resp3: "",
            resp4: "",
          };
        } else {
          logger.add(">>> Nenhuma resposta do assistente encontrada.");
        }
      } catch (error) {
        logger.add(
          `>>> Erro ao buscar resposta do assistente (tentativa ${attempt}): ${error.message}`
        );
      }

      if (attempt < maxRetries) {
        await delay(interval);
      }
    }

    throw new Error(
      `Falha ao obter resposta do assistente após ${maxRetries} tentativas.`
    );
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    let threadId;
    const filtros = {
      telefone: ["=", telefoneContato.toString()],
      ...filtrosFormatados,
    };
    const dadosOpenAIContato = await withTimeout(
      buscarNoSupabase(tabela, filtros, ["openai_thread_id"], true),
      60000,
      "buscar contato"
    );

    if (dadosOpenAIContato[0].openai_thread_id) {
      logger.add(">>> thread existia no Banco após nova verificação");
      threadId = await dadosOpenAIContato[0].openai_thread_id;
    } else {
      const threadData = await withTimeout(
        createThread(),
        60000,
        "createThread"
      );

      threadId = await threadData;
      //TO-DO verificar necessidade e retirar
      let registro = {
        telefone: telefoneContato,
        openai_thread_id: threadId,
      };

      registro = Object.assign(registro, filtrosAdicionais);

      await withTimeout(
        await atualizarNoSupabase(tabela, filtrosComTelefone, registro, false),
        60000,
        "atualizar contato"
      );
    }

    await withTimeout(createMessage(threadId), 60000, "createMessage");
    await withTimeout(createRun(threadId), 60000, "createRun");

    const assistantResponse = await withTimeout(
      getAssistantResponse(threadId),
      60000,
      "getAssistantResponse"
    );

    logger.add(`>>> Atualizando o telefone do contato: ${telefoneContato}`);

    logger.add(
      `>>> Com o ID da última mensagem:${assistantResponse.lastMessageId}`
    );

    let registro = {
      telefone: telefoneContato,
      openai_id_ultima_mensagem: assistantResponse.lastMessageId,
    };

    registro = Object.assign(registro, filtrosAdicionais);

    await withTimeout(
      60000,
      await atualizarNoSupabase(
        tabela,
        filtrosComTelefone,
        { openai_id_ultima_mensagem: assistantResponse.lastMessageId },
        false
      ),
      "atualizar contato (final)"
    );

    return {
      value: assistantResponse,
      thread_id: threadId,
    };
  } catch (error) {
    logger.error("Erro em Cria Thread e Envia Mensagem:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { criaThreadeEnviaMensagem };

