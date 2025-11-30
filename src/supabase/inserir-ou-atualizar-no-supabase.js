function normalizarValor(valor, campo) {
  // 1) Se for array, pode ser:
  //    a) JSON legítimo (ex: lista de mensagens) -> PERMITIR
  //    b) filtro acidental ["=", 1] -> BLOQUEAR
  if (Array.isArray(valor)) {
    const possivelOperador = valor[0];

    const operadoresSuspeitos = [
      "=", "!=", ">", ">=", "<", "<=",
      "like", "ilike", "not", "in", "is"
    ];

    if (
      valor.length === 2 &&
      typeof possivelOperador === "string" &&
      operadoresSuspeitos.includes(possivelOperador)
    ) {
      // Isso aqui claramente é um filtro vindo errado pro insert
      throw new Error(
        `Valor inválido para o campo "${campo}". Parece que você passou um filtro [${possivelOperador}, valor] em vez de um valor direto.`
      );
    }

    // Caso contrário, tratamos como JSON válido (ex: json_conversa)
    return valor;
  }

  // 2) Objetos também são válidos (JSON)
  if (typeof valor === "object" && valor !== null) {
    return valor;
  }

  // 3) Proteção contra strings bugadas tipo "=,1"
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
