const axios = require("axios");
const FormData = require("form-data");

/**
 * Faz o download de um áudio a partir de uma URL e envia para a API Whisper da OpenAI para transcrição.
 *
 * @param {string} urlAudio - URL do áudio a ser transcrito (MP3, WAV, etc.).
 * @returns {Promise<string>} - Texto transcrito do áudio.
 */
async function transcreverAudioPorUrl(urlAudio) {
  try {
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
      Authorization: `Bearer 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`,
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
