const { pesquisarContatosEGerarMensagens } = require('../../src/wapi/processa-contatos-para-enviar-msgs');

async function testarEnvioMensagens() {
  console.log('##TESTE REAL: Iniciando teste de envio de mensagens...');

  // Mensagem base que será enviada para os contatos
  const mensagemBase = 'você acaba de ser cadastrado no MaxPontos! Bem-vindo! Qualquer coisa, é só falar!';

  try {
    // Chamando a função real, que buscará contatos e enviará as mensagens
    const resultado = await pesquisarContatosEGerarMensagens(mensagemBase, 1); // Enviar no máximo 10 mensagens

    // Exibir resultado final do teste
    console.log('##TESTE REAL: Resultado final:', resultado);
  } catch (erro) {
    console.error('##TESTE REAL: Erro durante o teste:', erro);
  }
}

// Executar o teste
testarEnvioMensagens();
