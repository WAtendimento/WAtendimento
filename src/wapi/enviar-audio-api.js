const axios = require('axios');
const { criaLogger } = require("../utils/logger");
const { converterParaMp3Base64 } = require('../utils/converter-mp3-para-base64_do_glide');

/**
 * Função para enviar mensagem via API WAPI.
 *
 * @param {Object} credenciais - Objeto contendo as credenciais: instance_id.
 * @param {string} number - Número de telefone do destinatário (em formato internacional, sem espaços ou símbolos).
 * @param {string} message - Mensagem única ou array de mensagens a serem enviadas.
 * @param {string} name - Nome do destinatário.
 * @param {string} mensagemDoUsuario - Mensagem de referência do usuário.
 * @param {boolean} [multipleMessages=false] - Define se a função enviará várias mensagens separadas.
 *
 * @returns {Object} Resultado do envio da mensagem.
 */
async function enviarAudioAPI(credenciais, number, message, name, mensagemDoUsuario) {
  const { instance_id, token } = credenciais;
  const logger = criaLogger(number);

  if (!number || typeof number !== 'string') {
    throw new Error('O número deve ser uma string válida e não pode estar vazio.');
  }

  if (!message || typeof message !== 'string') {
    throw new Error('A mensagem deve ser uma string válida e não pode estar vazia.');
  }

  if (!number.startsWith('55')) {
    number = `55${number}`;
  }

  const url = `http://api.w-api.app/v1/message/send-audio?instanceId=${credenciais.instance_id}`;

  const sendSingleMessage = async (audioUrl) => {
    try {
      let audioFinal = audioUrl;

      // Se for link do Glide, converte para base64
      if (audioUrl.includes('glide-prod.appspot.com')) {
        console.log('[WAt]🔄 Convertendo áudio do Glide para MP3 real...');
        audioFinal = await converterParaMp3Base64(audioUrl);
      }

      const payload = {
        phone: number,
        audio: audioFinal,
        delayMessage: 2,
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${credenciais.token}`,
          'Content-Type': 'application/json',
        },
      });

      // logger.add("Mensagem enviada com sucesso:", url);
      // console.log("[WAt]Mensagem enviada com sucesso:", url);

      logger.result(`"${audioUrl}"\n- Destinatário: ${name}\n- Em resposta a: "${mensagemDoUsuario}".`);
      return { sucesso: true, telefone: number, response: response.data };
    } catch (error) {
      console.error(`[WAt]Erro ao enviar mensagem para ${name} (${number}):`, error.message);

      if (error.response) {
        console.error('[WAt]Detalhes do erro da API:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      return { sucesso: false, telefone: number, erro: error.message };
    }
  };

    return sendSingleMessage(message);
}

module.exports = { enviarAudioAPI };

