const { gerarMensagensParaEnvio } = require('../../src/wapi/processa-contatos-para-enviar-msgs');

// Exemplo de lista de contatos
const listaDeContatos = [
  { telefone: '81987654321', nome_cliente: 'Pedro Henrique', id_cliente: 101 },
  { telefone: '81991234567', nome_cliente: 'Mariana Alves', id_cliente: 102 },
  { telefone: '81996543210', nome_cliente: '', id_cliente: 103 },
];

// Mensagem base que será personalizada
const mensagemBase = 'bom dia hoje!!';

// Chamada da função para gerar as mensagens
const mensagensGeradas = gerarMensagensParaEnvio(listaDeContatos, mensagemBase);

// Exibir as mensagens geradas no console
console.log(mensagensGeradas);
