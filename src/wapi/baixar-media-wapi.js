const axios = require("axios");
const FormData = require("form-data");

const { transcreverAudioPorUrl } = require("../utils/converter-audio-url-para-texto");

async function baixarAudioETranscrever({ instanceId, mediaKey, directPath, type, mimetype, tokenWAPI }) {
  try {
    console.log("[WAt]🔄 Iniciando processo de download e transcrição...");
    console.log("[WAt]🔧 Parâmetros recebidos:", {
      instanceId,
      mediaKey,
      directPath,
      mimetype,
      type,
      tokenWAPI
    });

    // 1. Baixa o áudio descriptografado via POST
    const downloadUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${instanceId}`;
    console.log("[WAt]📥 Enviando requisição para WAPI:", downloadUrl);

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
    console.log("[WAt]✅ URL do áudio recebido da WAPI:", wapiResponse.data.fileLink);

    const transcricaoUrl = await transcreverAudioPorUrl(wapiResponse.data.fileLink);
    console.log("[WAt]📝 Transcrição obtida:", transcricaoUrl);

    return transcricaoUrl;

  } catch (err) {
    console.error("[WAt]❌ Erro durante o processo:");
    if (err.response) {
      console.error("[WAt]📉 Código:", err.response.status);
      console.error("[WAt]📄 Dados do erro:", err.response.data);
    } else {
      console.error("[WAt]📄 Erro genérico:", err.message);
    }
    throw err;
  }
}


async function baixarMedia({ instanceId, mediaKey, directPath, type, mimetype, tokenWAPI }) {
  try {
    console.log("[WAt]🔄 Iniciando processo de download de mídia...");
    console.log("[WAt]🔧 Parâmetros recebidos:", {
      instanceId,
      mediaKey,
      directPath,
      mimetype,
      type,
      tokenWAPI
    });

    // 1. Baixa o áudio descriptografado via POST
    const downloadUrl = `https://api.w-api.app/v1/message/download-media?instanceId=${instanceId}`;
    console.log("[WAt]📥 Enviando requisição para WAPI:", downloadUrl);

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
    console.log("[WAt]✅ URL da media recebido da WAPI:", wapiResponse.data.fileLink);

    return wapiResponse.data.fileLink;

  } catch (err) {
    console.error("[WAt]❌ Erro durante o processo:");
    if (err.response) {
      console.error("[WAt]📉 Código:", err.response.status);
      console.error("[WAt]📄 Dados do erro:", err.response.data);
    } else {
      console.error("[WAt]📄 Erro genérico:", err.message);
    }
    throw err;
  }
}

module.exports = { baixarAudioETranscrever, baixarMedia };
