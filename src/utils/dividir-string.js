/**
 * Divide uma string com base em um critério específico.
 *
 * @param {string} frase - A string a ser dividida.
 * @param {string} tipoDivisao - Define o critério de divisão ("após pontuação" ou "dividir após quebra de linha").
 * @param {number} [retornaQualParte] - **(DEPRECATED)** Define qual parte retornar (1 para a primeira, 2 para a segunda). Sempre retorna um array.
 *
 * @returns {string[]} Um array contendo as partes da string dividida.
 */
const TIPOS_DIVISAO = {
  QUEBRA_LINHA: "quebra_linha",
  PONTUACAO: "pontuacao",
};

function dividirString(
  frase,
  tipoDivisao = TIPOS_DIVISAO.QUEBRA_LINHA,
  retornaQualParte
) {
  if (typeof frase !== "string" || frase.trim() === "") {
    throw new Error(
      "A frase deve ser uma string válida e não pode estar vazia."
    );
  }

  const dividirPorQuebraDeLinha = (texto) => {
    return texto
      .split(/\n+/)
      .map((parte) => parte.trim())
      .filter(Boolean);
  };

  const dividirPorPontuacao = (texto) => {
    const regex = /(?<=[.!?…])\s+/; // Divide após pontuação seguida de espaço
    return texto
      .split(regex)
      .map((parte) => parte.trim())
      .filter(Boolean);
  };

  let partes;

  switch (tipoDivisao) {
    case TIPOS_DIVISAO.QUEBRA_LINHA:
      partes = dividirPorQuebraDeLinha(frase);
      break;

    case TIPOS_DIVISAO.PONTUACAO:
      partes = dividirPorPontuacao(frase);
      break;

    default:
      throw new Error(
        `Tipo de divisão inválido. Use: ${Object.values(TIPOS_DIVISAO).join(
          ", "
        )}.`
      );
  }

  if (retornaQualParte !== undefined) {
    const index = parseInt(retornaQualParte, 10) - 1;
    return [partes[index] || ""];
  }

  return partes;
}

module.exports = { dividirString, TIPOS_DIVISAO };

// const texto1 = `Ótimo, você procura o Corolla que mencionou.\nVocê está pensando em um carro a partir de que ano?`;

// console.log("Divisão por quebra de linha (padrão):");
// console.log(dividirString(texto1));
