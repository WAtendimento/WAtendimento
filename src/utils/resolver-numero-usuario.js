
  
  function resolverNumeroUsuario(chatId, senderId, senderLid, fromMe) {
    // Regex para validar números brasileiros padrão WhatsApp (55 + DDD + número)
    const regexTelefone = /^55\d{10,13}$/;

    // 1️⃣ Verifica o chatId (prioritário)
    if (typeof chatId === 'string' && regexTelefone.test(chatId)) {
      return chatId;
    }

    // 2️⃣ Se não for um número válido, e a mensagem NÃO for enviada por mim, tenta o senderLid
    if (fromMe === false && typeof senderLid === 'string' && regexTelefone.test(senderLid)) {
      return senderLid;
    }
    
    // 3️⃣ senderId (se não foi enviado por mim)
    if (
      fromMe === false &&
      typeof senderId === 'string' &&
      regexTelefone.test(senderId)
    ) {
      return senderId;
    }

    // 4️⃣ senderRawId (sender.id) (se não foi enviado por mim)
    if (
      fromMe === false &&
      typeof senderRawId === 'string' &&
      regexTelefone.test(senderRawId)
    ) {
      return senderRawId;
    }

    return null;
  }

  module.exports = { resolverNumeroUsuario };