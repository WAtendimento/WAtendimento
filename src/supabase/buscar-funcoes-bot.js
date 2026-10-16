const { criaLogger } = require('../utils/logger');

/**
 * Le as funcoes que o bot do tenant pode chamar e devolve no formato que a
 * Responses API espera.
 *
 * As funcoes ficam no banco, como os prompts: acrescentar uma e um insert,
 * sem deploy. Tenant sem linha nenhuma devolve lista vazia, e a chamada ao
 * modelo segue como antes.
 */
async function buscarFuncoesBot(supabase, tenant, papeisDoUsuario = null, tabela = 'funcoes_bot') {
  const logger = criaLogger(tenant);

  try {
    const { data, error } = await supabase
      .from(tabela)
      .select('nome, descricao, parametros, view_id, campos, limite, papeis')
      .eq('tenant', tenant)
      .eq('ativo', true);

    if (error) {
      logger.add('>>> [WAt] Falha ao buscar funcoes do bot: ' + error.message);
      return { tools: [], definicoes: [] };
    }

    // papeis nulo ou vazio: funcao liberada para todos, que e o padrao de
    // quem nao usa controle por papel
    const papeis = Array.isArray(papeisDoUsuario) ? papeisDoUsuario : [];

    const definicoes = (data || []).filter(f => {
      if (!Array.isArray(f.papeis) || f.papeis.length === 0) return true;
      return f.papeis.some(p => papeis.includes(p));
    });

    // os nomes, nao a contagem: com so um numero o modelo nao sabe se a
    // pergunta dele e uma das barradas e acaba chutando
    const liberadas = new Set(definicoes.map(f => f.nome));
    const barradas = (data || []).filter(f => !liberadas.has(f.nome)).map(f => f.nome);

    if (barradas.length) logger.add(`>>> [WAt] fora do papel do usuario: ${barradas.join(', ')}`);

    const tools = definicoes.map(f => ({
      type: 'function',
      name: f.nome,
      description: f.descricao,
      parameters: f.parametros,
    }));

    return { tools, definicoes, barradas };
  } catch (e) {
    logger.add('>>> [WAt] Erro ao buscar funcoes do bot: ' + e.message);
    return { tools: [], definicoes: [] };
  }
}

module.exports = { buscarFuncoesBot };