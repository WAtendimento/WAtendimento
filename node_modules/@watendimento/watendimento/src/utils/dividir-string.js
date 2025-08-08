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

function dividirString(frase, tipoDivisao = TIPOS_DIVISAO.QUEBRA_LINHA, preservarListas = false, retornaQualParte) {
  if (typeof frase !== 'string' || frase.trim() === '') {
    throw new Error('A frase deve ser uma string válida e não pode estar vazia.');
  }

  const dividirPorQuebraDeLinha = (texto) => {
    if (preservarListas) {
      return agruparListas(texto);
    }

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
      throw new Error(`Tipo de divisão inválido. Use: ${Object.values(TIPOS_DIVISAO).join(', ')}.`);
  }

  if (retornaQualParte !== undefined) {
    const index = parseInt(retornaQualParte, 10) - 1;
    return [partes[index] || ''];
  }

  return partes;
}

function agruparListas(texto) {
  const linhas = texto.split('\n');
  const blocos = [];
  let buffer = [];

  const isItemLista = (linha) => /^(\s*[\*\-]\s|\s*\d+\.\s|\s*[a-zA-Z]\))/i.test(linha.trim());

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    const proximaLinha = linhas[i + 1]?.trim();

    if (!linha) continue;

    // Se a próxima linha for item de lista, junte essa também
    const proximaEhLista = proximaLinha && isItemLista(proximaLinha);
    const linhaAtualEhLista = isItemLista(linha);

    if (linhaAtualEhLista || proximaEhLista || buffer.length) {
      buffer.push(linha);
    } else {
      if (buffer.length) {
        blocos.push(buffer.join('\n').trim());
        buffer = [];
      }
      blocos.push(linha);
    }
  }

  if (buffer.length) {
    blocos.push(buffer.join('\n').trim());
  }

  return blocos;
}



module.exports = { dividirString, TIPOS_DIVISAO, agruparListas };

// const texto1 = `Claro, vamos lá!

// Me diga o que está buscando.

// Assim consigo te ajudar melhor.`;


// console.log(dividirString(texto1, "quebra_linha", true));