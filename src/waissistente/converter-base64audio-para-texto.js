/**
 * Converte um áudio em base64 para texto utilizando a API de transcrição de áudio da OpenAI (modelo "whisper-1").
 *
 * Esta função recebe um áudio codificado em base64, o converte em um buffer, e envia esse arquivo para a API
 * da OpenAI para transcrição. A função então retorna o texto transcrito a partir do áudio.
 *
 * @param {string} base64Audio - O áudio codificado em base64 que será enviado para a API de transcrição.
 *                               O áudio pode ser de vários formatos suportados pela API, como .mp3, .wav, etc.
 *
 * @returns {Promise<Object>} Retorna uma Promise que resolve em um objeto com a resposta da API de transcrição.
 *
 * Propriedades:
 * - `text` (string): O texto transcrito do áudio fornecido.
 * - `status` (string): Status da requisição, geralmente "success" se a transcrição foi realizada com sucesso.
 * - `model` (string): O modelo utilizado para a transcrição, neste caso será sempre "whisper-1".
 * - `language` (string): O idioma detectado ou especificado para a transcrição.
 * - `duration` (number): A duração do áudio processado em segundos.
 * - `file` (string): Link para o arquivo processado, se disponível.
 *
 * Exemplo de uso:
 * const base64Audio = "base64stringaqui";
 * converterAudioBase64ParaTexto(base64Audio)
 *   .then(response => {
 *     console.log("Texto transcrito:", response.text);
 *   })
 *   .catch(error => {
 *     console.error("Erro na transcrição:", error);
 *   });
 *
 * @throws {Error} Lança um erro caso haja algum problema com a requisição ou processamento do áudio.
 *
 * A função utiliza:
 * - `axios` para fazer a requisição HTTP à API da OpenAI.
 * - `form-data` para montar o corpo da requisição com o arquivo de áudio.
 */

const axios = require("axios");
const FormData = require("form-data");

async function converterAudioBase64ParaTexto(base64Audio) {
  try {
    const buffer = Buffer.from(base64Audio, "base64");

    const form = new FormData();
    form.append("file", buffer, "audio.mp3"); // Certifique-se de que o nome do arquivo está correto
    form.append("model", "whisper-1");
    form.append("response_format", "text");
    form.append("language", "pt"); // Definindo o idioma como português

    // Log para verificar o conteúdo do FormData
    console.log("Headers FormData:", form.getHeaders());

    // Defina os cabeçalhos necessários para a requisição
    const headers = {
      Authorization: `Bearer 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`, // Substitua pelo seu token de autenticação da OpenAI
      "Content-Type": `multipart/form-data; boundary=${form._boundary}`, // O Axios deve definir automaticamente, mas pode ser necessário aqui
      ...form.getHeaders(),
    };

    // Envia a requisição POST para a API da OpenAI
    const response = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions", // URL para transcrição de áudio
      form,
      { headers }
    );

    // validando response
    console.log("Transcrição", response.data);
    return response.data;
  } catch (error) {
    // Captura e loga erros detalhados
    if (error.response) {
      console.error("Erro ao enviar áudio para a OpenAI:", error.response.data);
    } else {
      console.error("Erro na requisição:", error.message);
    }
    throw error; // Repassa o erro
  }
}

module.exports = { converterAudioBase64ParaTexto };
