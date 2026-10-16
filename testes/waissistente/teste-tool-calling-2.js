// Teste local do passo 2 do tool calling.
//
//   OPENAI_API_KEY=sk-... LEVOPS_SERVICE_KEY=eyJ... node testes/waissistente/teste-tool-calling-2.js
//
// Roda tres casos, nessa ordem:
//   A. REGRESSAO: chamada sem tools, igual ao que existia antes. Tem que
//      responder normalmente, sem nenhum log de funcao.
//   B. NOVO, pergunta que nao pede dado: com tools declaradas, o modelo nao
//      deve chamar funcao nenhuma.
//   C. NOVO, pergunta que pede dado: o modelo chama a funcao, o pacote roda a
//      view e o modelo responde com o dado.

const { createClient } = require('@supabase/supabase-js');
const { buscarFuncoesBot } = require('../../src/supabase/buscar-funcoes-bot');
const { enviaMensagemResponses } = require('../../src/waissistente/enviar-mensagem-responses');

const TENANT = 'solution_log';
const TABELA_CONTATOS = 'solution_log_contatos';

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
Quando tiver dado em maos, responda com ele. Sem dado, diga o que sabe.
</papel>

<formato_de_saida>
  Responda exclusivamente com um objeto JSON valido, sem markdown.
  {"respostaBot":"","resumo":"","resumoConversa":"","encaminhar":false,"temas":[]}
  NUNCA use aspas duplas dentro do texto. Use aspas simples.
</formato_de_saida>`;

const USUARIO = { email: 'livia@leev.cc', nome: 'Livia Furtado', caseId: 'USR-livia' };

async function pergunta({ texto, sessao, tools, definicoes }) {
  return enviaMensagemResponses({
    data: {
      mensagem: texto,
      nome: USUARIO.nome,
      dadosFornecidos: '',
      telefoneContato: sessao,
      instrucoes: PROMPT,
      modelo: 'gpt-5.4-mini',
      responseIdAnterior: null,
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

async function criarContato(sessao) {
  await supabase.from(TABELA_CONTATOS).insert({
    id_chip: 99,
    telefone: sessao,
    identificador: sessao,
    nome_cliente: 'Teste Tool Calling',
  });
}

async function apagarContato(sessao) {
  await supabase.from(TABELA_CONTATOS).delete().eq('telefone', sessao);
}

async function main() {
  if (!APIKEY) { console.error('Falta OPENAI_API_KEY.'); process.exit(1); }
  if (!process.env.LEVOPS_SERVICE_KEY) { console.error('Falta LEVOPS_SERVICE_KEY.'); process.exit(1); }

  const { tools, definicoes } = await buscarFuncoesBot(supabase, TENANT);
  console.log('funcoes carregadas:', definicoes.map(d => d.nome).join(', ') || 'nenhuma');
  console.log('recorte de campos:', JSON.stringify(definicoes[0]?.campos));
  console.log('limite:', definicoes[0]?.limite);

  const casos = [
    { rotulo: 'A. REGRESSAO sem tools', texto: 'bom dia', comTools: false },
    { rotulo: 'B. com tools, sem pedir dado', texto: 'bom dia', comTools: true },
    { rotulo: 'C. com tools, pedindo dado', texto: 'o que vence hoje?', comTools: true },
  ];

  for (const caso of casos) {
    const sessao = 'teste-p2-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    await criarContato(sessao);

    console.log('\n=============================');
    console.log(caso.rotulo, '|', caso.texto);
    console.log('=============================');

    const inicio = Date.now();

    try {
      const r = await pergunta({
        texto: caso.texto,
        sessao,
        tools: caso.comTools ? tools : undefined,
        definicoes: caso.comTools ? definicoes : undefined,
      });

      console.log('tempo:', ((Date.now() - inicio) / 1000).toFixed(1) + 's');
      console.log('respostaBot:', r?.respostaBot);
      console.log('json completo:', JSON.stringify(r, null, 2));
    } catch (e) {
      console.error('FALHOU:', e.message);
    }

    await apagarContato(sessao);
  }

  console.log('\n--- fim ---');
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});