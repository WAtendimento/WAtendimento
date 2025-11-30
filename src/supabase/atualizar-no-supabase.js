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

  // Helper: aplica um mapa de filtros a uma query Supabase
  const aplicarFiltros = (query, filtrosEntrada) => {
    for (const [campo, bruto] of Object.entries(filtrosEntrada)) {
      // Aceita valor simples (eq) ou [operador, valor]
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
          case 'like':  query = query.like(campo, val); break;   // passe com % se precisar
          case 'ilike': query = query.ilike(campo, val); break;   // passe com % se precisar
          case 'is':    query = query.is(campo, val); break;      // null / true / false
          case 'not':   // padrão: .not(col, 'is', val)
            query = query.not(campo, 'is', val);
            break;
          default:
            throw new Error(`Operador "${op}" não suportado para o campo "${campo}".`);
        }
      } else {
        // valor simples => igualdade exata
        query = query.eq(campo, bruto);
      }
    }
    return query;
  };

  const nomeFiltroTelefone = "telefone";

  try {
    let registroEncontrado = null;

    // 1) Tenta busca direta (sem variações) se não há filtro por telefone
    if (!Object.prototype.hasOwnProperty.call(filtros, nomeFiltroTelefone)) {
      let consultaDireta = supabase.from(tabela).select("*");
      consultaDireta = aplicarFiltros(consultaDireta, filtros);

      const { data: registrosDiretos, error: erroConsultaDireta } = await consultaDireta;
      if (erroConsultaDireta) {
        throw new Error(`Erro ao verificar filtros no Supabase: ${erroConsultaDireta.message}`);
      }

      if (registrosDiretos && registrosDiretos.length > 0) {
        // Atualiza de imediato com os mesmos filtros
        let query = supabase.from(tabela).update(dadosAtualizados);
        query = aplicarFiltros(query, filtros);
        if (exibirResultado) query = query.select("*");

        const { data: dataAtualizada, error: erroAtualizacao } = await query;
        if (erroAtualizacao) {
          throw new Error(`Erro ao atualizar dados no Supabase: ${erroAtualizacao.message}`);
        }

        return exibirResultado
          ? { data: dataAtualizada, updated: Array.isArray(dataAtualizada) ? dataAtualizada.length : 0 }
          : { message: "Dados atualizados com sucesso!", updated: Array.isArray(dataAtualizada) ? dataAtualizada.length : 0 };
      }

      return { message: "Nenhum registro encontrado para atualizar.", updated: 0 };
    }

    // 2) Há filtro de telefone -> tentar variações
    // Extrai o "valor" do telefone, seja de ['=', valor] ou valor simples
    const brutoTel = filtros[nomeFiltroTelefone];
    const telefoneOriginal = Array.isArray(brutoTel) ? brutoTel[1] : brutoTel;

    const regexTelefone = /^55\d{10,13}$/;
    if (!regexTelefone.test(telefoneOriginal)) {
      console.log(">>> Valor não parece telefone (provavelmente é um LID). Pulando geração de variações...");
    } else {
      const variacoes = gerarVariacoesDeTelefone(telefoneOriginal);

      // Testa cada variação: (telefone = variacao) + demais filtros
      for (const variacaoTelefone of variacoes) {
        let consultaComVariacao = supabase.from(tabela).select("*").eq(nomeFiltroTelefone, variacaoTelefone);

        // Aplica os demais filtros (exceto telefone, que já fixamos acima)
        const filtrosRestantes = { ...filtros };
        delete filtrosRestantes[nomeFiltroTelefone];
        consultaComVariacao = aplicarFiltros(consultaComVariacao, filtrosRestantes);

        const { data: registros, error: erroConsulta } = await consultaComVariacao;
        if (erroConsulta) {
          console.error(`Erro ao verificar filtros: ${erroConsulta.message}`);
          throw new Error(`Erro ao verificar filtros no Supabase: ${erroConsulta.message}`);
        }

        if (registros && registros.length > 0) {
          registroEncontrado = { variacaoTelefone };
          break;
        }
      }
    }

    if (!registroEncontrado) {
      throw new Error("Nenhum registro encontrado com as variações de telefone.");
    }

    // 3) Atualiza usando a variação que casou
    let query = supabase.from(tabela).update(dadosAtualizados).eq(nomeFiltroTelefone, registroEncontrado.variacaoTelefone);
    const filtrosRestantes = { ...filtros };
    delete filtrosRestantes[nomeFiltroTelefone];
    query = aplicarFiltros(query, filtrosRestantes);

    if (exibirResultado) query = query.select("*");

    const { data, error } = await query;
    if (error) {
      console.error(`Erro ao atualizar dados no Supabase: ${error.message}`);
      throw new Error(`Erro ao atualizar dados no Supabase: ${error.message}`);
    }

    return exibirResultado
      ? { data, updated: Array.isArray(data) ? data.length : 0 }
      : { message: "Dados atualizados com sucesso!", updated: Array.isArray(data) ? data.length : 0 };

  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

module.exports = { atualizarNoSupabase };
