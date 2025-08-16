// Teste para a função de transcrição de áudio
const { baixarAudioETranscrever } = require("../../src/utils/baixar-audio-e-transcrever"); // ajuste o caminho conforme necessário

async function testarTranscricao() {
  const parametros = {
    instanceId: "LQXS31-KJJ2WW-4G61UR",
    mediaKey: "0rZOd1ur63bDeuaepTJVwKNkmVIoC3xCjXS3BfJwSvM=",
    directPath: "/v/t62.7117-24/509500646_741005192420285_1904358862006313038_n.enc?ccb=11-4&oh=01_Q5Aa1wGs5HL7WG4DgAkZidDfGFmMSj-fdtBIg5W7O0hfj3oFFg&oe=687AF0FD&_nc_sid=5e03e0",
    mimetype: "audio/ogg; codecs=opus",
    type: "audio",
    tokenWAPI: "t1DMDiLA3gsXee7Lx69VKNN8AYX5VuFd5"
  };

  try {
    const resultado = await baixarAudioETranscrever(parametros);
    console.log("[WAt]📝 Texto transcrito:", resultado);
  } catch (erro) {
    console.error("[WAt]❌ Erro no teste de transcrição:", erro);
  }
}

// testarTranscricao();

