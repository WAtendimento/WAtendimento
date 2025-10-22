// Função para resolver o identificador do usuário (telefone ou LID)

function resolverIdentificadorUsuario(dadosExtraidos) {
    const regexTelefone = /^55\d{10,13}$/;

    // 1️⃣ Tenta o telefone primeiro (prioritário)
    if (typeof dadosExtraidos.chatId === 'string' && regexTelefone.test(dadosExtraidos.chatId)) {
      return dadosExtraidos.chatId;
    }
    if (typeof dadosExtraidos.senderId === 'string' && regexTelefone.test(dadosExtraidos.senderId)) {
      return dadosExtraidos.senderId;
    }
    if (typeof dadosExtraidos.senderRawId === 'string' && regexTelefone.test(dadosExtraidos.senderRawId)) {
      return dadosExtraidos.senderRawId;
    }

    // 2️⃣ Se não encontrou telefone válido, tenta o LID
    if (typeof dadosExtraidos.senderLid === 'string' && dadosExtraidos.senderLid.trim() !== '') {
      return dadosExtraidos.senderLid.trim();
    }

    return null;
  }

module.exports = { resolverIdentificadorUsuario };