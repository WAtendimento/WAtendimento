async function mensagemDeEntrada(inputString) {
  if (!inputString || typeof inputString !== "string") {
    throw new TypeError("Valor inválido na mensagem de entrada: uma string é esperada.");
  }

  // Formatação do texto: substitui quebras de linha e aspas duplas, preservando barras invertidas corretamente.
  const formattedString = inputString
    .replace(/\\/g, "\\\\") // Dobra barras invertidas existentes
    .replace(/(\r\n|\n|\r)/gm, "\\n") // Substitui quebras de linha por "\\n"
    .replace(/"/g, ""); // Remove aspas duplas

  return formattedString;
}

// Achata o que o modelo devolver em texto. Ele às vezes responde com array de
// blocos ou objeto em vez da string esperada, e nesses casos a mensagem se perde.
function achatarParaTexto(valor) {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor;
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);

  if (Array.isArray(valor)) {
    return valor.map(achatarParaTexto).filter(Boolean).join("\n\n");
  }

  if (typeof valor === "object") {
    const titulo = valor.titulo || valor.title || valor.header || "";
    const corpo = valor.conteudo || valor.content || valor.texto || valor.text || valor.respostaBot || "";

    if (titulo || corpo) {
      return [achatarParaTexto(titulo), achatarParaTexto(corpo)].filter(Boolean).join("\n");
    }

    return Object.values(valor).map(achatarParaTexto).filter(Boolean).join("\n\n");
  }

  return "";
}

async function mensagemDeSaida(entrada) {
  const inputString = achatarParaTexto(entrada);

  if (!inputString) {
    throw new TypeError("Valor inválido na mensagem de saída: uma string é esperada.");
  }

  if (typeof entrada !== "string") {
    console.log("[WAt] Mensagem de saída veio em formato não textual e foi achatada.");
  }

  // Remove "+" e aspas duplas, e converte "\\n" para quebras de linha reais
  const formattedString = inputString
    .replace(/\+/g, "") // Remove os caracteres "+"
    .replace(/"/g, "") // Remove aspas duplas
    .replace(/\\\\n/g, "\n"); // Converte "\\n" para "\n"

  return formattedString;
}

module.exports = { mensagemDeEntrada, mensagemDeSaida };

// (async () => {
//   try {
//     const result = await mensagemDeEntrada({
//       data: {
//         input_string: 'Texto com\nquebra de linha e "aspas duplas".',
//       },
//     });

//     console.log("[WAt]Resultado:", result);
//   } catch (error) {
//     console.error("[WAt]Erro ao executar a função:", error.message);
//   }
// })();
