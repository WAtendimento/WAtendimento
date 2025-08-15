

module.exports = {
  // WAPI - WhatsApp Web API
  receberMensagem: require("./wapi/receber-mensagem").receberMensagem,
  processarMensagensEmMassa: require("./wapi/processa-contatos-para-enviar-msgs").processarMensagensEmMassa,
  buscarCredenciaisWAPIdoChip: require("./wapi/buscar-credenciais-wapi-do-chip").buscarCredenciaisWAPIdoChip,
  enviarMensagemAPI: require("./wapi/enviar-mensagem-api").enviarMensagemAPI,
  verificaEEnviaMensagem: require("./wapi/verificar-e-enviar-mensagem").verificaEEnviaMensagem,

  // Utilitários - Utils
  gerarData: require("./utils/gerar-data").gerarData,
  delay: require("./utils/delay").delay,

  // Supabase - Supabase
  insertOuUpsert: require("./supabase/inserir-ou-atualizar-no-supabase").insertOuUpsert,
  buscarNoSupabase: require("./supabase/buscar-no-supabase").buscarNoSupabase,
  
  // OpenAI - OpenAI
  consultaOpenAI: require("./waissistente/consulta-open-ai").consultaOpenAI,

  // Vision
  imagemParaTexto: require("./vision/detector-texto").imagemParaTexto,
};