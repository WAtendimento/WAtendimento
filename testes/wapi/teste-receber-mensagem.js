const { processarMensagemJson } = require("../../src/wapi/receber-mensagem");
const jsonTeste = require("./teste-receber-mensagem.json");

// Exemplo de JSON para teste (mensagem de contato - Jéssica Medeiros)


// Função para testar a chamada
async function testarProcessamentoJson() {
  try {
    const resultado = await processarMensagemJson(jsonTeste);
    //  console.log("Resultado do processamento:", resultado);
  } catch (error) {
    console.error("Erro ao processar o JSON de teste:", error.message);
  }
}

// Executar o teste
// testarProcessamentoJson();
