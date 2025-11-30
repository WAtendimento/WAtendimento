const { gerarVariacoesDeTelefone } = require("../utils/gerar-variacoes-telefone");

/**
 * Função genérica para atualizar dados no Supabase com verificação de segurança.
 *
 * @param {string} tabela - Nome da tabela no Supabase.
 * @param {Object} filtros - Pode ser { campo: valor } ou { campo: [operador, valor] }.
 * @param {Object} dadosAtualizados - Objeto com os campos e valores a serem atualizados.
 * @param {boolean} [exibirResultado=false] - Se true, retorna as linhas atualizadas.
 *
 * @returns {Promise<Object>} Resultado da atualização.
 */
async function atualizarNoSupabase(
  supabase,
  tabela,
  filtros,
  dadosAtualizados,
  exibirResultado = false
) {
  if (!tabela || typeof tabela !== "string") {
    throw new Error('O parâmetro "tabela" é obrigatório e deve ser uma string.');
  }

  if (typeof filtros !== "object" || filtros === null || Object.keys(filtros).length === 0) {
    throw new Error('O parâmetro "filtros" deve ser um objeto não vazio.');
  }

  if (typeof dadosAtualizados !== "object" || dadosAtualizados === null || Object.keys(dadosAtualizados).length === 0) {
    throw new Error('O parâmetro "dadosAtualizados" deve ser um objeto não vazio.');
  }

  /** **********************************************************************
   * HELPER: aplica filtros na query
   *************************************************************************/
  const aplicarFiltros = (query, filtrosEntrada) => {
    for (const [campo, bruto] of Object.entries(filtrosEntrada)) {
      if (Array.isArray(bruto)) {
        const [op, val] = bruto;
        switch (op) {
          case '=':   query = query.eq(campo, val); break;
          case '!=':  query = query.neq(campo, val); break;
          case '>':   query = query.gt(campo, val); break;
          case '>=':  query = query.gte(campo, val); break;
          case '<':   query = query.lt(campo, val); break;
          case '<=':  query = query.lte(campo, val); break;
          case 'in':  query = query.in(campo, Array.isArray(val) ? val : [val]); break;
          case 'like':  query = query.like(campo, val); break;
          case 'ilike': query = query.ilike(campo, val); break;
          case 'is':    query = query.is(campo, val); break;
          case 'not':   query = query.not(campo, 'is', val); break;
          default:
            throw new Error(`Operador "${op}" não suportado para o campo "${campo}".`);
        }
      } else {
        query = query.eq(campo, bruto);
      }
    }
    return query;
  };

  const nomeFiltroTelefone = "telefone";

  try {
    let registroEncontrado = null;

    /** **********************************************************************
     * NOVO: Detectamos se identificador parece telefone
     *       para incluir suporte a variações do identificador
     *************************************************************************/
    const telefoneRegex = /^55\d{10,13}$/;

    const temFiltroTelefone = Object.prototype.hasOwnProperty.call(filtros, nomeFiltroTelefone);

    // valor simples ou ['=', valor]
    const extrairValor = (v) => Array.isArray(v) ? v[1] : v;

    const identificadorPodeSerTelefone =
      filtros.identificador &&
      typeof extrairValor(filtros.identificador) === "string" &&
      telefoneRegex.test(extrairValor(filtros.identificador));

    const modoVariacao = temFiltroTelefone || identificadorPodeSerTelefone;

    /** **********************************************************************
     * 1) Se NÃO é modo variação → busca direta
     *************************************************************************/
    if (!modoVariacao) {
      let consultaDireta = supabase.from(tabela).select("*");
      consultaDireta = aplicarFiltros(consultaDireta, filtros);

      const { data: registrosDiretos, error: erroConsultaDireta } = await consultaDireta;
      if (erroConsultaDireta) {
        throw new Error(`Erro ao verificar filtros no Supabase: ${erroConsultaDireta.message}`);
      }

      if (registrosDiretos && registrosDiretos.length > 0) {
        let query = supabase.from(tabela).update(dadosAtualizados);
        query = aplicarFiltros(query, filtros);
        if (exibirResultado) query = query.select("*");

        const { data: dataAtualizada, error: erroAtualizacao } = await query;
        if (erroAtualizacao) {
          throw new Error(`Erro ao atualizar dados no Supabase: ${erroAtualizacao.message}`);
        }

        return exibirResultado
          ? { data: dataAtualizada, updated: dataAtualizada?.length ?? 0 }
          : { message: "Dados atualizados com sucesso!", updated: dataAtualizada?.length ?? 0 };
      }

      return { message: "Nenhum registro encontrado para atualizar.", updated: 0 };
    }

    /** **********************************************************************
     * 2) MODO COM VARIAÇÕES (telefone OU identificador que é telefone)
     *************************************************************************/

    // Determina origem do valor
    const brutoTel = temFiltroTelefone
      ? filtros[nomeFiltroTelefone]
      : filtros.identificador;

    const telefoneOriginal = extrairValor(brutoTel);

    if (!telefoneRegex.test(telefoneOriginal)) {
      console.log(">>> Valor não parece telefone (provavelmente é um LID). Pulando geração de variações...");
    } else {
      const variacoes = gerarVariacoesDeTelefone(telefoneOriginal);

      for (const variacaoTelefone of variacoes) {
        // campo que varia: se filtro original era telefone → usa telefone
        // se filtro original era identificador → varia identificador
        const campoVariavel = temFiltroTelefone ? nomeFiltroTelefone : "identificador";

        let consulta = supabase
          .from(tabela)
          .select("*")
          .eq(campoVariavel, variacaoTelefone);

        // aplica os demais filtros
        const filtrosRestantes = { ...filtros };
        delete filtrosRestantes[campoVariavel];
        consulta = aplicarFiltros(consulta, filtrosRestantes);

        const { data: registros, error: erroConsulta } = await consulta;

        if (erroConsulta) {
          console.error(`Erro ao verificar filtros: ${erroConsulta.message}`);
          throw new Error(`Erro ao verificar filtros no Supabase: ${erroConsulta.message}`);
        }

        if (registros && registros.length > 0) {
          registroEncontrado = { campoVariavel, variacaoTelefone };
          break;
        }
      }
    }

    if (!registroEncontrado) {
      throw new Error("Nenhum registro encontrado com as variações de telefone.");
    }

    /** **********************************************************************
     * 3) Atualizar com a variação correta encontrada
     *************************************************************************/
    let query = supabase
      .from(tabela)
      .update(dadosAtualizados)
      .eq(registroEncontrado.campoVariavel, registroEncontrado.variacaoTelefone);

    const filtrosRestantes = { ...filtros };
    delete filtrosRestantes[registroEncontrado.campoVariavel];
    query = aplicarFiltros(query, filtrosRestantes);

    if (exibirResultado) query = query.select("*");

    const { data, error } = await query;
    if (error) {
      console.error(`Erro ao atualizar dados no Supabase: ${error.message}`);
      throw new Error(`Erro ao atualizar dados no Supabase: ${error.message}`);
    }

    return exibirResultado
      ? { data, updated: data?.length ?? 0 }
      : { message: "Dados atualizados com sucesso!", updated: data?.length ?? 0 };

  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

module.exports = { atualizarNoSupabase };
