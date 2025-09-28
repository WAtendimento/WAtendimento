/**
 * Funções de acesso ao supabase
 */
const { buscarNoSupabase } = require('../supabase/buscar-no-supabase');
/**
 * Funções de envio de mensagens
 */
const { enviaMensagensEmMassa } = require('../wapi/enviar-mensagens-em-massa');
const { enviarMensagemAPI } = require('./enviar-mensagem-api');
const { controleExecucao } = require('./controlador-estado-execucao');


/**
 * 
 * @param {String} mensagemBase - Mensagem base para ser enviada aos contatos
 * @param {Number} maxResults - Número máximo de resultados a serem processados
 * @param {Object} credenciaisWAPI - Credenciais WAPI do chip a ser utilizado
 * @param {Object} credenciaisSupabase - Credenciais do Supabase para acessar a tabela de contatos
 * @param {String} funcao - indica qual funcao queremos que seja executada (NOVOS_CONTATOS, SERIAL_CONTATOS, TODOS_CONTATOS)
 * @returns {Promise<Object>} - Retorna um objeto com o total de contatos carregados, sucessos e falhas 
 */


async function processarMensagensEmMassa(mensagemBase, maxResults, credenciaisWAPI, credenciaisSupabase, supabase,
  idMensagem, bot, funcao = 'TODOS_CONTATOS', modoTeste = false
) {
  
  // TO-DO: Buscar o telefone do responsável pelo banco
  const telefoneResponsavel = '5581988961959'; // numero de maria
  const telefonesTeste = ['5581988961959', '558196948615']; // Livia e Maria


  console.log('[WAt] || Envio em massa: Iniciando o processo de envio de mensagens em massa...');

  if (!controleExecucao.getEstado()) {
    console.log('[WAt] || Envio em massa: 🔴 O envio foi pausado. Interrompendo o envio.');
  }

  try {
    const pageSize = 100; // Tamanho da página
    let offset = 0; // Para rastrear a posição atual
    let totalSucessos = 0;
    let totalFalhas = 0;
    let totalCarregados = 0;

    //Preparando dados para consulta da tabela dos Chips
    const tabela = credenciaisSupabase.table_data.table_chips;
    const filtros = {
      id_chip: ['>=', 0],
    };

    const camposSelecionados = ['id_chip', 'nome', 'instance_id', 'new_token', 'inativo', 'connected_phone'];
    let resultadoConsultaChip = await buscarNoSupabase(supabase,tabela, filtros, camposSelecionados, false);

    resultadoConsultaChip = resultadoConsultaChip.filter((chip) => chip.inativo !== true && chip.instance_id !== null);

    // Exibir todos os connected_phone conectados em um só log
    const connectedPhones = resultadoConsultaChip
      .map((chip) => chip.connected_phone)
      .filter(Boolean) // Remove valores nulos ou undefined
      .join(', ');

    console.log('[WAt] || Envio em massa: Telefones conectados:', connectedPhones);

    if (!resultadoConsultaChip || resultadoConsultaChip.length === 0) {
      console.log('[WAt] || Envio em massa: Nenhum registro encontrado para o chip informado.');
      throw new Error('Nenhum registro encontrado para o chip informado.');
    }

    while (true) {
      if (totalSucessos >= maxResults) {
        console.log('[WAt] || Envio em massa: Limite de sucessos atingido. Interrompendo o envio.');
        break;
      }

      console.log(`[WAt] || Envio em massa: Carregando contatos a partir do offset ${offset}...`);

      const from = offset;
      const to = offset + pageSize - 1;

      console.log('[WAt] || Envio em massa: ID da mensagem para filtro:', idMensagem);
      let baseQuery = null;

      // Verificar qual a funcao para selecionar os contatos corretos
      if(funcao === 'NOVOS_CONTATOS') {
        baseQuery = supabase
        .from(credenciaisSupabase.table_data.table_contatos)
        .select('*')
        .order('id_cliente', { ascending: true })
        .range(from, to)
        .is('id_mensagem_enviada', null)
        .is('ultimo_envio_em_massa', null)
        .not('telefone', 'is', null);
      } else if (funcao === 'SERIAL_CONTATOS') {
        // Ajustar a query com base no parâmetro `buscarSomenteSemMensagem`
        baseQuery = supabase
          .from(credenciaisSupabase.table_data.table_contatos)
          .select('*')
          .order('id_cliente', { ascending: true })
          .range(from, to)
          .or(`id_mensagem_enviada.is.null,id_mensagem_enviada.neq.${idMensagem}`)
          .not('telefone', 'is', null);
      } else { // TODOS_CONTATOS, ignorando idMensagem
        baseQuery = supabase
          .from(credenciaisSupabase.table_data.table_contatos)
          .select('*')
          .order('id_cliente', { ascending: true })
          .range(from, to)
          .not('telefone', 'is', null);
      } 

      // Condições para o comportamento padrão
      // console.log('[WAt]|| Envio em massa: Enviando mensagem para contatos que ainda nao receberam mensagem alguma');
      // baseQuery.order('id_cliente', { ascending: false });

      // console.log('[WAt] || Envio em massa: Query gerada:', baseQuery.toString());
      
      //Filtro para testes internos so com meu numero e de maria
      // baseQuery.in('id_cliente', [7749, 7648]).order('id_cliente', { ascending: false });

      if (modoTeste) {
        baseQuery = supabase
          .from(credenciaisSupabase.table_data.table_contatos)
          .select('*')
          .in('telefone', telefonesTeste)
          .order('id_cliente', { ascending: true });

          console.log('[WAt]|| Envio em massa: Modo de teste ativo. Apenas números de teste serão processados.')
      }


      const { data, error } = await baseQuery;

      // console.log(`[WAt]|| Depuração: Contatos carregados do Supabase:`, data);

      if (error) {
        console.error('[WAt] || Envio em massa: Erro na consulta ao Supabase:', error.message);
        throw new Error(`Erro na consulta ao Supabase: ${error.message}`);
      }

      const contatos = data || [];
      const quantidadeCarregada = contatos.length;

      // console.log(`[WAt]|| Envio em massa: Contatos carregados nesta página: ${quantidadeCarregada}`);
      totalCarregados += quantidadeCarregada;

      if (quantidadeCarregada === 0) {
        console.log('[WAt] || Envio em massa: Todos os contatos foram processados.');
        break;
      }

      // Gerar todas as mensagens de uma vez
      const mensagensGeradas = gerarMensagensParaEnvio(contatos, mensagemBase).contacts;

      let indiceCredencial = 0;

      // Iterar sobre as mensagens geradas e enviar uma por vez
      for (const mensagem of mensagensGeradas) {
        if (totalSucessos >= maxResults) {
          console.log('[WAt] || Envio em massa: Limite de sucessos atingido. Interrompendo o envio.');
          break;
        }

        let mensagemEnviada = false;
        let tentativas = 0;

        while (!mensagemEnviada && resultadoConsultaChip.length > 0) {
          if (!controleExecucao.getEstado()) {
            console.log('[WAt] || Envio em massa: 🔴 O envio foi pausado. Interrompendo o envio.');
            await notificarPausa();
            
            return { status: 'Pausado pelo usuário' };
          }
          const credenciaisChipAtual = resultadoConsultaChip[indiceCredencial];

          const resultados = await enviaMensagensEmMassa({ mensagensGeradas: { contacts: [mensagem] } }, credenciaisChipAtual, supabase, credenciaisSupabase, bot);

          console.log('[WAt]|| Envio em massa: ', resultados);

          if (resultados?.problemaNoChip) {
            console.log(`[WAt] || Envio em massa: Chip ${credenciaisChipAtual.connected_phone} inativado. Tentando com o próximo chip...`);
            resultadoConsultaChip = resultadoConsultaChip.filter((chip) => chip.id_chip !== credenciaisChipAtual.id_chip);

            if (resultadoConsultaChip.length === 0) {
              console.log('[WAt] || Envio em massa: Todos os chips estão inativos. Interrompendo o envio.');
              return {
                totalCarregados,
                sucessos: totalSucessos,
                falhas: totalFalhas,
                motivo: 'Todos os chips foram inativados.',
              };
            }

            indiceCredencial = (indiceCredencial + 1) % resultadoConsultaChip.length;

            tentativas++;
            console.log('[WAt] || Envio em massa: Novo chip', indiceCredencial);
            if (tentativas >= resultadoConsultaChip.length) {
              console.log(`[WAt] || Envio em massa: Mensagem falhou mesmo após tentar com todos os chips. Pulando para a próxima.`);
              totalFalhas++;
              break;
            }

            continue; // Volta para tentar a mesma mensagem com outro chip
          }

          // Se NÃO houve problema no chip, processa normalmente
          mensagemEnviada = true;
          const sucesso = resultados.sucesso === true;

          console.log('[WAt] || Envio em massa: Não teve problema com o chip', sucesso);
          if (sucesso) {
            totalSucessos++;
            indiceCredencial = (indiceCredencial + 1) % resultadoConsultaChip.length;

            if(funcao !== 'TODOS_CONTATOS') {
               await atualizarStatusEnvio({
              idCliente: mensagem.id_cliente,
              idMensagem: idMensagem, // ou o que vier da WAPI
              supabase,
              credenciaisSupabase
            });
            }

          } else {
            totalFalhas++;
          }

          break; // Sai do while e vai para a próxima mensagem
        }

        console.log(`[WAt] || Envio em massa: Total de sucessos acumulados: ${totalSucessos}`);
        console.log(`[WAt] || Envio em massa: Total de falhas acumuladas: ${totalFalhas}`);

         if (totalSucessos >= quantidadeCarregada) {
          console.log('[WAt] || Envio em massa: Quantidade carregada máxima atingida. Interrompendo o envio.');
          break;
        }

        if (indiceCredencial === 0) {
          console.log(`[WAt] || Envio em massa: Aguardando Delay para recomeçar os envios`);
          let delay = Math.random() * (20000 - 30000) + 30000;
          console.log(`[WAt] || Envio em massa: Delay iniciado por ${Math.round(delay / 1000)} segundos`);
          const resultadoDelay = await delayComVerificacao(delay);
          if (resultadoDelay?.status === 'Pausado durante o delay') {
            return resultadoDelay; // encerra de forma limpa e imediata
          }
        }
        if (totalFalhas >= 20 && totalSucessos == 0) {
          console.log('[WAt] || Envio em massa: Número de falhas consecutivas atingiu 5. Interrompendo o envio.');
          return {
            totalCarregados,
            sucessos: totalSucessos,
            falhas: totalFalhas,
          };
        }
      }

      if (totalSucessos >= maxResults) {
        console.log('[WAt] || Envio em massa: Limite de sucessos atingido. Interrompendo o envio.');
        break;
      }
      // Incrementar o offset para a próxima página
      offset += pageSize;
    }

    console.log(
      `[WAt] || Envio em massa: Processamento concluído. Total de contatos carregados: ${totalCarregados}, sucessos: ${totalSucessos}, falhas: ${totalFalhas}`
    );

    return { totalCarregados, sucessos: totalSucessos, falhas: totalFalhas };
  } catch (erro) {
    console.error(`[WAt] || Envio em massa: Erro ao executar a função: ${erro.message}`);
    throw erro;
  }
}

function gerarMensagensParaEnvio(contatos, mensagemBase) {
  console.log('[WAt] || Envio em massa: Iniciando a geração de mensagens para os contatos...');

  const contacts = contatos.map(({ telefone, nome_cliente, id_cliente }) => {
   // Pega apenas o primeiro nome do contato
  const primeiroNome = nome_cliente ? nome_cliente.split(' ')[0] : '';

  // Gera a mensagem personalizada
  const mensagemPersonalizada = primeiroNome
    ? `Olá ${primeiroNome}! ${mensagemBase}`
    : `Olá! ${mensagemBase}`;

    return {
      number: telefone || '',
      message: mensagemPersonalizada,
      id_cliente, // Atualizado para usar id_cliente
    };
  });

  console.log('[WAt] || Envio em massa: Mensagens geradas para todos os contatos.');
  return { contacts };
}

const atualizarStatusEnvio = async ({ idCliente, idMensagem, supabase, credenciaisSupabase}) => {
  if (!idCliente || !idMensagem || !supabase) {
    console.warn('[WAt] || Envio em massa: ⚠️ Dados insuficientes para atualizar status de envio.');
    return;
  }

  const { error } = await supabase
    .from(credenciaisSupabase.table_data.table_contatos)
    .update({
      id_mensagem_enviada: idMensagem,
    })
    .eq('id_cliente', idCliente);

  if (error) {
    console.error(`[WAt] || Envio em massa: Erro ao atualizar status do id_cliente ${idCliente}:`, error.message);
  } else {
    console.log(`[WAt] || Envio em massa: Status de envio atualizado para o id_cliente ${idCliente}`);
  }
};



async function notificarPausa() {
  if (!envioPausadoNotificado) {
    envioPausadoNotificado = true;
    await enviarMensagemAPI(
      credenciaisWAPI.credenciaisWAPI,
      '5581996948615',
      `|| Envio em massa: 🔴 O envio foi pausado. Pode recomeçar.`,
      'Pause nos envios - enviando para Livia',
      null,
      null // não atualizamos chat pois é uma notificação interna
    );
  }
}

async function delayComVerificacao(tempoTotalMs, intervaloMs = 5000) {
  const inicio = Date.now();

  while (Date.now() - inicio < tempoTotalMs) {
    // Verifica se o serviço foi pausado durante o delay
    if (!controleExecucao.getEstado()) {
      console.log(`[WAt] || Envio em massa: Serviço pausado durante o delay.`);

      await notificarPausa();

      return { status: 'Pausado durante o delay' };
    }

    // Aguarda um pequeno intervalo antes de checar de novo
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
}


module.exports = {
  processarMensagensEmMassa
};
