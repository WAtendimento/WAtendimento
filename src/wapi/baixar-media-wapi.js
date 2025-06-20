const axios = require("axios");
const FormData = require("form-data");

const { transcreverAudioPorUrl } = require("../utils/converter-audio-url-para-texto");

async function baixarAudioETranscrever({ instanceId, mediaKey, directPath, type, mimetype, tokenWAPI }) {
  try {
    console.log("🔄 Iniciando processo de download e transcrição...");
    console.log("🔧 Parâmetros recebidos:", {
      instanceId,
      mediaKey,
      directPath,
      mimetype,
      type,
      tokenWAPI
    });

    // 1. Baixa o áudio descriptografado via POST
    const downloadUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${instanceId}`;
    console.log("📥 Enviando requisição para WAPI:", downloadUrl);

    const wapiResponse = await axios.post(
      downloadUrl,
      {
        mediaKey,
        directPath,
        mimetype,
        type,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenWAPI}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log("✅ URL do áudio recebido da WAPI:", wapiResponse.data.fileLink);

    const transcricaoUrl = await transcreverAudioPorUrl(wapiResponse.data.fileLink);
    console.log("📝 Transcrição obtida:", transcricaoUrl);

    return transcricaoUrl;

  } catch (err) {
    console.error("❌ Erro durante o processo:");
    if (err.response) {
      console.error("📉 Código:", err.response.status);
      console.error("📄 Dados do erro:", err.response.data);
    } else {
      console.error("📄 Erro genérico:", err.message);
    }
    throw err;
  }
}


async function baixarMedia({ instanceId, mediaKey, directPath, type, mimetype, tokenWAPI }) {
  try {
    console.log("🔄 Iniciando processo de download de mídia...");
    console.log("🔧 Parâmetros recebidos:", {
      instanceId,
      mediaKey,
      directPath,
      mimetype,
      type,
      tokenWAPI
    });

    // 1. Baixa o áudio descriptografado via POST
    const downloadUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${instanceId}`;
    console.log("📥 Enviando requisição para WAPI:", downloadUrl);

    const wapiResponse = await axios.post(
      downloadUrl,
      {
        mediaKey,
        directPath,
        mimetype,
        type,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenWAPI}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log("✅ URL da media recebido da WAPI:", wapiResponse.data.fileLink);

    return wapiResponse.data.fileLink;

  } catch (err) {
    console.error("❌ Erro durante o processo:");
    if (err.response) {
      console.error("📉 Código:", err.response.status);
      console.error("📄 Dados do erro:", err.response.data);
    } else {
      console.error("📄 Erro genérico:", err.message);
    }
    throw err;
  }
}

module.exports = { baixarAudioETranscrever, baixarMedia };
