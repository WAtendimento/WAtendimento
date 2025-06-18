const { mensagemDeEntrada } = require('../utils/formatador-mensagens');
const { converterAudioBase64ParaTexto } = require('../waissistente/converter-base64audio-para-texto');
const criaLogger = require('../utils/logger');
const atualizarNoSupabase = require('../supabase/atualizar-no-supabase');
const { imagemParaTexto } = require('../vision/detector-texto');
const { consultaOpenAI } = require('../waissistente/consulta-open-ai');
const credenciaisSupabase = require('../../credenciais/supabase');
const { urlParaBase64 } = require('../utils/converter-url-para-base64');

/**
 * Processa e extrai dados de uma mensagem JSON recebida pela WAPI.
 * @param {Object} json - Objeto JSON enviado pelo webhook da WAPI.
 * @returns {Object|null} - Dados extraídos da mensagem ou null em caso de erro.
 */


async function processarMensagemJson(json, credenciaisOpenAi, integraBot) {
  try {
    console.log('Mensagem Recebida... Iniciando processamento. Aguarde...');
    // logger.add(
    //   ">>> Iniciando processarMensagemJson com JSON completo:",
    //   JSON.stringify(json, null, 2)
    // );

    if (!json || typeof json !== 'object') {
      console.error('Entrada inválida: JSON ausente ou mal formatado.');
      throw new Error('Entrada inválida: JSON ausente ou mal formatado.');
    }

    // Verificar se a mensagem é de um grupo
    if (json.isGroup === true) {
      console.log('Mensagem de grupo detectada. Nenhum processamento será feito.');
      return null;
    }
    const dadosExtraidos = {
      idRemoto: json.sender?.id || null,
      usuarioNumero: json.chat?.id || null,
      mensagem: json.msgContent?.conversation || null,

      canonicalUrl: json.msgContent?.canonicalUrl || null,
      textoLinkImagem: json.msgContent?.description || null,
      tituloLinkImagem: json.msgContent?.title || null,

      tipoMensagem: json.event || null,
      idMensagem: json.messageId || null,
      timestampMensagem: json.moment || null,
      fromMe: json.fromMe ?? null,
      pushName: json.sender?.pushName || null,

      contactCardName: json.msgContent?.contactMessage?.displayName || null,
      contactCardVcard: json.msgContent?.contactMessage?.vcard || null,
      contactCardNumber: extrairContactCardNumber(json.msgContent?.contactMessage?.vcard.vcard),// Usar regex pra pegar de dentro do vCard.

      audioMessage: json.msgContent?.audioMessage?.url || null,
      audioMimeType: json.msgContent?.audioMessage?.mimetype || null,
      audioDurationSegundos: json.msgContent?.audioMessage?.seconds || null,

      // Imagem – mudou de base64 para URL
      imageUrl: json.msgContent?.imageMessage?.url || null,
      imageMimeType: json.msgContent?.imageMessage?.mimetype || null,

      // Localização em tempo real
      liveLocation: json.msgContent?.liveLocationMessage || null,

      // Número do telefone conectado
      connectedPhone: json.connectedPhone || null,
    };

    console.log(`${dadosExtraidos.usuarioNumero} Dados Extraídos: ${JSON.stringify(dadosExtraidos, null, 2)}`);

    const telefoneContato = dadosExtraidos.idRemoto.split('@')[0];
    const logger = criaLogger(telefoneContato);

    // Normalizar o número de telefone se estiver presente
    let telefoneNormalizado = null;

     //  TO-DO Adicionar condição com parametro para habilitar/desabilitar numeros de teste

    if (dadosExtraidos.contactCardNumber) {
      telefoneNormalizado = normalizeTelefone(dadosExtraidos.contactCardNumber);
      if (!telefoneNormalizado) {
        console.warn('Telefone não está no formato esperado e foi descartado.');
      } else {
        dadosExtraidos.contactCardNumber = telefoneNormalizado;
        logger.setTelefone(telefoneNormalizado);
      }
    }

    let mensagemCorreta;

    // Verificar se a mensagem é de áudio, imagem, contato ou texto

    if (dadosExtraidos.audioMessage) {
      logger.add('** MENSAGEM DE ÁUDIO DETECTADA **');
      try {
        // Extrair o base64 puro
        const base64Puro = await urlParaBase64(dadosExtraidos.audioMessage);

        if (!base64Puro) {
          throw new Error('Base64 do áudio está vazio ou inválido.');
        }

        const transcricao = await converterAudioBase64ParaTexto(base64Puro);

        //  logger.add(">>> Texto transcrito do áudio:", transcricao);
        if (transcricao) {
          mensagemCorreta = transcricao; // Use o texto transcrito
        } else {
          logger.add('>>> Transcrição retornou vazia ou inválida.');
          mensagemCorreta = null; // Removido fallback de "Transcrição indisponível"
        }

        logger.add('>>> Texto transcrito do áudio:', mensagemCorreta);
      } catch (error) {
        console.error('Erro ao transcrever o áudio:', error.message);
        mensagemCorreta = null;
      }
    } else if (dadosExtraidos.contactCardName) {
      logger.add('** MENSAGEM DE CONTATO DETECTADA **');
      // Remove o código 55 do número
      const contactNumber = dadosExtraidos.contactCardNumber.replace(/^55/, '');
      mensagemCorreta = `${dadosExtraidos.contactCardName} ${contactNumber}`;
    } else if (dadosExtraidos.mensagem) {
      logger.add('** MENSAGEM DE TEXTO DETECTADA **');
      mensagemCorreta = dadosExtraidos.mensagem;
    } else if (dadosExtraidos.imageUrl) {
      logger.add('** MENSAGEM COM IMAGEM DETECTADA **');

      try {
        // Remove o prefixo, se existir
        const base64 = await urlParaBase64(dadosExtraidos.imageUrl);
        const buffer = Buffer.from(base64, 'base64');

        console.log(buffer);

        // Convertendo imagem pra texto
        const textoDetectado = await imagemParaTexto({ image: buffer });
        // Colocando todo texto numa unica string
        const textoUnico = textoDetectado.map((texto) => texto.description).join('\n');

        console.log('>>> Texto detectado na imagem: ', textoUnico);

        if (textoUnico) {
          // TO-DO: deixar essas credenciais parametrizaveis
          mensagemCorreta = await consultaOpenAI({
            data: {
              apiKey: credenciaisOpenAi.headers.apiKey,
              assistant_id: credenciaisOpenAi.headers.assistantId_vision,
              invoice_message: textoUnico,
            },
          });
          //logger.add('>>> Texto detectado na imagem: ', textoUnico);
          logger.add('>>> Texto processado pela openAI: ', mensagemCorreta);
          mensagemCorreta = mensagemCorreta.invoice.respostaBot;
          logger.add('>>> Resposta bot processado pela openAI: ', mensagemCorreta);
        } else {
          logger.add('>>> Transcrição retornou vazia ou inválida.');
          mensagemCorreta = null;
        }
      } catch (error) {
        mensagemCorreta = null;
        console.error('>>> Erro ao transcrever a imagem: ', error.message);
      }
    } else if (dadosExtraidos.liveLocation) {
      logger.add('** LOZALIZACAO EM TEMPO REAL DETECTADA **');
      const latitude = dadosExtraidos.liveLocation.degreesLatitude || null;
      const longitude = dadosExtraidos.liveLocation.degreesLongitude || null;
      const timestamp = dadosExtraidos.timestampMensagem 
      ? new Date(dadosExtraidos.timestampMensagem * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
      : null;


      logger.add(`Latitude: ${latitude}, Longitude: ${longitude}, Data Atual (Agora): ${timestamp}`);
      mensagemCorreta = `Latitude: ${latitude}, Longitude: ${longitude}, Data e Hora: ${timestamp}`;
    } else {
      logger.result('** NENHUMA MENSAGEM VÁLIDA DETECTADA **');
      mensagemCorreta = null;
    }

    // TRATAMENTO DE MENSAGENS DE INATIVAÇÃO DA IA
    // TO - DO Adicionar no banco ou em variaveis passadas como parametro
    // as palavras-chave que encerram o contato.
    if (dadosExtraidos.fromMe === true) {
      if (mensagemCorreta && (mensagemCorreta.includes(':)') || mensagemCorreta.includes('(:'))) {
        console.log('Mensagem de assunção de atendimento recebida.');
        const tabela = credenciaisSupabase.table_data.table_contatos;

        // Atualizar o status do cliente para inativo - verificar tratamento de erros com livia
        const filtros = {
          telefone: dadosExtraidos.usuarioNumero.toString(),
        };
        const dadosAtualizados = { inativo: true };

        await atualizarNoSupabase(tabela, filtros, dadosAtualizados, false);

        return {}; // Finaliza a execução
      } else if (mensagemCorreta && mensagemCorreta.includes('Obrigada! Qualquer coisa, estamos a disposição')) {
        // Atualizar o status do cliente para ativo - verificar tratamento de erros com Livis
        const filtros = {
          telefone: dadosExtraidos.usuarioNumero.toString(),
        };
        const dadosAtualizados = { inativo: false };

        await atualizarNoSupabase(tabela, filtros, dadosAtualizados, false);

        return {}; // Finaliza a execução
      }
      console.log('Mensagem from me');
      return {};
    }

    if (mensagemCorreta) {
      let mensagemFormatada;
      try {
        mensagemFormatada = await mensagemDeEntrada(mensagemCorreta);
        // logger.add(">>> mensagemFormatada após run:", mensagemFormatada);
      } catch (error) {
        console.error('Erro ao executar run:', error);
        throw error;
      }

      //  logger.add(">>> Chamando integra Bot com funções do cliente...");

      const result = await integraBot(
        mensagemFormatada,
        dadosExtraidos.pushName,
        dadosExtraidos.idRemoto,
        dadosExtraidos.connectedPhone,
        credenciaisOpenAi
      );

      // console.log("Resposta da OpenAI processada com sucesso:", result);
    }

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
