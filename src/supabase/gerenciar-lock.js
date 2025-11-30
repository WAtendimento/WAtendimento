const { gerarVariacoesDeTelefone } = require('../utils/gerar-variacoes-telefone');

// ===============================================================
//  Função auxiliar: tenta adquirir lock considerando variações
// ===============================================================
async function tentaAdquirirLock(supabase, identificador, tabela, id_chip) {
  const agora = new Date();
  const timeoutMs = 30000; // 30 segundos
  const limite = new Date(agora.getTime() - timeoutMs);
  
  const telefoneRegex = /^55\d{10,13}$/;

  let variacoes = [identificador];

  // 🔥 Se identificador parece telefone -> gera variações
  if (typeof identificador === "string" && telefoneRegex.test(identificador)) {
    variacoes = gerarVariacoesDeTelefone(identificador);
  }

  // Tenta adquirir lock em TODAS as variações
  for (const variacao of variacoes) {

    const { data, error } = await supabase.rpc("adquirir_lock_id", {
      p_identificador: variacao,
      p_limite: limite.toISOString(),
      p_tabela: tabela,
      p_chip: id_chip,
    });

    if (error) {
      console.error(`[WAt][ERRO] ao chamar adquirir_lock_id para ${variacao}:`, error);
      continue; // tenta próxima variação
    }

    if (data === true) {
      // Lock adquirido! Retorna a variação usada (IMPORTANTE)
      return { ok: true, identificadorLock: variacao };
    }
  }

  // Nenhuma variação conseguiu adquirir lock
  return { ok: false, identificadorLock: null };
}

// ===============================================================
//  Função auxiliar: libera lock considerando variações
// ===============================================================
async function liberaLock(supabase, tabela, identificador, id_chip) {
  const telefoneRegex = /^55\d{10,13}$/;

  let variacoes = [identificador];

  // Se identificador é telefone, libera TODAS AS VARIAÇÕES
  if (typeof identificador === "string" && telefoneRegex.test(identificador)) {
    variacoes = gerarVariacoesDeTelefone(identificador);
  }

  let liberou = false;

  for (const variacao of variacoes) {

    const { error } = await supabase.rpc("liberar_lock_id", {
      p_identificador: variacao,
      p_tabela: tabela,
      p_chip: id_chip,
    });

    if (!error) {
      liberou = true; // pelo menos uma forma liberou
    } else {
      console.error(`[WAt][ERRO] ao chamar liberar_lock_id para ${variacao}:`, error);
    }
  }

  return liberou;
}

module.exports = { tentaAdquirirLock, liberaLock };
