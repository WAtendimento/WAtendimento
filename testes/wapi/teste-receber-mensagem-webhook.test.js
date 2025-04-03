const { processarMensagemJson } = require("../../src/wapi/receber-mensagem");

// Exemplo de JSON para teste (mensagem de contato - Jéssica Medeiros)
const jsonTesteContatoJessica = {
  event: "messageReceived",
  connectionKey: "w-api_oiWXdxKbda",
  connectedPhone: "558192149104",
  isGroup: false,
  messageId: "3C4308B1AB7051CB0ACB80088ED4FDED",
  fromMe: false,
  recipient: {
    id: "558196948615",
    profilePicture:
      "https://pps.whatsapp.net/v/t61.24694-24/409806326_341259215335847_3567558632245569680_n.jpg?ccb=11-4&oh=01_Q5AaINKLSqJO-D3CEblkpl_EkGgPfonwAKVmOPGIhdh3qogI&oe=6775698B&_nc_sid=5e03e0&_nc_cat=108",
  },
  sender: {
    id: "558196948615",
    profilePicture:
      "https://pps.whatsapp.net/v/t61.24694-24/409806326_341259215335847_3567558632245569680_n.jpg?ccb=11-4&oh=01_Q5AaINKLSqJO-D3CEblkpl_EkGgPfonwAKVmOPGIhdh3qogI&oe=6775698B&_nc_sid=5e03e0&_nc_cat=108",
    pushName: "Livia Furtado",
    device: "android",
  },
  moment: "1734891422",
  messageText: {
    text: "Oi",
    matchedText: null,
    canonicalUrl: null,
    description: null,
    title: null,
    previewType: null,
    jpegThumbnail: null,
  },
};

// Função para testar a chamada
async function testarProcessamentoJson() {
  try {
    const resultado = await processarMensagemJson(jsonTesteContatoJessica);
    //  console.log("Resultado do processamento:", resultado);
  } catch (error) {
    console.error("Erro ao processar o JSON de teste:", error.message);
  }
}

// Executar o teste
testarProcessamentoJson();
