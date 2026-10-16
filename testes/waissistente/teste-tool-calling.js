// Teste local do passo 1 do tool calling.
//
// Roda de dentro do WAtendimento, sem bot e sem front:
//   OPENAI_API_KEY=sk-... node testes/waissistente/teste-tool-calling.js
//
// Checa duas coisas, nessa ordem:
//   1. as funcoes do tenant sao lidas da tabela funcoes_bot
//   2. a Responses API recebe as tools e pede a funcao quando a pergunta pede
//
// Nao executa funcao nenhuma: o passo 1 so registra o pedido.

const { createClient } = require('@supabase/supabase-js');
const { buscarFuncoesBot } = require('../../src/supabase/buscar-funcoes-bot');
const { enviaMensagemResponses } = require('../../src/waissistente/enviar-mensagem-responses');

const TENANT = 'solution_log';
const TABELA_CONTATOS = 'solution_log_contatos';

const supabase = createClient(
  'https://ibeodbugpwcedcgeyzef.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZW9kYnVncHdjZWRjZ2V5emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzMyMTYsImV4cCI6MjA1MTc0OTIxNn0.0RTYv8S9jH3hHKzA4zHY8_oq-rGtC1Z1O8aTh2gI4Tg'
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

// sessao de teste, para nao sujar contato de verdade
const SESSAO = 'teste-tool-' + Date.now();

async function main() {
  if (!APIKEY) {
    console.error('Falta OPENAI_API_KEY no ambiente.');
    process.exit(1);
  }

  console.log('--- 1. lendo funcoes do tenant', TENANT);

  const { tools, definicoes } = await buscarFuncoesBot(supabase, TENANT);

  console.log('funcoes encontradas:', definicoes.length);
  for (const d of definicoes) {
    console.log('  ', d.nome, '-> view', d.view_id);
  }
  console.log('tools montadas:', JSON.stringify(tools, null, 2));

  if (!tools.length) {
    console.error('Nenhuma funcao. Confere a tabela funcoes_bot e o tenant.');
    process.exit(1);
  }

  // o contato precisa existir: enviaMensagemResponses grava o response_id
  await supabase.from(TABELA_CONTATOS).insert({
    id_chip: 99,
    telefone: SESSAO,
    identificador: SESSAO,
    nome_cliente: 'Teste Tool Calling',
  });

  const perguntas = [
    'o que vence hoje?',
    'bom dia',
  ];

  for (const pergunta of perguntas) {
    console.log('\n--- 2. perguntando:', pergunta);

    const r = await enviaMensagemResponses({
      data: {
        mensagem: pergunta,
        nome: 'Livia Furtado',
        dadosFornecidos: '',
        telefoneContato: SESSAO,
        instrucoes: PROMPT,
        modelo: 'gpt-5.4-mini',
        responseIdAnterior: null,
        nomeThread: 'openai_thread_id',
        filtrosAdicionais: { id_chip: 99 },
        apiKey: APIKEY,
        supabase,
        tabela: TABELA_CONTATOS,
        tools,
      },
    });

    console.log('resposta:', JSON.stringify(r, null, 2));
  }

  await supabase.from(TABELA_CONTATOS).delete().eq('telefone', SESSAO);
  console.log('\n--- fim. contato de teste removido.');
}

main().catch(e => {
  console.error('ERRO:', e.message);
  process.exit(1);
});