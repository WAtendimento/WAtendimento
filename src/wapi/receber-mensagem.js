/**
 * Funções utilitárias genéricas
 */
const { urlParaBase64 } = require('../utils/converter-url-para-base64');
const { mensagemDeEntrada } = require('../utils/formatador-mensagens');
const { extrairContactCardNumber } = require('../utils/extrair-numero-contato');
/**
 * Funções de processamento de imagem
 */
const consultaOpenAI = require('../waissistente/consulta-open-ai');
const { imagemParaTexto } = require('../vision/detector-texto');
/**
 * Funções de integração com a WAPI
 */
const { buscarCredenciaisWAPIdoChip } = require('./buscar-credenciais-wapi-do-chip');
const { baixarAudioETranscrever, baixarMedia } = require('./baixar-media-wapi');
/**
 * Funções de integração com o Supabase
 */
const atualizarNoSupabase = require('../supabase/atualizar-no-supabase');
const criarClienteSupabase = require('../supabase/criar-cliente-supabase');

/**
 * Processa e extrai dados de uma mensagem JSON recebida pela WAPI.
 * @param {Object} json - Objeto JSON enviado pelo webhook da WAPI.
 * @param {Object} contexto - Objeto de contexto com credenciais e função integra-bot de cada projeto.
 * @returns {Object|null} - Dados extraídos da mensagem ou null em caso de erro.
 */

async function processarMensagemJson(json, contexto = {}) {
  const {
    credenciaisOpenAi,
    credenciaisSupabase,
    integraBot, 
  } = contexto;

  let dadosExtraidos = null;
  const supabase = criarClienteSupabase(credenciaisSupabase);

  try {
    // Verificar se o JSON é válido
    if (!json || typeof json !== 'object') {
      console.error('Entrada inválida: JSON ausente ou mal formatado.');
      throw new Error('Entrada inválida: JSON ausente ou mal formatado.');
    }

    if (json.fromApi === true) {
      console.log('Mensagem enviada pela API. Nenhum processamento será feito.');
      return null;
    }

    // Verificar se a mensagem é de um grupo
    if (json.isGroup === true) {
      console.log('Mensagem de grupo detectada. Nenhum processamento será feito.');
      return null;
    }

    // Extrair dados relevantes do JSON
    dadosExtraidos = extrairDados(json);
    console.log('Mensagem recebida e extraída:', dadosExtraidos);
    
    // Buscando credenciais WAPI do chip
    const credenciaisWAPI = await buscarCredenciaisWAPIdoChip(dadosExtraidos.connectedPhones, supabase, credenciaisSupabase);
    console.log('CredenciaisWAPI:', credenciaisWAPI);

    // TO-DO Adicionar condição com parametro para habilitar/desabilitar numeros de teste

    // Interpretar a mensagem recebida
    console.log('Interpretando mensagem...');
    let mensagemCorreta = await interpretarMensagem(dadosExtraidos, credenciaisWAPI, credenciaisOpenAi);
    if (!mensagemCorreta) {
      console.log('Nenhuma mensagem interpretada. Encerrando processamento.');
      return null;
    }

    // Formatar a mensagem para envio
    const mensagemFormatada = await mensagemDeEntrada(mensagemCorreta);

    // Tratar comandos de ativação/inativação do contato
    await tratarComandosDeAtivacao({
      dadosExtraidos,
      mensagemCorreta,
      supabase,
      credenciaisSupabase,
    });

    console.log("Chamando integraBot com funções do cliente...");
    const resultado = await integraBot(
      mensagemFormatada,
      dadosExtraidos.pushName,
      dadosExtraidos.idRemoto,
      dadosExtraidos.connectedPhone,
      credenciaisOpenAi,
      credenciaisSupabase,
      supabase
    );
    console.log("Resultado da chamada ao integraBot:", resultado);

    return dadosExtraidos;
  } catch (error) {
    console.error('Erro ao processar o JSON:', error.message, dadosExtraidos.connectedPhone);
    console.error('Detalhes do erro:', error.stack);
    return null;
  }
}


/**
 *  Funções de apoio ao processarMensagemJson
 */

// Função para extrair dados relevantes do JSON
function extrairDados(json) {
  return {
    idRemoto: json.sender?.id || null,
    usuarioNumero: json.chat?.id || null,
    mensagem:
      json.msgContent?.conversation || json.msgContent?.extendedTextMessage?.text || null,
    canonicalUrl: json.msgContent?.canonicalUrl || null,
    textoLinkImagem: json.msgContent?.description || null,
    tituloLinkImagem: json.msgContent?.title || null,
    tipoMensagem: json.event || null,
    idMensagem: json.messageId || null,
    timestampMensagem: json.moment || null,
    fromMe: json.fromMe ?? null,
    fromApi: json.fromApi ?? null,
    pushName: json.sender?.pushName || null,
    contactCardName: json.msgContent?.contactMessage?.displayName || null,
    contactCardVcard: json.msgContent?.contactMessage?.vcard || null,
    contactCardNumber: extrairContactCardNumber(json.msgContent?.contactMessage?.vcard),
    audioMessage: json.msgContent?.audioMessage?.url || null,
    audioMimeType: json.msgContent?.audioMessage?.mimetype || null,
    audioDirectPath: json.msgContent?.audioMessage?.directPath || null,
    audioMediaKey: json.msgContent?.audioMessage?.mediaKey || null,
    audioDurationSegundos: json.msgContent?.audioMessage?.seconds || null,
    imageUrl: json.msgContent?.imageMessage?.url || null,
    imageMimeType: json.msgContent?.imageMessage?.mimetype || null,
    imageMediaKey: json.msgContent?.imageMessage?.mediaKey || null,
    imageDirectPath: json.msgContent?.imageMessage?.directPath || null,
    liveLocation: json.msgContent?.liveLocationMessage || null,
    connectedPhone: json.connectedPhone || null,
  };
}

// Função para interpretar a mensagem recebida
async function interpretarMensagem(dadosExtraidos, credenciaisWAPI, credenciaisOpenAi) {
  if (dadosExtraidos.audioMessage) {
    const transcricao = await baixarAudioETranscrever({
      instanceId: credenciaisWAPI.instance_id,
      mediaKey: dadosExtraidos.audioMediaKey,
      directPath: dadosExtraidos.audioDirectPath,
      type: "audio",
      mimetype: dadosExtraidos.audioMimeType,
      tokenWAPI: credenciaisWAPI.token,
    });
    return transcricao || null;
  }

  if (dadosExtraidos.contactCardName) {
    const contato = dadosExtraidos.contactCardNumber.replace(/^55/, "");
    return `${dadosExtraidos.contactCardName} ${contato}`;
  }

  if (dadosExtraidos.mensagem) return dadosExtraidos.mensagem;

  if (dadosExtraidos.imageUrl) {
    const urlImagem = await baixarMedia({
      instanceId: credenciaisWAPI.instance_id,
      mediaKey: dadosExtraidos.imageMediaKey,
      directPath: dadosExtraidos.imageDirectPath,
      type: "image",
      mimetype: dadosExtraidos.imageMimeType,
      tokenWAPI: credenciaisWAPI.token,
    });

    const base64 = await urlParaBase64(urlImagem);
    const buffer = Buffer.from(base64, "base64");
    const textoDetectado = await imagemParaTexto({ image: buffer });
    const textoUnico = textoDetectado.map(t => t.description).join("\n");

    if (textoUnico) {
      const resposta = await consultaOpenAI({
        data: {
          apiKey: credenciaisOpenAi.headers.apiKey,
          assistant_id: credenciaisOpenAi.headers.assistantId_vision,
          invoice_message: textoUnico,
        },
      });

      return resposta?.invoice?.respostaBot || null;
    }

    return null;
  }

  if (dadosExtraidos.liveLocation) {
    const { degreesLatitude, degreesLongitude } = dadosExtraidos.liveLocation;
    const data = new Date(dadosExtraidos.timestampMensagem * 1000).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    return `Latitude: ${degreesLatitude}, Longitude: ${degreesLongitude}, Data e Hora: ${data}`;
  }

  return null;
}

// Função para tratar comandos de ativação/inativação do contato
async function tratarComandosDeAtivacao({ dadosExtraidos, mensagemCorreta, supabase, credenciaisSupabase }) {

  // TO-DO Adicionar no banco ou em variaveis passadas como parametro
  // as palavras-chave que encerram o contato.

  if (dadosExtraidos.fromMe && !dadosExtraidos.fromApi && mensagemCorreta) {
    const telefone = dadosExtraidos.usuarioNumero?.toString();
    const tabela = credenciaisSupabase.table_data.table_contatos;
    const filtros = { telefone };

    if (mensagemCorreta.includes(":)") || mensagemCorreta.includes("(:")) {
      await atualizarNoSupabase(supabase, tabela, filtros, { inativo: true }, false);
    } else if (mensagemCorreta.includes("Obrigada! Qualquer coisa, estamos a disposição")) {
      await atualizarNoSupabase(supabase, tabela, filtros, { inativo: false }, false);
    }
  }
}

module.exports = { processarMensagemJson };
