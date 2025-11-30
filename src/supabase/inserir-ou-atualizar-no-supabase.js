/**
 * Normaliza um valor para INSERT/UPSERT.
 * - Impede arrays acidentais como ["=", 1]
 * - Impede objetos indevidos
 * - Impede valores como "=,1"
 */
function normalizarValor(valor, campo) {
  if (Array.isArray(valor)) {
    console.warn(`[WAt][WARN] Campo "${campo}" recebeu array. Usando apenas o valor interno:`, valor);

    // Caso seja ["=", valor] → extrai o valor real
    if (valor.length === 2 && typeof valor[0] === "string") {
      return valor[1];
    }

    // Caso seja um array legítimo → bloquear por segurança
    throw new Error(`Valor inválido para o campo "${campo}". Arrays não são permitidos em INSERT/UPSERT.`);
  }

  if (typeof valor === "object" && valor !== null) {
    throw new Error(`Valor inválido para o campo "${campo}". Objetos não são permitidos em INSERT/UPSERT.`);
  }

  // Proteção contra valores tipo "=,1" vindos de filtros contaminados
  if (typeof valor === "string" && valor.includes(",") && valor.startsWith("=")) {
    console.warn(`[WAt][WARN] Valor estranho detectado no campo "${campo}":`, valor);
    const partes = valor.split(",");
    return partes[1] || null;
  }

  return valor;
}

/**
 * Normaliza TODO o objeto do registro antes de enviar ao Supabase
 */
function normalizarRegistro(registro) {
  const limpo = {};
  for (const [campo, valor] of Object.entries(registro)) {
    limpo[campo] = normalizarValor(valor, campo);
  }
  return limpo;
}

/**
 * Função genérica para realizar um INSERT ou UPSERT em qualquer tabela no Supabase.
 */
async function insertOuUpsert(supabase, tabela, registro, isUpsert, camposConflito = []) {

  if (!tabela || typeof tabela !== "string") {
    throw new Error('O parâmetro "tabela" é obrigatório e deve ser uma string.');
  }

  if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
    throw new Error('O parâmetro "registro" deve ser um objeto válido.');
  }

  if (isUpsert &&
    (!camposConflito ||
      !Array.isArray(camposConflito) ||
      camposConflito.length === 0)
  ) {
    throw new Error(
      'O parâmetro "camposConflito" deve ser um array não vazio de strings para operações UPSERT.'
    );
  }

  // 🔧 CORREÇÃO 1 — Normalizar dados antes de enviar ao Supabase
  const registroNormalizado = normalizarRegistro(registro);

  // 🔧 CORREÇÃO 2 — Garante que campos de conflito não tenham operador ou array
  camposConflito.forEach((campo) => {
    if (Array.isArray(registroNormalizado[campo])) {
      throw new Error(
        `O campo "${campo}" não pode ser um array ao usar UPSERT.`
      );
    }
  });

  try {
    const query = supabase.from(tabela);

    // 🔧 CORREÇÃO 3 — atualizar controle interação_em_andamento com segurança
    if (
      "interação_em_andamento" in registroNormalizado &&
      registroNormalizado.interação_em_andamento === true
    ) {
      const matchObj = camposConflito.reduce((acc, campo) => {
        acc[campo] = registroNormalizado[campo];
        return acc;
      }, {});

      const { data: contatoAtualizado, error: errorAtualizacao } = await query
        .update(registroNormalizado)
        .match(matchObj)
        .or("interação_em_andamento.eq.false,interação_em_andamento.is.null")
        .select("*");

      if (errorAtualizacao) {
        console.error(
          `[ERRO] Falha ao atualizar \`interação_em_andamento\`: ${errorAtualizacao.message}`
        );
        throw new Error(errorAtualizacao.message);
      }

      return contatoAtualizado;
    }

    // 🔧 CORREÇÃO 4 — upsert/insert com registro limpo
    let resultado;
    if (isUpsert) {
      resultado = await query.upsert([registroNormalizado], {
        onConflict: camposConflito,
      });
    } else {
      resultado = await query.insert([registroNormalizado]);
    }

    const { data, error } = resultado;

    if (error) {
      throw new Error(
        `Erro ao realizar ${isUpsert ? "UPSERT" : "INSERT"}: ${error.message}`
      );
    }

    return data;
  } catch (error) {
    console.error("[WAt][ERRO] Falha na operação:", error.message);
    throw error;
  }
}

module.exports = { insertOuUpsert };
