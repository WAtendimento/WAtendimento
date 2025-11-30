const axios = require('axios');
const { atualizarNoSupabase } = require('../supabase/atualizar-no-supabase');
const { enviarMensagemAPI } = require('./enviar-mensagem-api');
const { criaLogger } = require('../utils/logger');

const logger = criaLogger('mensagemEmMassa');

async function enviaMensagensEmMassa(json, credenciais, supabase, credenciaisSupabase, bot) {
  if (!json || typeof json !== 'object' || !json.mensagensGeradas || !Array.isArray(json.mensagensGeradas.contacts)) {
    throw new Error('[WAt] JSON inválido ou mal formatado.');
  }

  const contatos = json.mensagensGeradas.contacts;
  logger.add(`>>> [WAt] Processando ${contatos.length} contatos...`);

  //console.log(credenciais);
  let mensagensEnviadasComSucesso = 0;
  let statusEnvio = []; // Array para coletar o status de envio

  const dataMensagemEnviada = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });

  const [data, hora] = dataMensagemEnviada.split(', '); // Divide a data e a hora
  const [dia, mes, ano] = data.split('/'); // Divide o dia, mês e ano
  const dataFormatada = `${ano}-${mes}-${dia} ${hora}`;

  for (const contato of contatos) {
    const { number, message, id_cliente } = contato;

    if (!number || !message || !id_cliente) {
      console.warn('[WAt]Dados insuficientes para envio:', contato);
      statusEnvio = {
        id_cliente,
        sucesso: false,
        motivo: 'Dados insuficientes',
      };

      await atualizarNoSupabase(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        {
          id_cliente: id_cliente,
        },
        {
          ultimo_envio_em_massa: dataFormatada,
        }
      );

      continue;
    }

    if (typeof id_cliente !== 'number') {
      console.warn('[WAt]id_cliente não é um número. Valor recebido:', id_cliente);
      statusEnvio = { id_cliente, sucesso: false, motivo: 'id_cliente inválido' };

      continue;
    }

    const formattedNumber = `55${String(number).replace(/\D/g, '')}`;

    let credenciaisChip = {
      instance_id: credenciais.instance_id, // Altera instance_id para instance_id
      token: credenciais.new_token,
    };

    try {
      console.log(
        '|| Envio em massa: Enviando mensagem: ',
        message,
        'Do : ',
        credenciais.connected_phone,
        credenciais.id_chip,
        credenciais.instance_id,
        credenciais.new_token,
        'id_cliente',
        id_cliente
      );

      let contextoChat = {
        id_chip: credenciais.id_chip,
        connectedPhone: credenciais.connected_phone,
        fromMe: true,
        tabelaContato: credenciaisSupabase.table_data.table_contatos,
        bot: bot,
        supabaseClient: supabase,
      };

      let resultadoEnvio = await enviarMensagemAPI(
        credenciaisChip,
        formattedNumber,
        message,
        '|| Envio em massa: ',
        '', // mensagemDoUsuario (pode ser string vazia)
        true, // multipleMessages = true => envia por linha,
        contextoChat
      );

      resultadoEnvio = Array.isArray(resultadoEnvio) ? resultadoEnvio[resultadoEnvio.length - 1] : resultadoEnvio;

      console.log(`[WAt] || Envio em massa: Resultado enviado para ${formattedNumber}`, resultadoEnvio.sucesso);
      const dataAtual = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });

      const [data, hora] = dataAtual.split(', '); // Divide a data e a hora
      const [dia, mes, ano] = data.split('/'); // Divide o dia, mês e ano
      const dataFormatada = `${ano}-${mes}-${dia} ${hora}`; // Formata para o padrão YYYY-MM-DD HH:MM:SS

      if (resultadoEnvio.sucesso) {
        console.log('[WAt] || Envio em massa: Atualiza contato para sucesso de mensagem enviada');

        const att = await atualizarNoSupabase(
          supabase,
           credenciaisSupabase.table_data.table_contatos,
          {
            id_cliente: id_cliente,
          },
          {
            ultimo_envio_em_massa: dataFormatada,
            id_chip: credenciais.id_chip,
          }
        );

        console.log(`[WAt]|| Envio em massa: Contato ${id_cliente} atualizado com id_chip = ${credenciais.id_chip} | ${credenciais.connected_phone}`);

        mensagensEnviadasComSucesso++;
        statusEnvio = { id_cliente, sucesso: true };
        logger.add(`>>> [WAt] Mensagem enviada com sucesso para ${formattedNumber}.`);

        //delay apenas se for sucesso no envio
        let delay = Math.random() * (7000 - 1000) + 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return statusEnvio;
      } else {
        let motivo;

        const statusCode = resultadoEnvio?.statusCode;
        const mensagemErro = resultadoEnvio?.erro;

        if (statusCode === 504 || statusCode === 403 || statusCode === 401) {
          console.log(`[WAt]|| Envio em massa: Erro ${statusCode}: Inativando chip ${credenciais.id_chip} no banco.`);
          motivo = 'Problema com o chip';
          await atualizarNoSupabase(supabase,credenciaisSupabase.table_data.table_chips, { id_chip: credenciais.id_chip }, { inativo: true });

          console.log('[WAt]|| Envio em massa: Inativei o chip');
          statusEnvio = {
            id_cliente,
            sucesso: false,
            motivo: `Erro ${statusCode}: Chip inativado.`,
            problemaNoChip: true,
          };
          return statusEnvio;
        } else {
          if (statusCode === 500) {
            motivo = 'Número não encontrado no WhatsApp';
            await atualizarNoSupabase(
              supabase, 
               credenciaisSupabase.table_data.table_contatos,
              {
                id_cliente: id_cliente,
              },
              {
                ultimo_envio_em_massa: dataFormatada,
              }
            );
            console.log(`[WAt]|| Envio em massa: Número ${number} não encontrado no WhatsApp. Atualizando no banco...`);
          } else {
            motivo = ` Erro não identificado ${mensagemErro}`;
            await atualizarNoSupabase(
              supabase, 
               credenciaisSupabase.table_data.table_contatos,
              {
                id_cliente: id_cliente,
              },
              {
                ultimo_envio_em_massa: dataFormatada,
              }
            );
          }
          statusEnvio = {
            id_cliente,
            sucesso: false,
            motivo: `Erro ${statusCode}: Erro não identificado`,
          };
          return statusEnvio;
        }
      }
    } catch (error) {
      console.log('[WAt]|| Envio em massa: ', error);
    }
  }

  logger.add(`>>> [WAt] Processamento de mensagens concluído. Total de mensagens enviadas com sucesso: ${mensagensEnviadasComSucesso}.`);
}

module.exports = { enviaMensagensEmMassa };
