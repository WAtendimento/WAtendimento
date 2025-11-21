const enviarMensagemAPI = require('./enviar-mensagem-api');
const { consultaOpenAI } = require('../waissistente/consulta-open-ai');
const buscarNoSupabase = require('../supabase/buscar-no-supabase');
const atualizarNoSupabase = require('../supabase/atualizar-no-supabase');
const insertOuUpsert = require('../supabase/inserir-ou-atualizar-no-supabase');
 
async function resolverTelefoneFaltante(
  identificador,
  nomeCliente,
  mensagemUsuario,
  credenciaisWAPI,
  credenciaisOpenAi,
  credenciaisSupabase,
  supabase
) {

  let id_chip = parseInt(credenciaisWAPI.id_chip, 10);

  console.log('==========================================================');
  console.log('🟣 Iniciando resolverTelefoneFaltante');
  console.log(`→ identificador recebido: ${identificador}`);
  console.log(`→ nomeCliente: ${nomeCliente}`);
  console.log(`→ id_chip recebido: ${id_chip}`);
  console.log(`Mensagem do usuario: ${mensagemUsuario}`)
  console.log('==========================================================');


  try {
    console.log(`>>> Iniciando resolução de telefone faltante para ${identificador}...`);
    
    // 1) Busca contato
    const contato = await buscarNoSupabase(
      supabase, 
      credenciaisSupabase.table_data.table_contatos,
      { 
        identificador: ['=', identificador], 
        id_chip: ['=', id_chip]
       },
      ['id_chip, identificador', 'nome_cliente', 'telefone', 'reconhecimento_em_andamento', 'ultima_mensagem'],
      true
    );

    console.log(`🔸 Resultado da busca: ${contato ? contato.length : 0} registros`);
    if (contato && contato.length > 0) {
      //console.log('🔸 Registro encontrado:', JSON.stringify(contato[0], null, 2));
    } else {
      console.log('🔸 Nenhum registro encontrado para esse identificador + chip.');
    }

    // 1a) Se não existe: cria placeholder por UPSERT e pede o número
    if (!contato || contato.length === 0) {
      console.log('>>> Contato não encontrado no banco. Criando contato e solicitando número...');
       console.log(`⚙️ id_chip usado: ${id_chip}, identificador: ${identificador}`);

       console.log('>>> Preparando para inserir/upsert contato...');
console.log('>>> Dados que serão enviados:', {
  id_chip,
  identificador,
  nome_cliente: nomeCliente || 'cliente',
  telefone: null,
  reconhecimento_em_andamento: true,
  ultima_mensagem: mensagemUsuario,
});


      await insertOuUpsert(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        {
          id_chip: id_chip,
          identificador: identificador,
          nome_cliente: nomeCliente || 'cliente',
          telefone: null,
          reconhecimento_em_andamento: true,
          ultima_mensagem: mensagemUsuario
        },
        true,                 // isUpsert
        ['id_chip', 'identificador']     // conflito por identificador
      );

      // Envia mensagem solicitando o número
      console.log('>>> Enviando mensagem solicitando número ao cliente...');
      await enviarMensagemAPI(
        credenciaisWAPI,
        identificador,
        "Olá! Sou a IA do PDM. Para encontrar o seu cadastro, preciso do seu número de telefone cadastrado. Pode me confirmar o seu número com DDD?",
        nomeCliente || 'cliente',
        mensagemUsuario
      );

      console.log('>>> Contato inexistente: placeholder criado (UPSERT) e iniciada coleta de número.');
      return true; // interrompe para aguardar resposta
    }

    const dados = contato[0];

    // console.log(`>>> Contato encontrado: ${JSON.stringify(dados)}`);

    // 2) Se já tem telefone, segue o fluxo normal
    if (dados.telefone) {
      console.log('>>> Contato já possui telefone cadastrado. Segue o fluxo normal.');
      return false;
    }

    console.log('>>> Status do reconhecimento em andamento:', dados.reconhecimento_em_andamento);
    id_chip = dados.id_chip
  

    // 3) Caso 1 — iniciar reconhecimento (lock otimista com filtro composto)
    if (!dados.reconhecimento_em_andamento) {
      console.log('>>> Iniciando processo de reconhecimento de número...');
      const upd = await atualizarNoSupabase(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        { 
          identificador: ['=', identificador], 
          id_chip: ['=', id_chip],
        },
        { reconhecimento_em_andamento: true,
          ultima_mensagem: mensagemUsuario
         },
        true
      );
      //const atualizou = upd?.rowCount > 0 || upd?.count > 0 || upd?.data?.length > 0;

      // console.log('>>> Resultado da tentativa de lock otimista:', upd);

      if (upd.data) {
        console.log('>>> Flag de reconhecimento iniciada com sucesso. Solicitando número ao cliente...');
        await enviarMensagemAPI(
          credenciaisWAPI,
          identificador,
          "Olá! Sou a IA do PDM. Para encontrar o seu cadastro, preciso do seu número de telefone cadastrado. Pode me confirmar o seu número com DDD?",
          nomeCliente || 'cliente',
          mensagemUsuario,
          true
        );
        console.log('>>> Reconhecimento de número iniciado. Solicitado número ao cliente.');
        return true; // aguarda resposta
      } else {
        console.log('>>> Reconhecimento já estava em andamento (race resolvida). Prosseguindo para extração.');
      }
    }

    // 4) Caso 2 — já em reconhecimento: tentar extrair
    let numero = null;

    console.log('>>> Tentando extrair número via IA...');

    let extraido = null;
    let incompleto = false;

    try {
      // 🔸 Quando a OpenAI estiver configurada, descomente
      const resposta = await consultaOpenAI({
        data: {
          apiKey: credenciaisOpenAi.headers.apiKey_phone,
          assistant_id: credenciaisOpenAi.headers.assistantId_phone,
          invoice_message: mensagemUsuario
        }
      });

      extraido = resposta.invoice?.telefone;
      incompleto = resposta.invoice?.incompleto;


      //console.log(`>>> Resposta da IA:  ${resposta.invoice}`);
      console.log(`>>> Número extraído pela IA: ${extraido}`);
      console.log(`>>> Indicador de número incompleto pela IA: ${incompleto}`);
      

      //const messagemRetorno = resposta.data.mensagem;
      if(incompleto === true) {
        console.log('>>> IA indicou que o número extraído está incompleto, solicitando novamente ao cliente...');

         await enviarMensagemAPI(
          credenciaisWAPI,
          identificador,
          'Obrigada! Mas percebi que o seu número está incompleto. Poderia me fornecer o seu número de whatsapp cadastrado conosco com DDD?', 
          nomeCliente || 'cliente',
          mensagemUsuario
        );

        console.log('>>> Número não estava completo. Solicitado novamente.');
        return true; // aguarda nova resposta
      }

      //extraido = '5581988961959'; // MOCK — REMOVER depois
    } catch (e) {
      console.log(`>>> Falha na consultaOpenAI: ${e?.message || e}`);
    }

    // 🔹 Primeiro: tenta normalizar o resultado da IA
    if (extraido && extraido !== null) {
      numero = normalizarTelefoneBR(extraido);
    }
    
    console.log(`>>> Número extraído via IA: ${extraido} → normalizado: ${numero}`);

    // 🔹 Se a IA não retornou nada útil ou o número não for válido, tenta regex/local
    if (!numero || !ehTelefoneBRValido(numero)) {
      console.log('>>> IA não conseguiu extrair número válido. Tentando via regex/local...');
      numero = normalizarTelefoneBR(mensagemUsuario);
    }

    if (numero && ehTelefoneBRValido(numero)) {
      console.log(`>>> Número extraído com sucesso: ${numero}. Atualizando cadastro...`);
      await atualizarNoSupabase(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        { 
          identificador: ['=', identificador], 
          id_chip: ['=', id_chip]
        },
        { telefone: numero, reconhecimento_em_andamento: false }
      );

      console.log('>>> Número atualizado no cadastro. Enviando confirmação ao cliente...');
      await enviarMensagemAPI(
        credenciaisWAPI,
        identificador,
        'Número confirmado com sucesso. Agora podemos continuar!', // mensagem de confirmação
        nomeCliente || 'cliente',
        mensagemUsuario
      );

      console.log(`>>> Número extraído e salvo: ${numero}`);
      return { reconhecidoAgora: true };
    }

    console.log('>>> Falha ao extrair número após tentativas. Solicitando novamente ao cliente...');
    await enviarMensagemAPI(
      credenciaisWAPI,
      identificador,
      'Obrigada! Mas percebi que o seu número está incompleto. Poderia me fornecer o seu número de whatsapp cadastrado conosco com DDD?', 
      nomeCliente || 'cliente',
      mensagemUsuario
    );

    console.log('>>> Falha ao extrair número. Solicitado novamente.');
    return true; // aguarda nova resposta

  } catch (err) {
    // 5) Proteção contra flag presa
    try {

      const contatoFlag = await buscarNoSupabase(
        supabase,
        credenciaisSupabase.table_data.table_contatos,
        { 
          identificador: ['=', identificador], 
          id_chip: ['=', id_chip]
        },
        ['reconhecimento_em_andamento', 'telefone']
      );

      const emAndamento = contatoFlag?.[0]?.reconhecimento_em_andamento;
      const temTelefone = !!contatoFlag?.[0]?.telefone;

      if (emAndamento && !temTelefone) {
        await atualizarNoSupabase(
          supabase,
          credenciaisSupabase.table_data.table_contatos,
          { 
            identificador: ['=', identificador], 
            id_chip: ['=', id_chip]
          },
          { reconhecimento_em_andamento: false }
        );
      }
    } catch (subErr) {
      console.log(`>>> (cleanup) Falhou ao ajustar flag: ${subErr?.message || subErr}`);
    }

    console.log(`>>> Erro em resolverTelefoneFaltante(${identificador}): ${err?.message || err}`);
    return false;
  }
}

// ===== Helpers internos =====


function normalizarTelefoneBR(input) {
  console.log(`>>> Normalizando telefone BR: entrada="${input}"`);
  const onlyDigits = (s) => String(s ?? '').replace(/\D+/g, '');


  if (!input) return null;
  const d = onlyDigits(input);
  console.log(`>>> Apenas dígitos: "${d}"`);

  if (/^55\d{10,11}$/.test(d)) { 
    console.log(`>>> Já está no formato completo: ${d} (len=${d.length})`);
    return d; // já com 55
  }

  if (/^\d{10,11}$/.test(d)) {
    console.log(`>>> Adicionando código do Brasil (55): ${d} (len=${d.length})`);
    return '55' + d; // DDD + número
  }

  if (/^0\d{10,11}$/.test(d)) {
    console.log(`>>> Removendo zero inicial e adicionando código do Brasil (55): ${d} (len=${d.length})`);
    return '55' + d.slice(1); // 0 + DDD + número
  }

  const match = d.match(/(\d{10,13})/);
  if (match) {
    const cand = match[1];
    if (/^55\d{10,11}$/.test(cand)) return cand;
    if (/^\d{10,11}$/.test(cand)) return '55' + cand;
  }

  return null;
}

function ehTelefoneBRValido(num) {
  if (!num) return false;

  // ✅ Corrigido: depois de 55, devem vir 10 ou 11 dígitos (DDD + número)
  if (!/^55\d{10,11}$/.test(num)) return false;

  const ddd = num.slice(2, 4);
  const local = num.slice(4);

  // DDD entre 11 e 99
  if (!/^[1-9]\d$/.test(ddd)) return false;

  // Número deve ter 8 ou 9 dígitos
  if (!(local.length === 8 || local.length === 9)) return false;

  // (Opcional) valida que números com 9 dígitos comecem com 9 (celular)
  // if (local.length === 9 && local[0] !== '9') return false;

  return true;
}




module.exports = { resolverTelefoneFaltante };