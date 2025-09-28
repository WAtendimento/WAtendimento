const enviarMensagemPorTipo = require('../wapi/enviar-mensagem-por-tipo');


async function tratarEnviosGlide(dados, chip) {

  const ehEnvioDoGlide = dados?.fromMe === true && dados?.idMensagem === 'Envio do Sistema' && dados?.usuarioNumero && dados?.connectedPhone;

  if (!ehEnvioDoGlide) {
    console.log('[WAt] ⛔️ Não é Glide, saindo da função.');
    return false;
  }

  const credenciais = {
    instance_id: chip?.instance_id,
    token: chip?.new_token,
  };

  const telefone = dados.usuarioNumero?.toString();
  const conteudo = dados.mensagem;

  const tipo = identificarTipoMensagem(conteudo);


  console.log({
    telefone,
    tipo,
    conteudo,
  });

  try {
    const resultado = await enviarMensagemPorTipo({
      credenciais,
      tipo,
      telefone,
      conteudo,
    });

    if (!resultado?.sucesso) {
      console.error('[WAt] ❌ Falha ao enviar a mensagem. Verifique as credenciais ou conteúdo.');
      return false;
    }

    console.log('[WAt] ✅ Mensagem enviada com sucesso.');
    return true;
  } catch (erro) {
    console.error('[WAt] 💥 Erro inesperado ao enviar mensagem:', erro);
    return false;
  }
}

function identificarTipoMensagem(conteudo) {
  if (typeof conteudo !== 'string') {
    console.log('[WAt] 🔎 Conteúdo não é string, retornando "texto"');
    return 'texto';
  }

  const url = conteudo.toLowerCase();

  const isUrl = url.startsWith('https://');

  if (isUrl && (url.includes('.mp3') || url.includes('.ogg'))) {
    console.log('[WAt] 🎧 Detected áudio');
    return 'audio';
  }

  if (isUrl && (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg'))) {
    console.log('[WAt] 🖼️ Detected imagem');
    return 'imagem';
  }

  return 'texto';
}

module.exports = { tratarEnviosGlide };

// // //teste
// (async () => {
//   const chip = {
//     token: 'fZqyUAI1gI1FvfSJg4ZBoDx7PGp5PZUGl',
//     instance_id: 'w-api_KNLOJ5c4al',
//   };

//   const dados = {
//     fromMe: true,
//     idMensagem: 'Envio do Sistema',
//     usuarioNumero: '558196948615',
//     connectedPhone: '558694416060',
//     mensagem: 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/kHKRQoSFoytgQIFTZnSX/pub/jn6KJK4srkubq4Tayrzf.mp3',
//   };

//   console.log('[WAt] 🧪 Iniciando execução de teste...');
//   const resultado = await tratarEnviosGlide(dados, chip);
//   console.log('[WAt] 🎯 Resultado final do envio:', resultado);
// })();
