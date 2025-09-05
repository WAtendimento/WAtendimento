const { gerarVariacoesDeTelefone } = require('../utils/gerar-variacoes-telefone');

// Função auxiliar: tenta adquirir lock via função SQL atômica
async function tentaAdquirirLock(supabase, telefoneContato, tabela, id_chip) {
  const agora = new Date();
  const timeoutMs = 30000; // 30 segundos
  const limite = new Date(agora.getTime() - timeoutMs);

  const variacoes = gerarVariacoesDeTelefone(telefoneContato);
  // console.log(`[WAt] Variacoes de telefone para lock:`, variacoes);

  for (const tel of variacoes) {
    // console.log(`[WAt] Tentando adquirir lock para ${tel}`);

    const { data, error } = await supabase.rpc("adquirir_lock", {
      p_telefone: tel,
      p_limite: limite.toISOString(),
      p_tabela: tabela,
      p_chip: id_chip,
    });

    // console.log(`Resultado adquirir_lock (${tel}):`, data);

    if (error) {
      console.error(`[WAt][ERRO] ao chamar adquirir_lock para ${tel}:`, error);
      continue; // tenta a próxima variação
    }

    if (data === true) {
      // console.log(`[WAt] Lock adquirido com sucesso para ${tel}`);
      return true;
    }
  }

  // console.log(`[WAt] Nenhuma variação conseguiu adquirir lock`);
  return false;
}

// Função auxiliar: libera lock via update direto
async function liberaLock(supabase, tabela, telefoneContato, id_chip) {
  const variacoes = gerarVariacoesDeTelefone(telefoneContato);
  // console.log(`[WAt] Variacoes de telefone para liberar:`, variacoes);

  for (const tel of variacoes) {
    // console.log(`[WAt] Tentando liberar lock para ${tel}`);

    const { data, error } = await supabase.rpc("liberar_lock", {
      p_telefone: tel,
      p_tabela: tabela,
      p_chip: id_chip,
    });

    if (error) {
      console.error(`[WAt][ERRO] ao chamar liberar_lock para ${tel}:`, error);
      return false; // tenta a próxima variação
    }

  }

  // console.log(`Resultado liberar_lock:`, true);
  return true;
}

module.exports = { tentaAdquirirLock, liberaLock };
