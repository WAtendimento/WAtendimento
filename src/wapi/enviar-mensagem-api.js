const axios = require("axios");
const criaLogger = require("../utils/logger");
const { dividirString } = require("../utils/dividir-string");

/**
 * Função para enviar mensagem via API WAPI.
 *
 * @param {Object} credenciais - Objeto contendo as credenciais: instance_id e token.
 * @param {string} number - Número de telefone do destinatário (em formato internacional, sem espaços ou símbolos).
 * @param {string} message - Mensagem única ou array de mensagens a serem enviadas.
 * @param {string} name - Nome do destinatário.
 * @param {string} mensagemDoUsuario - Mensagem de referência do usuário.
 * @param {boolean} [multipleMessages=false] - Define se a função enviará várias mensagens separadas.
 *
 * @returns {Object} Resultado do envio da mensagem.
 */
async function enviarMensagemAPI(
  credenciais,
  number,
  message,
  name,
  mensagemDoUsuario,
  multipleMessages = false
) {
  const { instance_id, token } = credenciais;
  const logger = criaLogger(number);

  if (!number || typeof number !== "string") {
    throw new Error(
      "O número deve ser uma string válida e não pode estar vazio."
    );
  }

  if (!message || typeof message !== "string") {
    throw new Error(
      "A mensagem deve ser uma string válida e não pode estar vazia."
    );
  }

  if (!number.startsWith("55")) {
    number = `55${number}`;
  }

  const url = `https://api.w-api.app/v1/message/send-text?instanceId=${credenciais.instance_id}`;

  const sendSingleMessage = async (msg) => {
    try {
      const payload = {
        phone: number,
        message: msg,
        delayMessage: 2,
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${credenciais.token}`,
          "Content-Type": "application/json",
        },
      });

      // logger.add("Mensagem enviada com sucesso:", msg);
      // console.log("Mensagem enviada com sucesso:", msg);

      logger.result(
        `"${msg}"\n- Destinatário: ${name}\n- Em resposta a: "${mensagemDoUsuario}".`
      );
      return { sucesso: true, telefone: number, response: response.data };
    } catch (error) {
      console.error(
        `Erro ao enviar mensagem para ${name} (${number}):`,
        error.message
      );

      if (error.response) {
        console.error("Detalhes do erro da API:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      return { sucesso: false, telefone: number, erro: error.message };
    }
  };

  if (multipleMessages) {
    const partes = dividirString(message); // Dividindo a mensagem corretamente
    const results = [];
    for (const parte of partes) {
      if (parte.trim()) {
        logger.add(`Enviando:  ${parte} `);
        const result = await sendSingleMessage(parte);
        results.push(result);
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Delay de 3 segundos entre mensagens
      }
    }
    return results;
  } else {
    return sendSingleMessage(message);
  }
}

module.exports = enviarMensagemAPI;

