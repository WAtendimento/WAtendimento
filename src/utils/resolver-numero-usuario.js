
  function extrairNumeroWhatsApp(str) {
    if (typeof str !== 'string') return null;
    
    const indiceArroba = str.indexOf('@');
    if (indiceArroba === -1) return null;
    
    return str.substring(0, indiceArroba);
  }

  function resolverNumeroUsuario(chatId, senderId, senderAccountType, fromMe) {
    
    if(fromMe === true) {
      return chatId;
    } else {
      if(senderAccountType && senderAccountType === 'E2EE') {
        return chatId;
      } else {
        return extrairNumeroWhatsApp(senderId);
      }
    }
  }

  module.exports = { resolverNumeroUsuario };