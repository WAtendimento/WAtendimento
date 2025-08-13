const { criaThreadeEnviaMensagem } = require('../waissistente/criar-thread-e-enviar-mensagem');
const { enviaMensagemThreadExistente } = require('../waissistente/enviar-mensagem-de-thread-existente');
const { buscaUltimaMensagemThread } = require('../waissistente/buscar-ultima-mensagem-da-thread');
const criaLogger = require('../utils/logger');
const atualizarNoSupabase = require('../supabase/atualizar-no-supabase');
const acumulaMensagens = require('../utils/acumular-mensagens');
const { tentaAdquirirLock, liberaLock } = require('../supabase/gerenciar-lock'); // ajuste o caminho conforme necessário

/**
 * @typedef {Object} FiltrosAdicionaisContato
 * @property {Object.<string, [string, any]>} filtros - Chaves e valores usados como filtros adicionais para identificar o cliente.
 */

/**
 * @typedef {Object} VerificaEEnviaMensagemParams
 * @property {string} dadosFornecidos - Dados do cliente.
 * @property {string} nomeContato - Nome do contato do cliente.
 * @property {boolean} contatoEncerrado - Indica se o contato foi encerrado.
 * @property {string|null} openai_thread_id - ID do thread associado ao OpenAI, se aplicável.
 * @property {string} mensagem - Mensagem que será enviada ao cliente.
 * @property {string} telefoneContato - Número do contato do cliente.
 * @property {FiltrosAdicionaisContato} [filtrosAdicionaisContato] - Filtros adicionais para identificar o cliente.
 * @property {string[]} camposConflito - Array de colunas usadas para verificar conflito em caso de UPSERT.
 */

/**
 * @typedef {Object} VerificaEEnviaMensagemRetorno
 * @property {boolean} sucesso - Indica se a operação foi bem-sucedida.
 * @property {string} [mensagem] - Mensagem de erro caso a operação falhe.
 * @property {Object|null} contatoRetornoIA - Resposta obtida da IA após a comunicação.
 */

/**
 * Verifica e envia uma mensagem com base nas informações fornecidas.
 *
 * @param {VerificaEEnviaMensagemParams} params - Parâmetros para verificação e envio da mensagem.
 * @returns {Promise<VerificaEEnviaMensagemRetorno>} Retorno da função contendo o status da operação e a resposta da IA.
 */

async function verificaEEnviaMensagem({
  dadosFornecidos,
  nomeContato,
  contatoEncerrado,
  openai_thread_id,
  mensagem,
  telefoneContato,
  filtrosAdicionaisContato,
  camposConflito,
  assistantId,
  nomeThread,
  credenciaisOpenAi,
  supabase,
  tabela,
}) {
  const logger = criaLogger(telefoneContato);
  const mensagensAcumuladas = acumulaMensagens(telefoneContato);
  const telefone = { telefone: ['=', telefoneContato] };

  const filtrosComTelefone = {
    ...filtrosAdicionaisContato,
    telefone: telefoneContato,
  };

  // console.log('mensagem', mensagem);
  // console.log('nomeContato', nomeContato);
  // console.log('dadosFornecidos', dadosFornecidos);
  // console.log('telefoneContato', telefoneContato);

  logger.add(`mensagem: ${mensagem} nomePessoa: ${nomeContato} dadosFornecidos: ${dadosFornecidos}`);
  const filtrosFormatados = Object.entries(filtrosComTelefone).reduce((acc, [chave, valor]) => {
    acc[chave] = ['=', valor];
    return acc;
  }, {});

  let filtros = Object.assign(telefone, filtrosFormatados);

  // console.log('filtros', filtros);

  try {
    if (!contatoEncerrado) {
      // console.log('Antes de adquirir lock');
      const lockAdquirido = await tentaAdquirirLock(supabase, telefoneContato, tabela, filtrosAdicionaisContato.id_chip);

      // console.log('logAdquirido = ', lockAdquirido);

      if (lockAdquirido) {
        await atualizarNoSupabase(
          supabase,
          tabela,
          filtrosComTelefone,
          { interação_em_andamento: true },
          false
        );

        logger.add(`Criando Buffer com 1ª mensagem: ${mensagem}`);
        // console.log(`Criando buffer com a 1a msg:  ${mensagem}`);
        mensagensAcumuladas.add(mensagem);
        logger.add('Delay de 20 segundos para BUFFER');
        // console.log('Delay de 20 segundos para BUFFER');
        await new Promise((resolve) => setTimeout(resolve, 20000));

        mensagem = mensagensAcumuladas.finish();

        const resultado = await controleDeThreads({
          dadosFornecidos,
          nomeContato,
          openai_thread_id,
          mensagem,
          telefoneContato,
          filtrosAdicionaisContato,
          camposConflito,
          assistantId,
          nomeThread,
          credenciaisOpenAi,
          supabase,
          tabela,
        });

        logger.add('Concluiu envio. Resetando interacao_em_andamento e liberando lock...');
        // console.log('Concluiu envio. Resetando interacao_em_andamento e liberando lock...');
        await atualizarNoSupabase(
          supabase,
          tabela,
          filtrosComTelefone,
          { interação_em_andamento: false },
          false
        );

        await liberaLock(supabase, tabela, telefoneContato, filtrosAdicionaisContato.id_chip);

        // console.log('Lock liberado');

        return resultado;
      } else {
        // Lock não adquirido — interação em andamento
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logger.add(`Lock ativo. Adicionando mensagem ao Buffer: ${mensagem}`);
        // console.log(`Lock ativo. Adicionando mensagem ao Buffer: ${mensagem}`);
        mensagensAcumuladas.add(mensagem);
        return {
          sucesso: true,
          mensagem: 'Mensagem adicionada ao buffer',
          contatoRetornoIA: null,
          interação_em_andamento: true,
        };
      }
    } else {
      logger.add('[LOG] O Contato está encerrado, não prosseguimos no fluxo');
      return {
        sucesso: true,
        mensagem: 'Contato encerrado',
        contatoRetornoIA: null,
      };
    }
  } catch (erro) {
    logger.error('Erro inesperado na função verificaEEnviaMensagem:', erro);
    // console.error('Erro inesperado na função verificaEEnviaMensagem:', erro);

    // Em caso de erro, tenta liberar o lock (por segurança)
    await liberaLock(tabela, telefoneContato, );

    return {
      sucesso: false,
      mensagem: 'Erro inesperado',
      contatoRetornoIA: null,
    };
  }
}

async function controleDeThreads({
  dadosFornecidos,
  nomeContato,
  openai_thread_id,
  mensagem,
  telefoneContato,
  filtrosAdicionaisContato,
  camposConflito,
  assistantId,
  nomeThread,
  credenciaisOpenAi,
  supabase,
  tabela,
}) {
  const logger = criaLogger(telefoneContato);
  try {
    let threadId;
    let lastMessageId;
    let criouThread;

    if (!openai_thread_id || openai_thread_id == null) {
      try {
        logger.add('==== [ETAPA 1: CRIANDO THREAD && ENVIANDO MENSAGEM] ====');
        const mensagemRecebidaPrimeiraThread = await criaThreadeEnviaMensagem({
          data: {
            mensagem: mensagem,
            nome: nomeContato,
            dadosFornecidos: dadosFornecidos,
            telefoneContato: telefoneContato,
            filtrosAdicionais: filtrosAdicionaisContato,
            camposConflito: camposConflito,
            apiKey: credenciaisOpenAi.headers.apiKey,
            assistantId: assistantId,
            nomeThread: nomeThread,
            tabela: tabela,
            supabase: supabase,
          }
        });

        logger.add('>>> Mensagem enviada com sucesso: ');

        threadId = mensagemRecebidaPrimeiraThread.thread_id;
        lastMessageId = mensagemRecebidaPrimeiraThread.value?.messageId;
        criouThread = true;
      } catch (erro) {
        logger.error('Erro ao criar thread e enviar mensagem:', erro);
        console.error('Erro ao criar thread e enviar mensagem:', erro);
        return {
          sucesso: false,
          mensagem: 'Erro ao criar thread',
          contatoRetornoIA: null,
        };
      }
    } else {
      logger.add('>>> Thread existente encontrada. Enviando mensagem na thread...');
      try {
        logger.add('==== [ETAPA 1: ENVIANDO MENSAGEM EM THREAD EXISTENTE] ====');
        const resultado = await enviaMensagemThreadExistente({
          data: {
            thread_id: openai_thread_id,
            user_message: mensagem,
            nome: nomeContato,
            dadosFornecidos: dadosFornecidos,
            telefoneContato,
            filtrosAdicionaisContato,
            apiKey: credenciaisOpenAi.headers.apiKey,
            assistantId: assistantId,
          },
        });

        logger.add('>>> Mensagem enviada na thread existente com sucesso.');
        threadId = openai_thread_id;
        lastMessageId = resultado.messageId;
        criouThread = false;
      } catch (erro) {
        logger.error('Erro ao enviar mensagem na thread existente:', erro);
        console.error('Erro ao enviar mensagem na thread existente:', erro);
        return {
          sucesso: false,
          mensagem: 'Erro ao enviar mensagem',
          contatoRetornoIA: null,
        };
      }
    }

    try {
      const data = {
        threadId,
        lastMessageId,
        apiKey: credenciaisOpenAi.headers.apiKey,
        tabela: tabela,
        telefoneContato: telefoneContato,
        filtrosAdicionaisUnicos: filtrosAdicionaisContato,
        camposConflito: camposConflito,
        supabase: supabase,
      };

      let result = await buscaUltimaMensagemThread({ data });

      if (!result || typeof result !== 'object') {
        console.warn('Resultado inesperado de buscaUltimaMensagemThread', result);
      }

      result.resumo = result.resumo || '';

      logger.add('JSON Resposta Bot:', result);

      const respostaBot = result.respostaBot;
      if (respostaBot) {
      } else {
        logger.add('>>> RespostaBot não encontrada no resultado.');
      }
      return { sucesso: true, contatoRetornoIA: result }; // Sempre retornar a estrutura padrão
    } catch (error) {
      logger.error('Erro ao executar buscaUltimaMensagemThread:', error);
      console.error('Erro ao executar buscaUltimaMensagemThread:', error);
      return {
        sucesso: false,
        mensagem: 'Erro ao buscar última mensagem',
        contatoRetornoIA: null,
      };
    }
  } catch (erro) {
    logger.error('Erro inesperado na função verificaEEnviaMensagem:', erro);
    console.error('Erro inesperado na função verificaEEnviaMensagem:', erro);
    return {
      sucesso: false,
      mensagem: 'Erro inesperado',
      contatoRetornoIA: null,
    };
  }
}

module.exports = { verificaEEnviaMensagem };
