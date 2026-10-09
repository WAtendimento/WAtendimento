const mensagensPorTelefone = new Map(); // Mapeia mensagens acumuladas por telefone

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

const acumulaMensagens = (telefone) => {
  if (!mensagensPorTelefone.has(telefone)) {
    mensagensPorTelefone.set(telefone, {
      mensagens: [],
      startTime: formatToBrazilTime(new Date()),
      endTime: null,
    });
  }

  const contexto = mensagensPorTelefone.get(telefone);

  return {
    add(...args) {
      let message = args.join(" ");
      // Substituir caracteres especiais por espaço
      message = message.replace(/[^\wÀ-ÿ\s.\-()/?!,:\p{Emoji}]/gu, " ");
      contexto.mensagens.push(message);
    },

    // Quantas mensagens ja entraram no buffer deste contato.
    // Usado para encerrar a espera por inatividade em vez de tempo fixo.
    total() {
      return contexto.mensagens.length;
    },

    finish() {
      contexto.endTime = formatToBrazilTime(new Date());

      const initialLog = `=== MENSAGENS INICIADAS: ${contexto.startTime} ===\n`;
      const mensagensAcumuladas = contexto.mensagens.join(" ");
      const finalLog = `\n=== MENSAGENS FINALIZADAS: ${contexto.endTime} ===`;

      mensagensPorTelefone.delete(telefone);

      return `${mensagensAcumuladas}`;
    },

    clear() {
      mensagensPorTelefone.delete(telefone);
    },
  };
};

module.exports = { acumulaMensagens };

// TESTE DIRETAMENTE NO MESMO ARQUIVO
// const acumulador = acumulaMensagens("123456789");
// acumulador.add("oi no 1");
// acumulador.add("tudo no 1");

// const outroTesteAcumulaMensagens = acumulaMensagens("987654321");
// outroTesteAcumulaMensagens.add("oi no outro");

// console.log(testeAcumulaMensagens.finish());
// console.log(outroTesteAcumulaMensagens.finish());
