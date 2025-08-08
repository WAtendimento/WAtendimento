module.exports = {
  processarMensagemJson: require("./wapi/receber-mensagem").processarMensagemJson,
  pesquisarContatosEGerarMensagens: require("./wapi/processa-contatos-para-enviar-msgs").pesquisarContatosEGerarMensagens,
};