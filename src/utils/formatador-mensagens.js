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

async function mensagemDeSaida(inputString) {
  if (!inputString || typeof inputString !== "string") {
    throw new TypeError("Valor inválido na mensagem de saída: uma string é esperada.");
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
