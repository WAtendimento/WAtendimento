/**
 * Funções utilitárias genéricas
 */
const { urlParaBase64 } = require('../utils/converter-url-para-base64');
const { mensagemDeEntrada } = require('../utils/formatador-mensagens');
const { extrairContactCardNumber } = require('../utils/extrair-numero-contato');
const { buscarChip } = require('../utils/buscar-chip');
const { ehModoTeste, ehTelefoneTeste, mensagemComChave } = require('./resolver-modo-teste');
/**
 * Funções de processamento de imagem
 */
const { consultaOpenAI } = require('../waissistente/consulta-open-ai');
const { imagemParaTexto } = require('../vision/detector-texto');
/**
 * Funções de integração com a WAPI
 */
const { buscarCredenciaisWAPIdoChip } = require('./buscar-credenciais-wapi-do-chip');
const { baixarAudioETranscrever, baixarMedia } = require('./baixar-media-wapi');
//const { resolverNumeroUsuario } = require('../utils/resolver-numero-usuario');
const { resolverIdentificadorUsuario } = require('./resolver-identificador-usuario');
/**
 * Funções de integração com o Supabase
 */
const { atualizarNoSupabase } = require('../supabase/atualizar-no-supabase');
const { buscarNoSupabase } = require('../supabase/buscar-no-supabase');

/**
 * Funções de chat
 */
const { tratarEnviosGlide } = require('../chat/tratar-envios-glide');
const { atualizarJSONChat } = require('../chat/atualizar-json-chat');

/**
 * Processa e extrai dados de uma mensagem JSON recebida pela WAPI.
 * @param {Object} json - Objeto JSON enviado pelo webhook da WAPI.
 * @param {Object} contexto - Objeto de contexto com credenciais e função integra-bot de cada projeto.
 * @returns {Object|null} - Dados extraídos da mensagem ou null em caso de erro.
 */

async function receberMensagem(json, credenciaisOpenAi, credenciaisSupabase, supabase, integraBot, bot) {

  console.log('[WAt] Iniciando processamento da mensagem recebida...');
  // console.log('[WAt]JSON recebido:', JSON.stringify(json, null, 2));
  // console.log('[WAt]Credenciais OpenAI:', JSON.stringify(credenciaisOpenAi, null, 2));
  // console.log('[WAt]Credenciais Supabase:', JSON.stringify(credenciaisSupabase, null, 2));
 
  let dadosExtraidos = null;

  try {
    // Verificar se o JSON é válido
    if (!json || typeof json !== 'object') {
      console.error('[WAt] Entrada inválida: JSON ausente ou mal formatado.');
      throw new Error('Entrada inválida: JSON ausente ou mal formatado.');
    }

    if (json.fromApi === true) {
      console.log('[WAt] Mensagem enviada pela API. Nenhum processamento será feito.');
      return { ignorado: true, motivo: 'Mensagem enviada pela própria API.' };
    }

    // Verificar se a mensagem é de um grupo
    if (json.isGroup === true) {
      console.log('[WAt] Mensagem de grupo detectada. Nenhum processamento será feito.');
      return { ignorado: true, motivo: 'Mensagem proveniente de grupo.' };
    }

    // Extrair dados relevantes do JSON
    dadosExtraidos = extrairDados(json);
    console.log('[WAt] Mensagem recebida e extraída:', dadosExtraidos);
    
    // Buscando credenciais WAPI do chip
    const credenciaisWAPI = await buscarCredenciaisWAPIdoChip(dadosExtraidos.connectedPhone, supabase, credenciaisSupabase);
    // console.log('[WAt]CredenciaisWAPI:', credenciaisWAPI);

    // OBS: A variável usuarioNumero representa o "identificador" do usuário.
    // Ela pode ser um telefone ou um LID, dependendo do que estiver disponível.
    const usuarioNumero = resolverIdentificadorUsuario(dadosExtraidos);

    // Verificar se o sistema está em modo de teste
    const autorizado = await ehTelefoneTeste(supabase, credenciaisSupabase, usuarioNumero);

    if(dadosExtraidos.fromMe !== true) {
      console.log(`[WAt] Número do contato: ${usuarioNumero} | autorizado?`, autorizado);

      if (await ehModoTeste(supabase, credenciaisSupabase)) {
        console.log('[WAt] Modo TESTE ativo no sistema.');

        if (autorizado) {
          console.log('[WAt] Número autorizado. Prosseguindo com integrações/efeitos.');
        } else {
          console.log('[WAt] Número NÃO autorizado. Ignorando integrações/efeitos.');
          return { ignorado: true, motivo: '[WAt] Número não autorizado.' };
        }

      } else {
        console.log('[WAt] Modo TESTE inativo no sistema, Prosseguindo com integrações/efeitos.');
      }
    } else {
      console.log(`[WAt] FromMe=true, pulando verificação de autorização.`);
    }

    // Interpretar a mensagem recebida
    console.log('[WAt] Interpretando mensagem...');
    let mensagemCorreta = await interpretarMensagem(dadosExtraidos, credenciaisWAPI, credenciaisOpenAi);
    if (!mensagemCorreta) {
      console.log('[WAt] Nenhuma mensagem interpretada. Encerrando processamento.');
      return { ignorado: true, motivo: 'Mensagem sem conteúdo interpretável.' };
    }

    // TRATAMENTO DE MENSAGENS DE ATIVAÇÃO/INATIVAÇÃO DA IA
    // console.log('>>> Verificando se a mensagem é de encerramento de contato...');
    const resultadoChavesIA = await tratarComandosDeAtivacao(dadosExtraidos, mensagemCorreta, usuarioNumero, credenciaisSupabase);

    if (resultadoChavesIA.handled) {
      return { tratado: true, acao: resultadoChavesIA.action || 'nenhuma', motivo: 'Mensagem de ativação/inativação processada.' };
    }

    console.log('[WAt] Mensagem interpretada:', mensagemCorreta);

    // Formatar a mensagem para envio
    const mensagemFormatada = await mensagemDeEntrada(mensagemCorreta);

    // Buscar chip
    const chip = await buscarChip(
      credenciaisSupabase.table_data.table_chips,
      supabase,
      dadosExtraidos.connectedPhone);
    
    if (!chip?.id_chip) {
      console.warn('[WAt] Nenhum chip encontrado para', dadosExtraidos.connectedPhone);
      return { ignorado: true, motivo: `Nenhum chip encontrado para ${dadosExtraidos.connectedPhone}.` };
    }

    console.log('[WAt]Chip encontrado:', chip);
    // Tratar mensagens via Glide
    await tratarEnviosGlide(dadosExtraidos, chip);

    // Verificar se a mensagem é um áudio
    const ehAudio = dadosExtraidos.audioMessage ? '[Áudio] ' : '';
    
    // Atualizar JSON do chat
    console.log('[WAt]Atualizando JSON do chat...');
    await atualizarJSONChat({
      id_chip: chip.id_chip,
      numeroContato: usuarioNumero,
      connectedPhone: dadosExtraidos.connectedPhone,
      fromMe: dadosExtraidos.fromMe,
      nomeContato: dadosExtraidos.pushName,
      mensagem: ehAudio + mensagemCorreta,
      tabelaContato: credenciaisSupabase.table_data.table_contatos,
      bot: bot,
      supabaseClient: supabase,
    });
    
    // Enviar mensagem para o integraBot
    console.log("[WAt]Chamando integraBot com funções do cliente...");
    const resultado = await integraBot(
      mensagemFormatada,
      dadosExtraidos.pushName,
      usuarioNumero,
      dadosExtraidos.connectedPhone,
      credenciaisOpenAi,
      credenciaisSupabase,
      supabase
    );
      
    if (resultado === null) {
      console.log("[WAt] integraBot não retornou resposta (pode ser mensagem sem ação).");
      return { ignorado: true, motivo: 'integraBot retornou null (sem resposta ou ação).' };
    } else {
      console.log("[WAt]Resultado da chamada ao integraBot:", resultado);
      return { sucesso: true, resultado };
    }
  } catch (error) {
    const conn = dadosExtraidos?.connectedPhone || 'desconhecido';
    console.error('[WAt]Erro ao processar o JSON:', error.message, dadosExtraidos.connectedPhone);
    console.error('[WAt]Detalhes do erro:', error.stack);
    return { erro: true, mensagem: error.message, stack: error.stack };

  }
}


/**
 *  Funções de apoio ao receberMensagem
 */

// Função para extrair dados relevantes do JSON
function extrairDados(json) {
  
  return {
    chatId: json.chat?.id || null,
    senderLid: json.sender?.senderLid || null,
    senderId: json.sender?.senderId || null,
    senderRawId: json.sender?.id || null,
    mensagem: json.msgContent?.conversation || json.msgContent?.extendedTextMessage?.text || null,
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

async function tratarComandosDeAtivacao(dadosExtraidos, mensagemCorreta, usuarioNumero, credenciaisSupabase) {
  if (!(dadosExtraidos?.fromMe === true && dadosExtraidos?.fromApi !== true)) {
    return { handled: false, action: null };
  }

  console.log('[WAt] fromMe=true & fromApi!=true para:', usuarioNumero);
  console.log('[WAt] Buscando chaves de inativação/ativação no Supabase...');

  const buscarChaves = async (tipo_config) => {
    const registros = await buscarNoSupabase(
      credenciaisSupabase.table_data.table_configs,
      { tipo_config: ['=', tipo_config] },
      ['valor_config']
    );
    return (registros || [])
      .map((r) => String(r.valor_config || '').trim())
      .filter(Boolean);
  };

  const [chavesInativacao, chavesAtivacao] = await Promise.all([
    buscarChaves('chave_inativacao_ia'),
    buscarChaves('chave_ativacao_ia'),
  ]);

  // console.log('[WAt] inativação: qtd=', chavesInativacao.length, 'ex=', chavesInativacao.slice(0, 3));
  // console.log('[WAt] ativação  : qtd=', chavesAtivacao.length, 'ex=', chavesAtivacao.slice(0, 3));
  // console.log('[WAt] mensagem   :', (mensagemCorreta || '').slice(0, 120));

  const tabelaContatos = credenciaisSupabase.table_data.table_contatos;

  const bateInativacao = mensagemComChave(mensagemCorreta, chavesInativacao);
  const bateAtivacao = !bateInativacao && mensagemComChave(mensagemCorreta, chavesAtivacao);

  console.log('[WAt] match -> inativacao?', bateInativacao, '| ativacao?', bateAtivacao);

  if (bateInativacao) {
    console.log('[WAt] Mensagem de assunção recebida. Inativando no Supabase...');
    await atualizarNoSupabase(tabelaContatos, { identificador: usuarioNumero }, { inativo: true }, false);
    return { handled: true, action: 'inativado' };
  }

  if (bateAtivacao) {
    console.log('[WAt] Mensagem de reativação recebida. Ativando no Supabase...');
    await atualizarNoSupabase(tabelaContatos, { identificador: usuarioNumero }, { inativo: false }, false);
    return { handled: true, action: 'ativado' };
  }

  console.log('[WAt] mensagem é fromMe, mas sem palavras-chave de (des)ativação.');
  return { handled: true, action: null };
}

module.exports = { receberMensagem };
