

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
  criaLogger: require("./utils/logger").criaLogger,
  mensagemDeSaida: require("./utils/formatador-mensagens").mensagemDeSaida,
  gerarTimestampBrasil: require("./utils/gerar-timestamp-brasil").gerarTimestampBrasil,
  existeDiferencaDeDias: require("./utils/existe-diferenca-dias").existeDiferencaDeDias,
  formatarTelefone: require("./utils/formatar-telefone").formatarTelefone,
  removerNoveDoTelefone: require("./utils/formatar-telefone").removerNoveDoTelefone,
  gerarVariacoesDeTelefone: require("./utils/gerar-variacoes-telefone").gerarVariacoesDeTelefone,
  
  // Supabase - Supabase
  insertOuUpsert: require("./supabase/inserir-ou-atualizar-no-supabase").insertOuUpsert,
  buscarNoSupabase: require("./supabase/buscar-no-supabase").buscarNoSupabase,
  atualizarNoSupabase: require("./supabase/atualizar-no-supabase").atualizarNoSupabase,
  
  // OpenAI - OpenAI
  consultaOpenAI: require("./waissistente/consulta-open-ai").consultaOpenAI,

  // Vision
  imagemParaTexto: require("./vision/detector-texto").imagemParaTexto,
};