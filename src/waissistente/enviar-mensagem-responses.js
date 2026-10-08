const axios = require("axios");
const { buscarNoSupabase } = require("../supabase/buscar-no-supabase");
const { atualizarNoSupabase } = require("../supabase/atualizar-no-supabase");
const { criaLogger } = require("../utils/logger");

/**
 * Envia a mensagem do contato para a Responses API e devolve o JSON do bot.
 *
 * Substitui criar-thread-e-enviar-mensagem, enviar-mensagem-de-thread-existente
 * e buscar-ultima-mensagem-da-thread. Nao existe mais thread, run nem polling:
 * a chamada e sincrona e a memoria vem de previous_response_id.
 *
 * A coluna indicada por nomeThread passa a guardar o id da ultima response
 * (resp_...) em vez do id da thread.
 *
 * @param {Object} data
 * @param {string} data.mensagem - Mensagem (ou buffer de mensagens) do contato.
 * @param {string} data.nome - Nome do contato.
 * @param {string} data.dadosFornecidos - Dados injetados no turno pelo cliente.
 * @param {string} data.telefoneContato - Identificador do contato.
 * @param {string} data.instrucoes - Prompt do agente (substitui o assistantId).
 * @param {string|null} data.responseIdAnterior - Valor atual da coluna nomeThread.
 * @param {string} data.nomeThread - Coluna onde gravar o id da response.
 * @param {Object} [data.filtrosAdicionais] - Ex: { id_chip: 3 }.
 * @param {string} data.apiKey - Chave da OpenAI.
 * @param {Object} data.supabase - Cliente Supabase.
 * @param {string} data.tabela - Tabela de contatos.
 *
 * @returns {Promise<Object>} O conteudo JSON parseado da resposta do bot.
 */
async function enviaMensagemResponses({ data }) {
  const {
    mensagem,
    nome,
    dadosFornecidos,
    telefoneContato,
    instrucoes,
    responseIdAnterior,
    nomeThread,
    filtrosAdicionais,
    apiKey,
    supabase,
    tabela,
  } = data;

  const logger = criaLogger(telefoneContato);

  const MODEL = "gpt-4.1-mini";
  const RESPONSES_URL = "https://api.openai.com/v1/responses";
  const REQUEST_TIMEOUT_MS = 120000;
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];
  const TEMPERATURE = 0.6;
  const TOP_P = 1;

  const colunaResponseId = nomeThread || "openai_thread_id";

  const filtrosComTelefone = {
    ...filtrosAdicionais,
    identificador: telefoneContato,
  };

  const filtrosFormatados = Object.entries(filtrosComTelefone).reduce(
    (acc, [chave, valor]) => {
      acc[chave] = ["=", valor];
      return acc;
    },
    {}
  );

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ------------------------------------------------------------------
  // Classificacao de erros
  // ------------------------------------------------------------------

  // Bug intermitente de scopes da OpenAI (401 missing_scope)
  const isTransientScopeError = (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.error?.message || "";
    return status === 401 && /missing scope|insufficient permissions/i.test(msg);
  };

  // Rate limit, indisponibilidade e timeout de rede
  const isRetryableError = (error) => {
    if (isTransientScopeError(error)) return true;
    const status = error.response?.status;
    if (status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    return ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(
      error.code
    );
  };

  // Response anterior expirada, apagada ou de outra conta.
  const isMissingPreviousResponse = (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.error?.message || "";
    const param = error.response?.data?.error?.param || "";
    if (status !== 404 && status !== 400) return false;
    return (
      param === "previous_response_id" ||
      /previous_response_id|not found/i.test(msg)
    );
  };

  // ------------------------------------------------------------------
  // Resolucao do id anterior
  // Ids antigos de thread (thread_...) sao ignorados: comecam cadeia nova.
  // ------------------------------------------------------------------

  const normalizaResponseId = (valor) => {
    const id = (valor || "").toString().trim();
    return id.startsWith("resp_") ? id : null;
  };

  const resolvePreviousResponseId = async () => {
    const doParametro = normalizaResponseId(responseIdAnterior);
    if (doParametro) return doParametro;

    // Reconfere no banco, como o fluxo antigo fazia antes de criar thread.
    try {
      const registros = await buscarNoSupabase(
        supabase,
        tabela,
        filtrosFormatados,
        [colunaResponseId],
        true
      );
      const doBanco = normalizaResponseId(registros?.[0]?.[colunaResponseId]);
      if (doBanco) {
        logger.add(">>> [WAt] response_id recuperado do banco na reconferencia");
      }
      return doBanco;
    } catch (erro) {
      logger.add(`>>> [WAt] Falha ao reconferir response_id: ${erro.message}`);
      return null;
    }
  };

  // ------------------------------------------------------------------
  // Chamada a Responses API
  // ------------------------------------------------------------------

  const createResponse = async (chainId) => {
    const body = {
      model: MODEL,
      instructions: instrucoes,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `mensagem: ${mensagem} nomePessoa: ${nome} dadosFornecidos: ${dadosFornecidos}`,
            },
          ],
        },
      ],
      temperature: TEMPERATURE,
      top_p: TOP_P,
      store: true,
      text: {
        format: { type: "json_object" },
      },
    };

    if (chainId) {
      body.previous_response_id = chainId;
    }

    const response = await axios.post(RESPONSES_URL, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

    return response.data;
  };

  // ------------------------------------------------------------------
  // Extracao do texto do array output
  // ------------------------------------------------------------------

  const extractOutputText = (responseData) => {
    if (
      typeof responseData.output_text === "string" &&
      responseData.output_text.trim()
    ) {
      return responseData.output_text.trim();
    }

    const output = Array.isArray(responseData.output) ? responseData.output : [];
    const chunks = [];

    for (const item of output) {
      if (item.type !== "message") continue; // ignora reasoning e outros Items
      for (const part of item.content || []) {
        if (part.type === "output_text" && typeof part.text === "string") {
          chunks.push(part.text);
        }
        if (part.type === "refusal") {
          logger.add(`>>> [WAt] Recusa do modelo: ${part.refusal}`);
        }
      }
    }

    return chunks.join("\n").trim();
  };

  const parseResponse = (responseData) => {
    if (responseData.status === "incomplete") {
      logger.add(
        `>>> [WAt] Response incompleta: ${JSON.stringify(
          responseData.incomplete_details || null
        )}`
      );
    }

    const rawText = extractOutputText(responseData);
    if (!rawText) {
      logger.add(">>> [WAt] Nenhum texto retornado no output da response.");
      return null;
    }

    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsedContent = JSON.parse(cleaned);

    return { parsedContent, responseId: responseData.id };
  };

  // ------------------------------------------------------------------
  // Orquestracao com retry
  // ------------------------------------------------------------------

  const processa = async () => {
    let chainId = await resolvePreviousResponseId();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        logger.add(
          `>>> [WAt] Tentativa ${attempt + 1} na Responses API${
            chainId ? " (encadeada)" : " (cadeia nova)"
          }`
        );

        const responseData = await createResponse(chainId);
        const resultado = parseResponse(responseData);
        if (resultado) return resultado;

        if (attempt < MAX_ATTEMPTS - 1) {
          await delay(RETRY_DELAYS_MS[attempt] || 20000);
          continue;
        }
        return null;
      } catch (error) {
        // Historico perdido: refaz sem encadeamento, perdendo o contexto
        // anterior mas respondendo o contato.
        if (chainId && isMissingPreviousResponse(error)) {
          logger.add(">>> [WAt] previous_response_id invalido. Cadeia nova.");
          chainId = null;
          continue;
        }

        const isParseError = error instanceof SyntaxError;

        if (
          (isParseError || isRetryableError(error)) &&
          attempt < MAX_ATTEMPTS - 1
        ) {
          logger.add(
            `>>> [WAt] Erro na tentativa ${attempt + 1}: ${
              isParseError ? "JSON invalido" : error.message
            }`
          );
          await delay(RETRY_DELAYS_MS[attempt] || 20000);
          continue;
        }

        throw error;
      }
    }
    return null;
  };

  // ------------------------------------------------------------------
  // Execucao
  // ------------------------------------------------------------------

  try {
    logger.add(">>> [WAt] [ETAPA 1: ENVIANDO MENSAGEM VIA RESPONSES API]");

    const resultado = await processa();

    if (!resultado) {
      throw new Error("Falha ao obter resposta do modelo apos as tentativas.");
    }

    const { parsedContent, responseId } = resultado;

    logger.add(`>>> [WAt] Response recebida: ${responseId}`);
    logger.add(`>>> [WAt] Gravando em ${colunaResponseId}`);

    await atualizarNoSupabase(
      supabase,
      tabela,
      filtrosComTelefone,
      {
        [colunaResponseId]: responseId,
        openai_id_ultima_mensagem: responseId,
      },
      false
    );

    return parsedContent;
  } catch (erro) {
    logger.error(">>> [WAt] Erro em enviaMensagemResponses:", erro.message);
    console.error("[WAt] Erro em enviaMensagemResponses:", erro.message);
    throw erro;
  }
}

module.exports = { enviaMensagemResponses };