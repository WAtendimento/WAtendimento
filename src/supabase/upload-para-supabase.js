const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Faz upload de um arquivo de uma URL (imagem ou áudio) para o Supabase Storage
 * O bucket é sempre 'midias', com subpastas 'audio' ou 'image'
 *
 * @param {string} urlArquivo - URL do arquivo (de imagem ou áudio)
 * @returns {Promise<string>} - URL pública do arquivo salvo
 */
async function uploadParaSupabase(entrada, supabase) {
  let buffer, contentType, extensao, subpasta;

  if (!entrada) {
    throw new Error('Entrada inválida para upload');
  }

  if (entrada.startsWith('data:')) {
    // === CASO BASE64 ===
    const matches = entrada.match(/^data:(.*?);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Base64 malformado');
    }

    contentType = matches[1];
    const base64Data = matches[2];
    buffer = Buffer.from(base64Data, 'base64');

    extensao = contentType.split('/')[1];
    subpasta = contentType.startsWith('audio/') ? 'audio' : 'image';
  } else if (entrada.startsWith('https://')) {
    // === CASO URL ===
    const response = await axios.get(entrada, { responseType: 'arraybuffer' });
    buffer = Buffer.from(response.data);
    contentType = response.headers['content-type'];

    const urlLower = entrada.toLowerCase();
    extensao = contentType?.split('/')[1] || 'jpg';
    subpasta = contentType?.startsWith('audio/') ? 'audio' : 'image';

    if (contentType === 'application/octet-stream' || !contentType) {
      if (urlLower.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
        extensao = 'mp3';
        subpasta = 'audio';
      } else if (urlLower.endsWith('.ogg')) {
        contentType = 'audio/ogg';
        extensao = 'ogg';
        subpasta = 'audio';
      } else if (urlLower.endsWith('.png')) {
        contentType = 'image/png';
        extensao = 'png';
        subpasta = 'image';
      } else if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
        extensao = 'jpg';
        subpasta = 'image';
      } else {
        contentType = 'image/jpeg';
        extensao = 'jpg';
        subpasta = 'image';
      }
    }
  } else {
    throw new Error('Formato não suportado. Use uma URL ou base64.');
  }


  // 3. Monta caminho dentro do bucket 'midias'
  const nomeArquivo = `${subpasta}/${uuidv4()}.${extensao}`;
  const bucket = 'midias';

  // 4. Upload
  const { error } = await supabase.storage.from(bucket).upload(nomeArquivo, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('[WAt] ❌ Erro ao fazer upload para o Supabase:', error.message);
    throw error;
  }

  // 5. URL pública
  const urlPublica = `${supabase.storageUrl}/object/public/${bucket}/${nomeArquivo}`;
  return urlPublica;
}

module.exports = { uploadParaSupabase };

// (async () => {
//   try {
//     const urlNova = await uploadParaSupabase(
//       'https:/....
//     );
//     console.log('[WAt] 🔗 URL final no Supabase:', urlNova);
//   } catch (erro) {
//     console.error('[WAt] ❌ Erro no upload:', erro.message);
//   }
// })();