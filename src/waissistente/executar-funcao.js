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
 * Le os valores validos de um filtro, para conferir se o que o modelo
 * mandou existe de verdade.
 */
async function lerValores(dominio, supabaseLevops, tenantLevops) {
  if (!dominio?.evento || !dominio?.campo_valor || !supabaseLevops) return [];

  const { data } = await supabaseLevops
    .from('events')
    .select('dados')
    .eq('tenant_id', tenantLevops)
    .eq('evento', dominio.evento);

  return [...new Set((data || []).map(l => l.dados?.[dominio.campo_valor]).filter(Boolean))];
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

  if (!def) {
    return {
      tipo_do_erro: 'FUNCAO_DESCONHECIDA',
      o_que_aconteceu: `Nao existe consulta chamada ${nome}.`,
      proxima_acao: 'Escolha uma das consultas disponiveis nesta chamada. Nao invente nome de consulta.',
      nao_pergunte: true,
    };
  }

  if (!def.view_id) {
    return {
      tipo_do_erro: 'CONSULTA_SEM_VIEW',
      o_que_aconteceu: `A consulta ${nome} esta cadastrada sem origem de dados.`,
      proxima_acao: 'Responda: Nao consegui consultar agora.',
      nao_pergunte: true,
    };
  }

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

      return {
        tipo_do_erro: 'CONSULTA_FALHOU',
        o_que_aconteceu: error.message,
        proxima_acao: 'Responda: Nao consegui consultar agora. Nao tente outra funcao para substituir esta.',
        nao_pergunte: true,
      };
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

      const filtrosLivres = Object.keys(def.parametros?.properties || {})
        .filter(p => !(argumentos || {})[p]);

      return {
        tipo_do_erro: 'RESULTADO_GRANDE_DEMAIS',
        total: recortadas.length,
        o_que_aconteceu: `A consulta devolveu ${recortadas.length} registros, acima do limite de ${teto}.`,
        proxima_acao: `Diga o total a pessoa e ofereca um recorte por: ${filtrosLivres.join(', ') || 'nenhum filtro disponivel'}.`,
        filtros_disponiveis: filtrosLivres,
        nao_pergunte: false,
      };
    }

    logger.add(`>>> [WAt] Funcao ${nome} devolveu ${recortadas.length} linha(s)`);

    // vazio com filtro que nao existe no dominio e erro de escrita, nao
    // ausencia de registro: avisa qual valor nao bate, para ele corrigir.
    // Com o valor valido, o vazio e a resposta certa e segue adiante.
    if (recortadas.length === 0 && def.instrucoes?.dominios) {
      for (const [filtro, dominio] of Object.entries(def.instrucoes.dominios)) {
        const escrito = (argumentos || {})[filtro];
        if (!escrito) continue;

        const valores = Array.isArray(dominio?.valores)
          ? dominio.valores
          : await lerValores(dominio, supabaseLevops, tenantLevops);

        if (!valores.length) continue;

        // o valor pode vir como "CAR (Caruaru)": compara so o codigo
        const codigos = valores.map(v => String(v).split(' (')[0].toUpperCase());
        if (codigos.includes(String(escrito).toUpperCase())) continue;

        logger.add(`>>> [WAt] Valor fora do dominio: ${filtro}="${escrito}"`);

        return {
          tipo_do_erro: 'FILTRO_INVALIDO',
          filtro,
          valor_enviado: escrito,
          o_que_aconteceu: `O valor "${escrito}" nao existe no filtro ${filtro}, por isso a consulta voltou vazia.`,
          proxima_acao: `Escolha um valor da lista valores_aceitos e consulte de novo. Nao diga a pessoa que nao ha registros.`,
          valores_aceitos: valores,
          nao_pergunte: true,
        };
      }
    }

    // vazio de verdade: a pessoa precisa saber que nao ha registro
    if (recortadas.length === 0) {
      return {
        linhas: [],
        total: 0,
        o_que_aconteceu: 'A consulta rodou e nao encontrou nenhum registro com esses filtros.',
        proxima_acao: 'Diga a pessoa que nao ha registros. Nao tente outra funcao nem outro filtro por conta propria.',
        filtros_usados: argumentos || {},
      };
    }

    // o que o cadastro quiser dizer ao modelo sobre este resultado vai junto.
    // dominios e texto_dominio ficam de fora: sao para montar a tool, nao
    // para a resposta
    const { dominios: _d, texto_dominio: _t, ...paraOModelo } = def.instrucoes || {};

    return {
      linhas: recortadas,
      total: recortadas.length,
      filtros_usados: argumentos || {},
      ...paraOModelo,
    };
  } catch (e) {
    logger.add(`>>> [WAt] Erro ao executar ${nome}: ${e.message}`);

    return {
      tipo_do_erro: 'CONSULTA_FALHOU',
      o_que_aconteceu: e.message,
      proxima_acao: 'Responda: Nao consegui consultar agora. Nao tente outra funcao para substituir esta.',
      nao_pergunte: true,
    };
  }
}

module.exports = { executarFuncao };