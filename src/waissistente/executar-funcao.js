const { criaLogger } = require('../utils/logger');

/**
 * Acha os nomes parecidos com o que a pessoa escreveu.
 *
 * Sem isto, erro de digitacao vira lista vazia, e a pessoa entende que nao
 * existe registro quando o que houve foi o filtro nao bater.
 */
function parecidos(alvo, valores) {
  const limpa = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  const a = limpa(alvo);
  if (!a) return [];

  const pedacos = a.split(' ').filter(p => p.length >= 3);

  const pontos = valores.map(v => {
    const b = limpa(v);
    let p = 0;
    if (b.includes(a) || a.includes(b)) p += 10;
    for (const pe of pedacos) if (b.includes(pe)) p += 3;
    // comeco igual ajuda quando a pessoa escreveu so o comeco do nome
    if (b.startsWith(a.slice(0, 4))) p += 2;
    return { v, p };
  });

  return pontos.filter(x => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 5).map(x => x.v);
}

/**
 * Le os valores de um campo do evento, para sugerir quando a busca falha.
 */
async function lerValores(sugestao, supabaseLevops, tenantLevops) {
  if (!sugestao?.evento || !sugestao?.campo_valor || !supabaseLevops) return [];

  const { data } = await supabaseLevops
    .from('events')
    .select('dados')
    .eq('tenant_id', tenantLevops)
    .eq('evento', sugestao.evento);

  return [...new Set((data || []).map(l => l.dados?.[sugestao.campo_valor]).filter(Boolean))];
}

/**
 * Roda a view do LevOps que a funcao aponta e devolve as linhas ao modelo.
 *
 * Os argumentos vem do modelo e nao sao confiaveis: o que identifica a
 * pessoa entra pelo contexto, sempre depois do spread, de modo que um
 * argumento com o mesmo nome e sobrescrito.
 *
 * A view ja filtra por tenant_id dentro do SQL. O recorte de campos e o
 * limite vem do cadastro da funcao, nao do modelo.
 */
async function executarFuncao({ nome, argumentos, definicoes, supabaseLevops, tenantLevops, contextoUsuario, telefoneContato }) {
  const logger = criaLogger(telefoneContato);

  const def = (definicoes || []).find(f => f.nome === nome);
  if (!def) return { erro: 'funcao desconhecida' };
  if (!def.view_id) return { erro: 'funcao sem view' };

  // a RPC troca :chave so pelas chaves presentes. Parametro declarado e nao
  // enviado pelo modelo deixa o :nome literal no SQL e quebra a view.
  const declarados = Object.keys(def.parametros?.properties || {});
  const vazios = {};
  for (const p of declarados) vazios[p] = '';

  const params = {
    ...vazios,
    ...(argumentos || {}),
    email_usuario: contextoUsuario?.email || null,
    case_id_usuario: contextoUsuario?.caseId || null,
  };

  try {
    const { data, error } = await supabaseLevops.rpc('executar_view', {
      p_id: def.view_id,
      p_params: params,
    });

    if (error) {
      logger.add(`>>> [WAt] Funcao ${nome} falhou: ${error.message}`);
      return { erro: error.message };
    }

    const linhas = (data || []).map(l => l.dados || l);

    const recortadas = Array.isArray(def.campos) && def.campos.length
      ? linhas.map(l => {
          const o = {};
          for (const c of def.campos) if (l[c] !== undefined) o[c] = l[c];
          return o;
        })
      : linhas;

    const teto = def.limite || 30;

    // lista grande demais para caber na resposta: em vez de cortar e mentir
    // o total, devolve a contagem e pede o recorte a pessoa
    if (recortadas.length > teto) {
      logger.add(`>>> [WAt] Funcao ${nome} devolveu ${recortadas.length} linha(s): pedindo recorte`);

      return {
        total: recortadas.length,
        linhas: [],
        precisa_recorte: true,
        campos_disponiveis: def.campos || [],
        instrucao: 'Sao muitos registros para listar. Diga o total a pessoa e peca um recorte usando um dos campos disponiveis.',
      };
    }

    logger.add(`>>> [WAt] Funcao ${nome} devolveu ${recortadas.length} linha(s)`);

    // nada encontrado com um filtro de texto preenchido: pode ser erro de
    // escrita, entao devolve os nomes parecidos em vez de so dizer zero
    if (recortadas.length === 0 && def.sugestoes) {
      for (const [filtro, sugestao] of Object.entries(def.sugestoes)) {
        const escrito = (argumentos || {})[filtro];
        if (!escrito) continue;

        const valores = await lerValores(sugestao, supabaseLevops, tenantLevops);
        const achados = parecidos(escrito, valores);
        if (!achados.length) continue;

        logger.add(`>>> [WAt] Sugestoes para ${filtro}="${escrito}": ${achados.join(', ')}`);

        return {
          linhas: [],
          total: 0,
          nao_encontrado: escrito,
          sugestoes: achados,
          instrucao: `Nada foi encontrado para "${escrito}". Pergunte a pessoa se ela quis dizer um dos nomes da lista sugestoes, e consulte de novo com o nome escolhido.`,
        };
      }
    }

    return { linhas: recortadas, total: recortadas.length };
  } catch (e) {
    logger.add(`>>> [WAt] Erro ao executar ${nome}: ${e.message}`);
    return { erro: e.message };
  }
}

module.exports = { executarFuncao };