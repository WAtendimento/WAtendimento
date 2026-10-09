const axios = require("axios");
const FormData = require("form-data");

/**
 * Faz o download de um áudio a partir de uma URL e envia para a API Whisper da OpenAI para transcrição.
 *
 * @param {string} urlAudio - URL do áudio a ser transcrito (MP3, WAV, etc.).
 * @returns {Promise<string>} - Texto transcrito do áudio.
 */
async function transcreverAudioPorUrl(urlAudio, apiKey) {
  try {
    if (!apiKey) throw new Error('Chave da OpenAI não informada para a transcrição.');
    const respostaAudio = await axios.get(urlAudio, {
      responseType: "arraybuffer",
    });

    const audioBuffer = Buffer.from(respostaAudio.data);

    const form = new FormData();
    form.append("file", audioBuffer, "audio.mp3");
    form.append("model", "whisper-1");
    form.append("response_format", "text");
    form.append("language", "pt");

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": `multipart/form-data; boundary=${form._boundary}`,
      ...form.getHeaders(),
    };

    const resposta = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      { headers }
    );

    return resposta.data;
  } catch (error) {
    if (error.response?.data) {
      console.error("[WAt]Erro na API:", error.response.data);
    } else {
      console.error("[WAt]Erro geral:", error.message);
    }
    throw error;
  }
}

module.exports = {
  transcreverAudioPorUrl,
};
