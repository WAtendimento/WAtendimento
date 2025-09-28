
// teste-lock.js
const { createClient } = require('@supabase/supabase-js');
const { tentaAdquirirLock, liberaLock } = require('../../src/supabase/gerenciar-lock'); // ajuste o caminho se necessário
const { delay } = require('@watendimento/watendimento');


// credenciais (troque pelos dados reais)
const credenciaisSupabase = {
  table_data: {
    url: "https://ibeodbugpwcedcgeyzef.supabase.co", // URL do seu projeto Supabase
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZW9kYnVncHdjZWRjZ2V5emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzMyMTYsImV4cCI6MjA1MTc0OTIxNn0.0RTYv8S9jH3hHKzA4zHY8_oq-rGtC1Z1O8aTh2gI4Tg", // Token do Supabase
    table_contatos: "maxplural_contatos", // Nome da tabela de contatos
    table_chips: "maxplural_chips", // Nome da tabela de chips //
    table_pontos: "maxplural_pontos", // Nome da tabela de pontos
    table_pontuacao_corretor: "maxplural_pontuacao_corretor", // Nome da tabela de pontuação do corretor
    table_metas: "maxplural_metas", // Nome da tabela de metas
    table_atividades: "maxplural_valores_atividades", // Nome da tabela de atividades
  },
};


const supabase = createClient(credenciaisSupabase.table_data.url, 
    credenciaisSupabase.table_data.token);


// (async () => {
//   const tabela = 'maxplural_contatos';
//   const telefone = '558188961959';
//   const id_chip = '1';

//   console.log('[WAt] --- Iniciando teste de lock ---');

//   console.log('[WAt] Tentando adquirir lock...');
//   const lockOk = await tentaAdquirirLock(supabase, telefone, tabela, id_chip);
//   console.log('[WAt] Resultado adquirir lock:', lockOk);

//   if (lockOk) {
//     console.log('[WAt] Lock adquirido com sucesso!');
//     console.log('[WAt] Agora testando liberar lock...');

//     const liberaOk = await liberaLock(supabase, tabela, telefone, id_chip);
//     console.log('[WAt] Resultado liberar lock:', liberaOk);

//     if (liberaOk) {
//       console.log('[WAt] Lock liberado com sucesso!');
//     } else {
//       console.log('[WAt] Falha ao liberar lock.');
//     }
//   } else {
//     console.log('[WAt] Não conseguiu adquirir lock. Talvez já esteja em uso.');
//   }

//   console.log('[WAt] --- Fim do teste ---');
// })();


async function testeLocks() {
  const telefoneTeste = "81988961959"; // coloque aqui um telefone que exista na tabela
  const tabela = "maxplural_contatos";       // exemplo de tabela
  const id_chip = 1;                     // id_chip de teste

  console.log("[WAt] === [TESTE LOCKS] ===");
  //console.log("[WAt] Telefone base:", telefoneTeste);
  //console.log("[WAt] Variações geradas:", gerarVariacoesDeTelefone(telefoneTeste));

  console.log("\n[WAt] 🔒 Testando adquirir lock...");
  const lockOk = await tentaAdquirirLock(supabase, telefoneTeste, tabela, id_chip);
  console.log("[WAt] Resultado final adquirir lock:", lockOk);

  delay(2000); // espera 2 segundos

  console.log("\n[WAt] 🔓 Testando liberar lock...");
  const liberaOk = await liberaLock(supabase, tabela, telefoneTeste, id_chip);
  console.log("[WAt] Resultado final liberar lock:", liberaOk);

  console.log("[WAt] === [FIM TESTE LOCKS] ===");
}

testeLocks().catch(console.error);