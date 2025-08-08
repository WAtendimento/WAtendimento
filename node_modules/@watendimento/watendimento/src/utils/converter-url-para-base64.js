const axios = require("axios");

async function urlParaBase64(url) {
  const resposta = await axios.get(url, { responseType: "arraybuffer" });
  const tipo = resposta.headers["content-type"];
  const base64 = Buffer.from(resposta.data, "binary").toString("base64");
  return base64;
}

module.exports = { urlParaBase64 };

// Teste imagem
// urlParaBase64("https://img.freepik.com/vetores-gratis/fundo-de-festa-junina-com-bandeiras-e-baloes_23-2148883505.jpg")
//   .then(console.log)
//   .catch(console.error);

// Teste PDF
// urlParaBase64("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
//   .then(console.log)
//   .catch(console.error);

// Teste audio
// urlParaBase64("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3")
//   .then(console.log)
//   .catch(console.error);
