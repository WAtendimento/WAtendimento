
/**
 * Função genérica para realizar um INSERT ou UPSERT em qualquer tabela no Supabase.
 *
 * @param {string} tabela - Nome da tabela onde a operação será realizada.
 * @param {Object} registro - Objeto contendo os dados do registro, inclusive campos utilizados para a busca.
 * @param {boolean} isUpsert - Flag que determina se será um UPSERT (true) ou INSERT (false).
 * @param {string[]} [camposConflito] - Array de strings com os campos que determinam o conflito (necessário para UPSERT).
 *
 * @returns {Promise<Object>} Resultado da operação.
 */
async function insertOuUpsert(supabase, tabela, registro, isUpsert, camposConflito = []) {
  if (!tabela || typeof tabela !== "string") {
    throw new Error(
      'O parâmetro "tabela" é obrigatório e deve ser uma string.'
    );
  }

  if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
    throw new Error('O parâmetro "registro" deve ser um objeto válido.');
  }

  if (
    isUpsert &&
    (!camposConflito ||
      !Array.isArray(camposConflito) ||
      camposConflito.length === 0)
  ) {
    throw new Error(
      'O parâmetro "camposConflito" deve ser um array não vazio de strings para operações UPSERT.'
    );
  }

  try {
    const query = supabase.from(tabela);

    if (
      "interação_em_andamento" in registro &&
      registro.interação_em_andamento === true
    ) {
      const { data: contatoAtualizado, error: errorAtualizacao } = await query
        .update(registro)
        .match(
          camposConflito.reduce((acc, campo) => {
            acc[campo] = registro[campo];
            return acc;
          }, {})
        )
        .or("interação_em_andamento.eq.false,interação_em_andamento.is.null")
        .select("*");

      if (errorAtualizacao) {
        console.error(
          `[ERRO] Falha ao atualizar \`interação_em_andamento\`: ${errorAtualizacao.message}`
        );
        throw new Error(errorAtualizacao.message);
      }
    } else {
      let resultado;
      if (isUpsert) {
        resultado = await query.upsert([registro], {
          onConflict: camposConflito,
        });
      } else {
        resultado = await query.insert([registro]);
      }

      const { data, error } = resultado;

      if (error) {
        throw new Error(
          `Erro ao realizar ${isUpsert ? "UPSERT" : "INSERT"}: ${error.message}`
        );
      }

      return data;
    }
  } catch (error) {
    console.error("[WAt][ERRO] Falha na operação:", error.message);
    throw error;
  }
}

module.exports = { insertOuUpsert };
