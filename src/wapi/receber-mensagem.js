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
const { resolverIdentificadorUsuario } = require('./resolver-identificador-usuario');
const { resolverTelefoneFaltante } = require('./resolver-telefone-faltante');
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


async function receberMensagem(json, credenciaisOpenAi, credenciaisSupabase, supabase, integraBot, bot) {

  console.log('[WAt] Iniciando processamento da mensagem recebida...');
  let dadosExtraidos = null;

  try {
    if (!json || typeof json !== 'object') throw new Error('Entrada inválida: JSON ausente ou mal formatado.');
    if (json.fromApi === true) return { ignorado: true, motivo: 'Mensagem enviada pela API.' };
    if (json.isGroup === true) return { ignorado: true, motivo: 'Mensagem de grupo.' };

    dadosExtraidos = extrairDados(json);
    console.log('[WAt] Mensagem recebida e extraída:', dadosExtraidos);

    // === IDENTIFICADOR (telefone ou LID) ===
    const { identificador, isTelefone } = resolverIdentificadorUsuario(dadosExtraidos);
    console.log('[WAt] Identificador extraído:', identificador, '| é telefone?', isTelefone);
    if (!identificador) return { ignorado: true, motivo: 'Não foi possível identificar o usuário.' };

    const credenciaisWAPI = await buscarCredenciaisWAPIdoChip(dadosExtraidos.connectedPhone, supabase, credenciaisSupabase);

    // === RECONHECER TELEFONE FALTANTE ===
    let reconhecidoAgora = false;
    if (dadosExtraidos.fromMe !== true && !isTelefone) {
      console.log('[WAt] Identificador não é telefone. Tentando reconhecimento...');
      const resultRecon = await resolverTelefoneFaltante(
        identificador,
        dadosExtraidos.pushName,
        dadosExtraidos.mensagem,
        credenciaisWAPI,
        credenciaisOpenAi,
        credenciaisSupabase,
        supabase
      );
      if (resultRecon === true) return { aguardando: true, motivo: 'Reconhecimento de telefone aguardando resposta.' };
      reconhecidoAgora = resultRecon?.reconhecidoAgora === true;
    }

    // === BUSCAR TELEFONE DO CONTATO NO SUPABASE ===
    console.log('[WAt] Buscando telefone do contato no Supabase...');
    console.log('[WAt] Identificador para busca:', identificador);
    console.log('[WAt] CHIP WAPI:', credenciaisWAPI.id_chip);
    const res = await buscarNoSupabase(
      supabase,
      credenciaisSupabase.table_data.table_contatos,
      { identificador: ['=', identificador], 
        id_chip: ['=', credenciaisWAPI.id_chip] },
      ['telefone', 'ultima_mensagem'],
      true
    );

    let telefoneContato = res?.[0]?.telefone || null;
    let ultimaMensagemSalva = res?.[0]?.ultima_mensagem || null;

    if (reconhecidoAgora && ultimaMensagemSalva) dadosExtraidos.mensagem = ultimaMensagemSalva;

    // === SE IDENTIFICADOR É TELEFONE, SALVAR AUTOMATICAMENTE ===
    if (!telefoneContato && isTelefone) {
      console.log('[WAt] Identificador é telefone. Salvando automaticamente no Supabase...');
      telefoneContato = identificador;
      await atualizarNoSupabase(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        { identificador: ['=', identificador], id_chip: ['=', credenciaisWAPI.id_chip] },
        { telefone: identificador, reconhecimento_em_andamento: false },
        false
      );
      console.log('[WAt] Telefone salvo automaticamente no Supabase.');
    }

    if (!telefoneContato) return { ignorado: true, motivo: 'Telefone do contato não encontrado.' };

    // === TELEFONE SERVE APENAS PARA O MODO TESTE / WHITELIST ===
    const autorizado = await ehTelefoneTeste(supabase, credenciaisSupabase, telefoneContato);
    console.log('[WAt] Telefone autorizado para atendimento?', autorizado);

    if (dadosExtraidos.fromMe !== true) {
      console.log(`[WAt] Número do contato (para modo teste): ${telefoneContato} | autorizado?`, autorizado);
      if (await ehModoTeste(supabase, credenciaisSupabase)) {
        if (!autorizado) return { ignorado: true, motivo: 'Modo teste ativo e número não autorizado.' };
      }
    }

    // === Interpretar mensagem ===
    console.log('[WAt] Interpretando mensagem...');
    let mensagemCorreta = await interpretarMensagem(dadosExtraidos, credenciaisWAPI, credenciaisOpenAi);
    if (!mensagemCorreta) return { ignorado: true, motivo: 'Mensagem sem conteúdo interpretável.' };

    // === ATIVAÇÃO/INATIVAÇÃO DE ATENDIMENTO (sempre usa IDENTIFICADOR) ===
    const resultadoChavesIA = await tratarComandosDeAtivacao(dadosExtraidos, mensagemCorreta, identificador, credenciaisSupabase);
    if (resultadoChavesIA.handled) return { tratado: true, acao: resultadoChavesIA.action || 'nenhuma' };

    console.log('[WAt] Mensagem interpretada:', mensagemCorreta);

    const mensagemFormatada = await mensagemDeEntrada(mensagemCorreta);

    // === CHIP ===
    const chip = await buscarChip(credenciaisSupabase.table_data.table_chips, supabase, dadosExtraidos.connectedPhone);
    if (!chip?.id_chip) return { ignorado: true, motivo: `Nenhum chip encontrado para ${dadosExtraidos.connectedPhone}.` };

    await tratarEnviosGlide(dadosExtraidos, chip);

    const ehAudio = dadosExtraidos.audioMessage ? '[Áudio] ' : '';

    // === SALVAR HISTÓRICO DE CHAT (sempre com IDENTIFICADOR) ===
    await atualizarJSONChat({
      id_chip: chip.id_chip,
      numeroContato: identificador,
      connectedPhone: dadosExtraidos.connectedPhone,
      fromMe: dadosExtraidos.fromMe,
      nomeContato: dadosExtraidos.pushName,
      mensagem: ehAudio + mensagemCorreta,
      tabelaContato: credenciaisSupabase.table_data.table_contatos,
      bot,
      supabaseClient: supabase,
    });

    // === CHAMAR integraBot (sempre com IDENTIFICADOR) ===
    const resultado = await integraBot(
      mensagemFormatada,
      dadosExtraidos.pushName,
      identificador,
      dadosExtraidos.connectedPhone,
      credenciaisOpenAi,
      credenciaisSupabase,
      supabase
    );

    if (resultado === null) return { ignorado: true, motivo: 'integraBot retornou null.' };
    return { sucesso: true, resultado };

  } catch (error) {
    console.error('[WAt]Erro ao processar o JSON:', error.message, dadosExtraidos?.connectedPhone);
    console.error('[WAt]Detalhes do erro:', error.stack);
    return { erro: true, mensagem: error.message, stack: error.stack };
  }
}


/**
 *  Funções auxiliares
 */
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

async function tratarComandosDeAtivacao(dadosExtraidos, mensagemCorreta, identificador, credenciaisSupabase) {
  if (!(dadosExtraidos?.fromMe === true && dadosExtraidos?.fromApi !== true)) {
    return { handled: false, action: null };
  }

  console.log('[WAt] fromMe=true & fromApi!=true para:', identificador);

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

  const bateInativacao = mensagemComChave(mensagemCorreta, chavesInativacao);
  const bateAtivacao = !bateInativacao && mensagemComChave(mensagemCorreta, chavesAtivacao);

  if (bateInativacao) {
    await atualizarNoSupabase(credenciaisSupabase.table_data.table_contatos, { identificador }, { inativo: true }, false);
    return { handled: true, action: 'inativado' };
  }

  if (bateAtivacao) {
    await atualizarNoSupabase(credenciaisSupabase.table_data.table_contatos, { identificador }, { inativo: false }, false);
    return { handled: true, action: 'ativado' };
  }

  return { handled: true, action: null };
}

module.exports = { receberMensagem };
