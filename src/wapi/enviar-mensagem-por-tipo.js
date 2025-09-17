const { enviarMensagemAPI } = require('./enviar-mensagem-api');
const { enviarAudioAPI } = require('./enviar-audio-api');
const { enviarImagemAPI } = require('./enviar-imagem-api');

/**
 * Envia uma mensagem baseada no tipo ("texto", "audio" ou "imagem").
 *
 * @param {Object} options
 * @param {Object} options.credenciais - Objeto com instance_id e token.
 * @param {string} options.tipo - Tipo da mensagem: "texto" | "audio" | "imagem".
 * @param {string} options.telefone - Número do destinatário (formato internacional, sem símbolos).
 * @param {string} options.conteudo - Texto ou URL do áudio/imagem.
 *
 * @returns {Object} Resultado do envio.
 */
async function enviarMensagemPorTipo({ credenciais, tipo, telefone, conteudo }) {
  switch (tipo) {
    case 'texto':
      return await enviarMensagemAPI(
        credenciais,
        telefone,
        conteudo,
        '', // nome omitido
        '', // mensagem original omitida
        false,
        null // contextoChat omitido, pois essa função só é chamada quando chamada
             // tratarEnviosGlide no receberMensagem e lá, já atualizamos o chat
      );

    case 'audio':
      return await enviarAudioAPI(
        credenciais,
        telefone,
        conteudo,
        '', // nome omitido
        '' // mensagem original omitida
      );

    case 'imagem':
      return await enviarImagemAPI(
        credenciais,
        telefone,
        conteudo,
        '', // nome omitido
        '' // mensagem original omitida
      );

    default:
      throw new Error(`Tipo de mensagem "${tipo}" não suportado.`);
  }
}

module.exports = enviarMensagemPorTipo;

// (async () => {
//   const credenciais = {
//     token: 'fZqyUAI1gI1FvfSJg4ZBoDx7PGp5PZUGl',
//     instance_id: 'w-api_KNLOJ5c4al',
//   };

//   await enviarMensagemPorTipo({
//     credenciais,
//     tipo: 'audio',
//     telefone: '558196948615',
//     conteudo: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/kHKRQoSFoytgQIFTZnSX/pub/jn6KJK4srkubq4Tayrzf.mp3',
//   });
// })();