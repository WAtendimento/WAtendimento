const axios = require('axios');
const criaLogger = require("../utils/logger");

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
async function enviarImagemAPI(credenciais, number, message, name, mensagemDoUsuario) {
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

  const url = `https://api.w-api.app/v1/message/send-image?instanceId=${credenciais.instance_id}`;

  const sendSingleMessage = async (imageUrl) => {
    try {
      const payload = {
        phone: number,
        image: imageUrl, // nesse caso, url é a URL do áudio
        delayMessage: 2,
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${credenciais.token}`,
          'Content-Type': 'application/json',
        },
      });

      // logger.add("Mensagem enviada com sucesso:", url);
      // console.log("Mensagem enviada com sucesso:", url);

      logger.result(`"${imageUrl}"\n- Destinatário: ${name}\n- Em resposta a: "${mensagemDoUsuario}".`);
      return { sucesso: true, telefone: number, response: response.data };
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${name} (${number}):`, error.message);

      if (error.response) {
        console.error('Detalhes do erro da API:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      return { sucesso: false, telefone: number, erro: error.message };
    }
  };

  return sendSingleMessage(message);
}

module.exports = enviarImagemAPI;

// (async () => {
//   const credenciais = {
//     token: "t1DMDiLA3gsXee7Lx69VKNN8AYX5VuFd5",
//     instance_id: "LQXS31-KJJ2WW-4G61UR", // utilizando 558194747345
//   };

//   await enviarImagemAPI(
//     credenciais,
//     "81988961959",
//     "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/June_odd-eyed-cat.jpg/640px-June_odd-eyed-cat.jpg",
//     "Loja Exemplo",
//     "Mensagem original do usuário"
//   );
// })();
