const { gerarVariacoesDeTelefone } = require("../utils/gerar-variacoes-telefone");

/**
 * Normaliza valores simples ou remove filtros acidentais
 */
function normalizarValor(valor, campo) {
  if (Array.isArray(valor)) {
    const possivelOperador = valor[0];
    const operadoresSuspeitos = [
      "=", "!=", ">", ">=", "<", "<=",
      "like", "ilike", "not", "in", "is"
    ];

    // Caso seja array no formato de filtro → ERRO
    if (
      valor.length === 2 &&
      typeof possivelOperador === "string" &&
      operadoresSuspeitos.includes(possivelOperador)
    ) {
      throw new Error(
        `Valor inválido para o campo "${campo}". Parece que você passou um filtro [${possivelOperador}, valor] em vez de um valor direto.`
      );
    }

    return valor; // JSON válido
  }

  if (typeof valor === "object" && valor !== null) {
    return valor;
  }

  if (typeof valor === "string" && valor.includes(",") && valor.startsWith("=")) {
    console.warn(`[WAt][WARN] Valor estranho detectado no campo "${campo}":`, valor);
    const partes = valor.split(",");
    return partes[1] || null;
  }

  return valor;
}

/**
 * Normaliza TODO o registro (insert/upsert)
 */
function normalizarRegistro(registro) {
  const limpo = {};
  for (const [campo, valor] of Object.entries(registro)) {
    limpo[campo] = normalizarValor(valor, campo);
  }
  return limpo;
}

/**
 * Função genérica para realizar INSERT ou UPSERT com normalização + variações de telefone
 */
async function insertOuUpsert(supabase, tabela, registro, isUpsert, camposConflito = []) {

  if (!tabela || typeof tabela !== "string") {
    throw new Error('O parâmetro "tabela" é obrigatório e deve ser uma string.');
  }

  if (!registro || typeof registro !== "object" || Array.isArray(registro)) {
    throw new Error('O parâmetro "registro" deve ser um objeto válido.');
  }

  if (
    isUpsert &&
    (!camposConflito || !Array.isArray(camposConflito) || camposConflito.length === 0)
  ) {
    throw new Error(
      'O parâmetro "camposConflito" deve ser um array não vazio de strings para operações UPSERT.'
    );
  }

  const registroNormalizado = normalizarRegistro(registro);

  // ============================================================
  // 🔥 CORREÇÃO AQUI — detecta se identificador é telefone
  // ============================================================

  let identificador = registroNormalizado.identificador;
  const telefoneRegex = /^55\d{10,13}$/;

  const identificadorEhTelefone =
    typeof identificador === "string" && telefoneRegex.test(identificador);

  if (identificadorEhTelefone) {

    // Gera variações igual ao buscar/atualizar
    const variacoes = gerarVariacoesDeTelefone(identificador);
    let identificadorReal = identificador; // fallback

    // Busca se existe um registro no Supabase com alguma das variações
    for (const variacao of variacoes) {
      const { data, error } = await supabase
        .from(tabela)
        .select("*")
        .eq("identificador", variacao)
        .limit(1);

      if (error) {
        console.error(`[WAt][ERRO] Falha ao buscar variações no insert/upsert: ${error.message}`);
      }

      if (data && data.length > 0) {
        identificadorReal = variacao;
        break;
      }
    }

    // Normaliza o identificador para a variação REAL encontrada
    registroNormalizado.identificador = identificadorReal;
  }

  // ============================================================
  // ❗ Protege campos de conflito contra arrays
  // ============================================================
  camposConflito.forEach((campo) => {
    if (Array.isArray(registroNormalizado[campo])) {
      throw new Error(
        `O campo "${campo}" não pode ser um array ao usar UPSERT.`
      );
    }
  });

  try {
    const query = supabase.from(tabela);

    // ============================================================
    // CASO ESPECIAL — atualizar interacao com segurança
    // ============================================================
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

    // ============================================================
    // INSERT / UPSERT NORMAL
    // ============================================================

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
