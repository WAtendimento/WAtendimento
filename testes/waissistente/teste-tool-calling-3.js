// Regressao do tool calling.
//
//   OPENAI_API_KEY=sk-... LEVOPS_SERVICE_KEY=eyJ... node testes/waissistente/teste-tool-calling-3.js
//
// Casos:
//   A. sem tools, saudacao          -> responde normal, sem funcao
//   B. sem tools, pergunta de dado  -> responde que nao tem o dado, sem quebrar
//   C. com tools, saudacao          -> nao chama funcao
//   D. com tools, pergunta de dado  -> chama a funcao e responde com o dado
//   E. com tools, dois turnos       -> encadeia e mantem o contexto
//   F. com tools, funcao quebrada   -> view inexistente, nao derruba a resposta
//
// Em todos, o JSON tem que vir com as chaves do contrato.

const { createClient } = require('@supabase/supabase-js');
const { buscarFuncoesBot } = require('../../src/supabase/buscar-funcoes-bot');
const { enviaMensagemResponses } = require('../../src/waissistente/enviar-mensagem-responses');

const TENANT = 'solution_log';
const TABELA_CONTATOS = 'solution_log_contatos';
const CHAVES = ['respostaBot', 'resumo', 'resumoConversa', 'encaminhar', 'temas'];

const supabase = createClient(
  'https://ibeodbugpwcedcgeyzef.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZW9kYnVncHdjZWRjZ2V5emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzMyMTYsImV4cCI6MjA1MTc0OTIxNn0.0RTYv8S9jH3hHKzA4zHY8_oq-rGtC1Z1O8aTh2gI4Tg'
);

const supabaseLevops = createClient(
  'https://buyjbhoyslfdbpmvrvkp.supabase.co',
  process.env.LEVOPS_SERVICE_KEY || '',
  { auth: { persistSession: false } }
);

const APIKEY = process.env.OPENAI_API_KEY;

const PROMPT = `<papel>
Voce atende a operacao da Solution Log e responde sobre as entregas.
</papel>

<formato_de_saida>
  Responda exclusivamente com um objeto JSON valido, sem markdown.
  {"respostaBot":"","resumo":"","resumoConversa":"","encaminhar":false,"temas":[]}
  NUNCA use aspas duplas dentro do texto. Use aspas simples.
</formato_de_saida>`;

const USUARIO = { email: 'livia@leev.cc', nome: 'Livia Furtado', caseId: 'USR-livia' };

let passou = 0;
let falhou = 0;

function conferir(rotulo, r, tempo) {
  const faltando = CHAVES.filter(c => r?.[c] === undefined);
  const ok = !!r?.respostaBot && faltando.length === 0;

  console.log(ok ? 'OK ' : 'FALHOU', '|', rotulo, '|', tempo + 's');
  console.log('   resposta:', String(r?.respostaBot || '(vazia)').slice(0, 220));

  if (faltando.length) console.log('   chaves faltando:', faltando.join(', '));
  if (!ok) console.log('   json:', JSON.stringify(r));

  ok ? passou++ : falhou++;
  return ok;
}

async function perguntar({ texto, sessao, tools, definicoes, anterior }) {
  return enviaMensagemResponses({
    data: {
      mensagem: texto,
      nome: USUARIO.nome,
      dadosFornecidos: '',
      telefoneContato: sessao,
      instrucoes: PROMPT,
      modelo: 'gpt-5.4-mini',
      responseIdAnterior: anterior || null,
      nomeThread: 'openai_thread_id',
      filtrosAdicionais: { id_chip: 99 },
      apiKey: APIKEY,
      supabase,
      tabela: TABELA_CONTATOS,
      tools,
      definicoes,
      supabaseLevops,
      contextoUsuario: USUARIO,
    },
  });
}

async function comContato(fn) {
  const sessao = 'teste-reg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  await supabase.from(TABELA_CONTATOS).insert({
    id_chip: 99,
    telefone: sessao,
    identificador: sessao,
    nome_cliente: 'Teste Regressao',
  });

  try {
    await fn(sessao);
  } finally {
    await supabase.from(TABELA_CONTATOS).delete().eq('telefone', sessao);
  }
}

async function rodar(rotulo, sessao, texto, tools, definicoes, anterior) {
  const inicio = Date.now();
  try {
    const r = await perguntar({ texto, sessao, tools, definicoes, anterior });
    conferir(rotulo, r, ((Date.now() - inicio) / 1000).toFixed(1));
    return r;
  } catch (e) {
    console.log('FALHOU |', rotulo, '| excecao:', e.message);
    falhou++;
    return null;
  }
}

async function main() {
  if (!APIKEY) { console.error('Falta OPENAI_API_KEY.'); process.exit(1); }
  if (!process.env.LEVOPS_SERVICE_KEY) { console.error('Falta LEVOPS_SERVICE_KEY.'); process.exit(1); }

  const { tools, definicoes } = await buscarFuncoesBot(supabase, TENANT);
  console.log('funcoes:', definicoes.map(d => d.nome).join(', ') || 'nenhuma');
  console.log('limite para pedir recorte:', definicoes[0]?.limite);
  console.log('');

  await comContato(s => rodar('A. sem tools, saudacao', s, 'bom dia'));
  await comContato(s => rodar('B. sem tools, pergunta de dado', s, 'o que vence hoje?'));
  await comContato(s => rodar('C. com tools, saudacao', s, 'bom dia', tools, definicoes));
  await comContato(s => rodar('D. com tools, pergunta de dado', s, 'o que vence hoje?', tools, definicoes));

  await comContato(async s => {
    const primeira = await rodar('E1. com tools, primeiro turno', s, 'o que vence hoje?', tools, definicoes);
    if (primeira) {
      const { data } = await supabase
        .from(TABELA_CONTATOS)
        .select('openai_thread_id')
        .eq('telefone', s)
        .single();

      await rodar('E2. com tools, segundo turno', s, 'e desses, quantos sao em Alagoas?', tools, definicoes, data?.openai_thread_id);
    }
  });

  const quebrada = definicoes.map(d => ({ ...d, view_id: 'view_que_nao_existe' }));
  await comContato(s => rodar('F. funcao apontando para view inexistente', s, 'o que vence hoje?', tools, quebrada));

  console.log('\n=============================');
  console.log('passou:', passou, '| falhou:', falhou);
  console.log('=============================');

  process.exit(falhou ? 1 : 0);
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});