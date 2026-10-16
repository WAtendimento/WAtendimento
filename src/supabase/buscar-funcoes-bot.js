const { criaLogger } = require('../utils/logger');

// os valores de um filtro mudam pouco, e buscar a cada mensagem custa uma ida
// ao banco antes de qualquer resposta: guarda por uma hora
const cacheDominios = new Map();
const VALIDADE_MS = 60 * 60 * 1000;

/**
 * Le os valores validos de um filtro, do evento que o dominio aponta.
 */
async function lerDominio(tenant, filtro, dominio, supabaseLevops, tenantLevops, logger) {
  if (Array.isArray(dominio?.valores)) return dominio.valores;
  if (!dominio?.evento || !dominio?.campo_valor || !supabaseLevops) return null;

  const chave = `${tenant}|${filtro}|${dominio.evento}`;
  const guardado = cacheDominios.get(chave);
  if (guardado && Date.now() - guardado.quando < VALIDADE_MS) return guardado.valores;

  const { data, error } = await supabaseLevops
    .from('events')
    .select('dados')
    .eq('tenant_id', tenantLevops)
    .eq('evento', dominio.evento);

  if (error) {
    logger.add(`>>> [WAt] Falha ao ler o dominio de ${filtro}: ${error.message}`);
    return null;
  }

  const valores = [...new Set(
    (data || []).map(l => l.dados?.[dominio.campo_valor]).filter(Boolean)
  )].sort();

  cacheDominios.set(chave, { valores, quando: Date.now() });
  logger.add(`>>> [WAt] Dominio de ${filtro}: ${valores.length} valores`);
  return valores;
}

/**
 * Le as funcoes que o bot do tenant pode chamar e devolve no formato que a
 * Responses API espera.
 *
 * As funcoes ficam no banco, como os prompts: acrescentar uma e um insert,
 * sem deploy. Tenant sem linha nenhuma devolve lista vazia, e a chamada ao
 * modelo segue como antes.
 */
async function buscarFuncoesBot(supabase, tenant, papeisDoUsuario = null, supabaseLevops = null, tenantLevops = null, tabela = 'funcoes_bot') {
  const logger = criaLogger(tenant);

  try {
    const { data, error } = await supabase
      .from(tabela)
      .select('nome, descricao, parametros, view_id, campos, limite, papeis, dominios')
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

    // os valores validos de um filtro entram na descricao do parametro: sem
    // isso o modelo manda "Caruaru" onde a view espera "CAR", e a consulta
    // devolve zero sem avisar que o filtro nao bateu
    const tools = [];
    for (const f of definicoes) {
      const parametros = JSON.parse(JSON.stringify(f.parametros || {}));

      for (const [filtro, dominio] of Object.entries(f.dominios || {})) {
        const prop = parametros?.properties?.[filtro];
        if (!prop) continue;

        const valores = await lerDominio(tenant, filtro, dominio, supabaseLevops, tenantLevops, logger);
        if (!valores?.length) continue;

        // a frase vem do banco: cada tenant diz como quer instruir o modelo
        const modelo = f.texto_dominio || 'Valores aceitos: {valores}.';
        prop.description = (prop.description || ' ') + ' ' +
          modelo.replace('{valores}', valores.join(', '));
      }

      tools.push({
        type: 'function',
        name: f.nome,
        description: f.descricao,
        parameters: parametros,
      });
    }

    return { tools, definicoes, barradas };
  } catch (e) {
    logger.add('>>> [WAt] Erro ao buscar funcoes do bot: ' + e.message);
    return { tools: [], definicoes: [] };
  }
}

function limparCacheDominios(tenant = null) {
  if (tenant === null) cacheDominios.clear();
  else for (const k of [...cacheDominios.keys()]) if (k.startsWith(tenant + '|')) cacheDominios.delete(k);
}

module.exports = { buscarFuncoesBot, limparCacheDominios };