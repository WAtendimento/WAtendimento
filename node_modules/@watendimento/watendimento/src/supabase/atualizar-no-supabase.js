const gerarVariacoesDeTelefone = require("../utils/gerar-variacoes-telefone");

/**
 * Função genérica para atualizar dados no Supabase com verificação de segurança.
 *
 * @param {string} tabela - Nome da tabela no Supabase.
 * @param {Object} filtros - Objeto contendo os campos e valores para filtrar registros.
 * @param {Object} dadosAtualizados - Objeto com os campos e valores a serem atualizados.
 * @param {boolean} [exibirResultado=false] - Flag para ativar/desativar o retorno do .select.
 *
 * @returns {Promise<Object>} Resultado da atualização ou mensagem de sucesso.
 */
async function atualizarNoSupabase(
  supabase,
  tabela,
  filtros,
  dadosAtualizados,
  exibirResultado = false
) {
  if (!tabela || typeof tabela !== "string") {
    throw new Error(
      'O parâmetro "tabela" é obrigatório e deve ser uma string.'
    );
  }

  if (
    typeof filtros !== "object" ||
    filtros === null ||
    Object.keys(filtros).length === 0
  ) {
    throw new Error('O parâmetro "filtros" deve ser um objeto não vazio.');
  }

  if (
    typeof dadosAtualizados !== "object" ||
    dadosAtualizados === null ||
    Object.keys(dadosAtualizados).length === 0
  ) {
    throw new Error(
      'O parâmetro "dadosAtualizados" deve ser um objeto não vazio.'
    );
  }

  const nomeFiltroTelefone = "telefone";

  try {
    let registroEncontrado = null;

    // Verificação para busca direta, caso telefone não esteja presente no filtro
    if (!filtros[nomeFiltroTelefone]) {
      let consultaDireta = supabase.from(tabela).select("*");
      Object.entries(filtros).forEach(([campo, valor]) => {
        consultaDireta = consultaDireta.eq(campo, valor);
      });

      const { data: registrosDiretos, error: erroConsultaDireta } =
        await consultaDireta;

      if (erroConsultaDireta) {
        throw new Error(
          `Erro ao verificar filtros no Supabase: ${erroConsultaDireta.message}`
        );
      }

      if (registrosDiretos && registrosDiretos.length > 0) {
        // Atualiza o registro encontrado

        let query = supabase.from(tabela).update(dadosAtualizados);

        Object.entries(filtros).forEach(([campo, valor]) => {
          query = query.eq(campo, valor);
        });

        if (exibirResultado) {
          query = query.select();
        }

        const { data: dataAtualizada, error: erroAtualizacao } = await query;

        if (erroAtualizacao) {
          throw new Error(
            `Erro ao atualizar dados no Supabase: ${erroAtualizacao.message}`
          );
        }

        return dataAtualizada || { message: "Dados atualizados com sucesso!" };
      } else {
        console.log(">>> Nenhum registro encontrado para atualizar.");
      }

      return { message: "Nenhum registro encontrado para atualizar." };
    }

    if (filtros[nomeFiltroTelefone]) {
      const telefoneOriginal = filtros[nomeFiltroTelefone];
      const variacoes = gerarVariacoesDeTelefone(telefoneOriginal);
      // Usando um for para testar cada variação individualmente
      for (const variacaoTelefone of variacoes) {
        // Crie uma nova consulta para cada iteração
        let consultaComVariacao = supabase
          .from(tabela)
          .select("*")
          .eq(nomeFiltroTelefone, variacaoTelefone);

        Object.entries(filtros).forEach(([campo, valor]) => {
          if (campo !== nomeFiltroTelefone) {
            consultaComVariacao = consultaComVariacao.eq(campo, valor);
          }
        });

        const { data: registros, error: erroConsulta } =
          await consultaComVariacao;

        if (erroConsulta) {
          console.error(`Erro ao verificar filtros: ${erroConsulta.message}`);
          throw erroConsulta;
        }

        if (registros && registros.length > 0) {
          registroEncontrado = registros[0];

          // Atualiza o filtro de telefone para usar a variação encontrada
          filtros[nomeFiltroTelefone] = variacaoTelefone;
          // console.log(
          //   "Variação de telefone encontrada na tabela",
          //   filtros[nomeFiltroTelefone]
          // );
          break; // Sai do loop após encontrar o registro
        }
      }
    }

    // Verifica se encontrou algum registro após testar todas as variações
    if (!registroEncontrado) {
      throw new Error(
        "Nenhum registro encontrado com as variações de telefone."
      );
    }

    // Atualiza o registro encontrado

    let query = supabase.from(tabela).update(dadosAtualizados);

    // Aplica os filtros ao atualizar, incluindo os filtros do telefone
    Object.entries(filtros).forEach(([campo, valor]) => {
      query = query.eq(campo, valor);
    });

    // Log antes de executar a consulta

    if (exibirResultado) {
      query = query.select(); // Inclui o retorno dos registros atualizados, se solicitado
    }

    // Executa a consulta
    const { data, error } = await query;

    if (error) {
      console.error(`Erro ao atualizar dados no Supabase: ${error.message}`);
      throw new Error(`Erro ao atualizar dados no Supabase: ${error.message}`);
    }

    return data || { message: "Dados atualizados com sucesso!" };

    if (error) {
      throw new Error(`Erro ao atualizar dados no Supabase: ${error.message}`);
    }

    return data || { message: "Dados atualizados com sucesso!" };
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

module.exports = atualizarNoSupabase;

// //Exemplo de uso
// const filtros = { rowId: 33 };
// const dataAtual = new Date().toLocaleString("pt-BR", {
//   timeZone: "America/Sao_Paulo",
// });
// const dadosAtualizados = {
//   mensagemEnviada: dataAtual,
//   mensagem_enviada_sucesso: true,
// };

// atualizarNoSupabase("maxplural_contatos", filtros, dadosAtualizados, true)
//   // .then((resultado) => console.log("Resultado:", resultado))
//   .catch((erro) => console.error("Erro:", erro));
