const { criaLogger } = require('../utils/logger');

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
async function executarFuncao({ nome, argumentos, definicoes, supabaseLevops, contextoUsuario, telefoneContato }) {
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

    return { linhas: recortadas, total: recortadas.length };
  } catch (e) {
    logger.add(`>>> [WAt] Erro ao executar ${nome}: ${e.message}`);
    return { erro: e.message };
  }
}

module.exports = { executarFuncao };