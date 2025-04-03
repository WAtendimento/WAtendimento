const axios = require("axios");
const criaLogger = require("../utils/logger");
const { dividirString } = require("../utils/dividir-string");

/**
 * Função para enviar mensagem via API WAPI.
 *
 * @param {Object} credenciais - Objeto contendo as credenciais: host, connectionKey e token.
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
  const { host, connectionKey, token } = credenciais;
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

  const url = `https://${host}/quere/send-text?connectionKey=${connectionKey}`;

  const sendSingleMessage = async (msg) => {
    try {
      const payload = {
        phoneNumber: number,
        text: msg,
        delayMessage: 8,
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
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

// Chamada de Teste
// const credenciais = {
//   host: "host05.serverapi.dev",
//   token: "tPSXhzSzeLWTm1Q7dMXWaYSP3glSPuyGY",
//   connectionKey: "w-api_fXJqPqo5LL",
// };

// (async () => {
//   await enviarMensagemAPI(
//     credenciais,
//     "81988532136",
//     "Entendido, você está disposto a investir até R$160.000,00 e deseja o Corolla.\nVocê está pensando em um carro a partir de que ano?", // Teste com quebras de linha para múltiplas mensagens
//     "Loja exemplo",
//     "Mensagem do usuário",
//     true // Teste com multipleMessages = true
//   );
// })();
