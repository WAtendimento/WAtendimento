// Função para resolver o identificador do usuário (telefone ou LID)

function resolverIdentificadorUsuario(dadosExtraidos) {
    const regexTelefone = /^55\d{10,13}$/;

    // 1️⃣ Tenta o telefone primeiro (prioritário)
    if (typeof dadosExtraidos.chatId === 'string' && regexTelefone.test(dadosExtraidos.chatId)) {
      return { identificador: dadosExtraidos.chatId, isTelefone: true };
    }
    if (typeof dadosExtraidos.senderId === 'string' && regexTelefone.test(dadosExtraidos.senderId)) {
      return { identificador: dadosExtraidos.senderId, isTelefone: true };
    }
    if (typeof dadosExtraidos.senderRawId === 'string' && regexTelefone.test(dadosExtraidos.senderRawId)) {
      return { identificador: dadosExtraidos.senderRawId, isTelefone: true };
    }
    if (typeof dadosExtraidos.senderLid === 'string' && regexTelefone.test(dadosExtraidos.senderLid)) {
      return { identificador: dadosExtraidos.senderLid, isTelefone: true };
    }


    // 2️⃣ Se não encontrou telefone válido, tenta o LID
    if (typeof dadosExtraidos.senderLid === 'string' && dadosExtraidos.senderLid.trim() !== '') {
      return { identificador: dadosExtraidos.senderLid.trim(), isTelefone: false };
    }

        return {
      identificador: null,
      isTelefone: false
    };
  }

module.exports = { resolverIdentificadorUsuario };