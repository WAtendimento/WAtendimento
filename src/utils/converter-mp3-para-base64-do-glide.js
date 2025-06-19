const axios = require('axios');
const streamifier = require('streamifier');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converte um áudio da URL (como do Glide) para um MP3 válido em base64.
 *
 * @param {string} urlOriginal - URL do áudio original.
 * @returns {Promise<string>} - Retorna o conteúdo base64 com header `data:audio/mpeg;base64,...`
 */
async function converterParaMp3Base64(urlOriginal) {
  const response = await axios.get(urlOriginal, { responseType: 'arraybuffer' });
  const inputBuffer = Buffer.from(response.data);

  return new Promise((resolve, reject) => {
    const inputStream = streamifier.createReadStream(inputBuffer);
    const chunks = [];

    const ffmpegProcess = ffmpeg(inputStream)
      .format('mp3')
      .audioCodec('libmp3lame')
      .on('error', reject)
      .on('end', () => {
        const finalBuffer = Buffer.concat(chunks);
        const base64 = finalBuffer.toString('base64');
        resolve(`data:audio/mpeg;base64,${base64}`);
      })
      .pipe();

    ffmpegProcess.on('data', (chunk) => chunks.push(chunk));
  });
}

module.exports = { converterParaMp3Base64 };