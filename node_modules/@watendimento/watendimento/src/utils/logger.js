const logsPorExecucao = new Map(); // Mapeia logs separados por ID

function formatToBrazilTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

const criaLogger = (id) => {
  if (!logsPorExecucao.has(id)) {
    logsPorExecucao.set(id, {
      logs: [],
      startTime: formatToBrazilTime(new Date()),
      endTime: null,
      finalResult: "",
      telefone: id,
    });
  }

  const contexto = logsPorExecucao.get(id);

  return {
    add(...args) {
      const message = args
        .map((arg, index) => {
          if (index === 0) {
            // O primeiro argumento é tratado como prefixo
            return arg;
          }
          if (Array.isArray(arg)) {
            // Se for um array, formatamos cada item com índice
            return arg
              .map((item, i) => {
                if (typeof item === "object" && item !== null) {
                  // Formata objetos no array
                  return `${contexto.telefone.padEnd(
                    15
                  )}  ${i}: ${JSON.stringify(item, null, 2)
                    .split("\n")
                    .map((line) => `${contexto.telefone.padEnd(15)}    ${line}`)
                    .join("\n")}`;
                }
                // Para outros tipos de elementos no array
                return `${contexto.telefone.padEnd(15)}  ${i}: ${item}`;
              })
              .join("\n");
          }
          if (typeof arg === "object" && arg !== null) {
            // Itera sobre o JSON e verifica se os valores contêm múltiplas linhas
            return Object.entries(arg)
              .map(([key, value]) => {
                if (typeof value === "string" && value.includes("\n")) {
                  // Adiciona o telefone na frente de cada linha da string
                  const formattedValue = value
                    .split("\n")
                    .map((line) => `${contexto.telefone.padEnd(15)}  ${line}`)
                    .join("\n");
                  return `${contexto.telefone.padEnd(
                    15
                  )}  ${key}: \n${formattedValue}`;
                }
                return `${contexto.telefone.padEnd(15)}  ${key}: ${
                  typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : value
                }`;
              })
              .join("\n");
          }
          if (typeof arg === "string" && arg.includes("\n")) {
            // Identifica strings com múltiplas linhas e adiciona o número na frente
            return arg
              .split("\n")
              .map((line) => `${contexto.telefone.padEnd(15)}  ${line}`)
              .join("\n");
          }
          return String(arg);
        })
        .join("\n");

      // Formata a mensagem
      const formattedMessage = message.startsWith("==== [")
        ? `\n${contexto.telefone.padEnd(15)}${message}\n`
        : `${contexto.telefone.padEnd(15)}${message}`;

      if (!contexto.logs.includes(formattedMessage)) {
        contexto.logs.push(formattedMessage);
      }
    },
    setTelefone(remoteJid) {
      if (!contexto.telefone) {
        contexto.telefone = remoteJid;
      } else {
        //  console.warn("Telefone já foi definido. Ignorando redefinição.");
      }
    },
    error(message, variable) {
      const errorMessage = `${contexto.telefone.padEnd(
        15
      )} [ERRO] ${message}: ${
        typeof variable === "object"
          ? JSON.stringify(variable, null, 2)
          : String(variable)
      }`;

      if (!contexto.logs.includes(errorMessage)) {
        contexto.logs.push(errorMessage);
      }
    },
    result(...args) {
      contexto.finalResult = args
        .map((arg) =>
          typeof arg === "object" && arg !== null
            ? `[${JSON.stringify(arg, null, 2)}]`
            : String(arg)
        )
        .join(" ");
    },

    finish() {
      contexto.endTime = formatToBrazilTime(new Date());

      const resultLog = contexto.finalResult
        ? `${contexto.telefone.padEnd(
            15
          )}=== [RESULTADO DO PROCESSO] ===\n${contexto.telefone.padEnd(
            15
          )}>>> Resumo\n${contexto.telefone.padEnd(15)}${
            contexto.finalResult
          }\n\n`
        : "";

      const initialLog = `${contexto.telefone.padEnd(15)}=== LOG INICIADO: ${
        contexto.startTime
      } ===\n`;

      const logBody = contexto.logs.join("\n");

      // Corrigido: Adicionando \n no final para garantir quebra de linha
      const finalLog = `\n${contexto.telefone.padEnd(15)}=== LOG FINALIZADO: ${
        contexto.endTime
      } ===\n`; // Quebra de linha aqui

      logsPorExecucao.delete(contexto.telefone);
      return `${resultLog}${initialLog}${logBody}${finalLog}`;
    },

    clear() {
      logsPorExecucao.delete(id);
    },
  };
};

module.exports = criaLogger;
