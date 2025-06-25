const { mensagemDeEntrada } = require('../utils/formatador-mensagens');
const criaLogger = require('../utils/logger');
const atualizarNoSupabase = require('../supabase/atualizar-no-supabase');
const { imagemParaTexto } = require('../vision/detector-texto');
const consultaOpenAI = require('../waissistente/consulta-open-ai');
const credenciaisSupabase = require('../../credenciais/supabase');
const { urlParaBase64 } = require('../utils/converter-url-para-base64');
const { buscarCredenciaisWAPIdoChip } = require('../wapi/buscar-credenciais-wapi-do-chip');
const { baixarAudioETranscrever, baixarMedia } = require('./baixar-media-wapi');

/**
 * Processa e extrai dados de uma mensagem JSON recebida pela WAPI.
 * @param {Object} json - Objeto JSON enviado pelo webhook da WAPI.
 * @returns {Object|null} - Dados extraídos da mensagem ou null em caso de erro.
 */

async function processarMensagemJson(json, credenciaisOpenAi, integraBot) {
  try {
    console.log('Mensagem Recebida... Iniciando processamento. Aguarde...');
    console.log(
      "+++ Iniciando processarMensagemJson com JSON completo:",
      JSON.stringify(json, null, 2)
    );

    // Verificar se o JSON é válido
    if (!json || typeof json !== 'object') {
      console.error('Entrada inválida: JSON ausente ou mal formatado.');
      throw new Error('Entrada inválida: JSON ausente ou mal formatado.');
    }

    // Verificar se a mensagem é de um grupo
    if (json.isGroup === true) {
      console.log('Mensagem de grupo detectada. Nenhum processamento será feito.');
      return null;
    }

    // Extrair dados relevantes do JSON
    const dadosExtraidos = {

      // Informações do remetente e do chat
      idRemoto: json.sender?.id || null,
      usuarioNumero: json.chat?.id || null,
      mensagem:
        json.msgContent?.conversation ||
        json.msgContent?.extendedTextMessage?.text || // <-- NOVO
        null,
      canonicalUrl: json.msgContent?.canonicalUrl || null,
      textoLinkImagem: json.msgContent?.description || null,
      tituloLinkImagem: json.msgContent?.title || null,
      tipoMensagem: json.event || null,
      idMensagem: json.messageId || null,
      timestampMensagem: json.moment || null,
      fromMe: json.fromMe ?? null,
      fromApi: json.fromApi ?? null,
      pushName: json.sender?.pushName || null,

      // Cartão de contato
      contactCardName: json.msgContent?.contactMessage?.displayName || null,
      contactCardVcard: json.msgContent?.contactMessage?.vcard || null,
      contactCardNumber: extrairContactCardNumber(json.msgContent?.contactMessage?.vcard),// Usar regex pra pegar de dentro do vCard.

      // Audio – mudou de base64 para URL codificado
      audioMessage: json.msgContent?.audioMessage?.url || null,
      audioMimeType: json.msgContent?.audioMessage?.mimetype || null,
      audioDirectPath: json.msgContent?.audioMessage?.directPath || null,
      audioMediaKey: json.msgContent?.audioMessage?.mediaKey || null,
      audioDurationSegundos: json.msgContent?.audioMessage?.seconds || null,

      // Imagem – mudou de base64 para URL codificada
      imageUrl: json.msgContent?.imageMessage?.url || null,
      imageMimeType: json.msgContent?.imageMessage?.mimetype || null,
      imageMediaKey: json.msgContent?.imageMessage?.mediaKey || null,
      imageDirectPath: json.msgContent?.imageMessage?.directPath || null,

      // Localização em tempo real
      liveLocation: json.msgContent?.liveLocationMessage || null,

      // Número do telefone conectado
      connectedPhone: json.connectedPhone || null,

    };

    
    const telefoneContato = dadosExtraidos.idRemoto.split('@')[0];
    const logger = criaLogger(telefoneContato);
    logger.add(`+++ ${dadosExtraidos.usuarioNumero} Dados Extraídos: ${JSON.stringify(dadosExtraidos, null, 2)}`);
    
    // Buscando credenciais WAPI do chip
    const credenciaisWAPI = await buscarCredenciaisWAPIdoChip(dadosExtraidos.connectedPhone);

     //  TO-DO Adicionar condição com parametro para habilitar/desabilitar numeros de teste

    let mensagemCorreta = '';

    // Verificar se a mensagem é de áudio, imagem, localização em tempo real, contato ou texto
    if (dadosExtraidos.audioMessage) {
      console.log('** MENSAGEM DE ÁUDIO DETECTADA **');
      try {
        // Transcrever áudio usando a URL
        const transcricao = await baixarAudioETranscrever( {
          instanceId: credenciaisWAPI.instance_id, 
          mediaKey: dadosExtraidos.audioMediaKey, 
          directPath: dadosExtraidos.audioDirectPath, 
          type: "audio",
          mimetype: dadosExtraidos.audioMimeType, 
          tokenWAPI: credenciaisWAPI.token }
        );

        if (transcricao) {
          mensagemCorreta = transcricao; // Use o texto transcrito
        } else {
          console.log('>>> Transcrição retornou vazia ou inválida.');
          mensagemCorreta = null; // Removido fallback de "Transcrição indisponível"
        }

        console.log('>>> Texto transcrito do áudio:', mensagemCorreta);
      } catch (error) {
        console.error('Erro ao transcrever o áudio:', error.message);
        mensagemCorreta = null;
      }

    } else if (dadosExtraidos.contactCardName) {
      console.log('** MENSAGEM DE CONTATO DETECTADA **');
      // Remove o código 55 do número
      const contactNumber = dadosExtraidos.contactCardNumber.replace(/^55/, '');
      mensagemCorreta = `${dadosExtraidos.contactCardName} ${contactNumber}`;

      console.log('>>> Contato extraído:', mensagemCorreta);

    } else if (dadosExtraidos.mensagem) {
      console.log('** MENSAGEM DE TEXTO DETECTADA **');
      mensagemCorreta = dadosExtraidos.mensagem;

    } else if (dadosExtraidos.imageUrl) {
      console.log('** MENSAGEM COM IMAGEM DETECTADA **');

      try {

        // Receber URL da imagem e baixar a media para transcrever
        const urlImagem = await baixarMedia({
          instanceId: credenciaisWAPI.instance_id,
          mediaKey: dadosExtraidos.imageMediaKey,
          directPath: dadosExtraidos.imageDirectPath,
          type: 'image',
          mimetype: dadosExtraidos.imageMimeType,
          tokenWAPI: credenciaisWAPI.token,
        });

        // console.log('+++ URL da imagem recebida:', urlImagem);
        // Converter URL da imagem para base64
        const base64 = await urlParaBase64(urlImagem);

        // console.log('+++ Base64 da imagem recebida:', base64);
        // Converter base64 para buffer
        const buffer = Buffer.from(base64, 'base64');

        // Convertendo imagem pra texto
        const textoDetectado = await imagemParaTexto({ image: buffer });

        // Colocando todo texto numa unica string
        const textoUnico = textoDetectado.map((texto) => texto.description).join('\n');

        if (textoUnico) {
          mensagemCorreta = await consultaOpenAI({
            data: {
              apiKey: credenciaisOpenAi.headers.apiKey,
              assistant_id: credenciaisOpenAi.headers.assistantId_vision,
              invoice_message: textoUnico,
            },
          });
          mensagemCorreta = mensagemCorreta.invoice.respostaBot;
          console.log('>>> Resposta bot processado pela openAI: ', mensagemCorreta);
        } else {
          console.log('>>> Transcrição retornou vazia ou inválida.');
          mensagemCorreta = null;
        }
      } catch (error) {
        mensagemCorreta = null;
        console.error('>>> Erro ao transcrever a imagem: ', error.message);
      }

    } else if (dadosExtraidos.liveLocation) {
      console.log('** LOCALIZAÇÃO EM TEMPO REAL DETECTADA **');
      const latitude = dadosExtraidos.liveLocation.degreesLatitude || null;
      const longitude = dadosExtraidos.liveLocation.degreesLongitude || null;
      const timestamp = dadosExtraidos.timestampMensagem 
      ? new Date(dadosExtraidos.timestampMensagem * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
      : null;

      // console.log(`Latitude: ${latitude}, Longitude: ${longitude}, Data Atual (Agora): ${timestamp}`);
      mensagemCorreta = `Latitude: ${latitude}, Longitude: ${longitude}, Data e Hora: ${timestamp}`;
      console.log('>>> ', mensagemCorreta);
    } else {
      logger.result('** NENHUMA MENSAGEM VÁLIDA DETECTADA **');
      mensagemCorreta = null;
    }

    // TRATAMENTO DE MENSAGENS DE INATIVAÇÃO DA IA
    // TO - DO Adicionar no banco ou em variaveis passadas como parametro
    // as palavras-chave que encerram o contato.
    // console.log('>>> Verificando se a mensagem é de encerramento de contato...');
    if (dadosExtraidos.fromMe === true && dadosExtraidos.fromApi !== true) {
      //console.log('>>> Mensagem enviada por mim, não processar.');
      if (mensagemCorreta && (mensagemCorreta.includes(':)') || mensagemCorreta.includes('(:'))) {
        console.log('>>> Mensagem de assunção de atendimento recebida.');
        const tabela = credenciaisSupabase.table_data.table_contatos;

        // Atualizar o status do cliente para inativo - verificar tratamento de erros com livia
        const filtros = {
          telefone: dadosExtraidos.usuarioNumero.toString(),
        };
        const dadosAtualizados = { inativo: true };

        await atualizarNoSupabase(tabela, filtros, dadosAtualizados, false);

        return {}; // Finaliza a execução
      } else if (mensagemCorreta && mensagemCorreta.includes('Obrigada! Qualquer coisa, estamos a disposição')) {
        // Atualizar o status do cliente para ativo - verificar tratamento de erros com Livia
        const filtros = {
          telefone: dadosExtraidos.usuarioNumero.toString(),
        };
        const dadosAtualizados = { inativo: false };

        await atualizarNoSupabase(tabela, filtros, dadosAtualizados, false);

        return {}; // Finaliza a execução
      }
      console.log('>> Mensagem from me');
      return {};
    }

    if (mensagemCorreta) {
      let mensagemFormatada = '';
      // console.log('>>> Mensagem correta:', mensagemCorreta);
      try {
        mensagemFormatada = await mensagemDeEntrada(mensagemCorreta);
        // console.log(">>> mensagemFormatada após run:", mensagemFormatada);
        // console.log('>>> Mensagem formatada:', mensagemFormatada);
      } catch (error) {
        console.error('Erro ao executar run:', error);
        throw error;
      }

      console.log(">>> Chamando integraBot com funções do cliente...");
      // console.log('>>> Chamando integraBot com funções do cliente...');

      const result = await integraBot(
        mensagemFormatada,
        dadosExtraidos.pushName,
        dadosExtraidos.idRemoto,
        dadosExtraidos.connectedPhone,
        credenciaisOpenAi
      );

      console.log("Resposta da OpenAI processada com sucesso:", result);
    }

    logger.finish();

    return dadosExtraidos;
  } catch (error) {
    console.error('Erro ao processar o JSON:', error.message, dadosExtraidos.connectedPhone);
    console.error('Detalhes do erro:', error.stack);
    return null;
  }
}

function extrairContactCardNumber(vcardString) {
  return vcardString?.match(/waid=(\d+)/)?.[1] || null;
}


module.exports = { processarMensagemJson };
