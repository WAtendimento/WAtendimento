const axios = require("axios");
const { criaLogger } = require("../utils/logger");
const { dividirString } = require("../utils/dividir-string");
const { atualizarJSONChat } = require("../chat/atualizar-json-chat");

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
  multipleMessages = false,
  contextoChat = null //id_chip, connectedPhone, fromMe, tabelaContato, bot, supabaseClient
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

  // Só adiciona o DDI se for um número puramente numérico com 11 dígitos (ou 9 ou 10)
  const apenasNumeros = /^\d+$/;

  if (apenasNumeros.test(number) && !number.startsWith("55")) {
    number = `55${number}`;
  }

  const url = `https://api.w-api.app/v1/message/send-text?instanceId=${credenciais.instance_id}`;

  const sendSingleMessage = async (msg) => {
    try {
      // Tempo de digitando proporcional ao tamanho, para nao parecer robo.
      // Cerca de 25 caracteres por segundo, entre 3 e 15 segundos.
      const segundosDigitando = Math.min(15, Math.max(3, Math.round(msg.length / 25)));

      const payload = {
        phone: number,
        message: msg,
        delayMessage: segundosDigitando,
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${credenciais.token}`,
          "Content-Type": "application/json",
        },
      });

      // console.log('[WAt] Contexto chat: ', contextoChat);

      // Atualizar o JSON do chat
      if (contextoChat) {
        await atualizarJSONChat({
          id_chip: contextoChat.id_chip,
          numeroContato: number,
          connectedPhone: contextoChat.connectedPhone,
          fromMe: contextoChat.fromMe,
          nomeContato: name,
          mensagem: message,
          tabelaContato: contextoChat.tabelaContato,
          bot: contextoChat.bot,
          supabaseClient: contextoChat.supabaseClient,
        });
      }

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
        console.error("[WAt]Detalhes do erro da API:", {
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
        logger.add(`>>> [WAt] Enviando:  ${parte} `);
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

module.exports = { enviarMensagemAPI };

