function extrairWaid(vcard) {
  try {
    // Regex ajustada para o formato fornecido
    const regex = /TEL;.*waid=(\d+):/;
    const match = vcard.match(regex);
    if (!vcard) {
      console.log("vcard null <<<<<");
      return;
    }
    if (match && match[1]) {
      console.log("waid extraído:", match[1]);
      return match[1]; // Retorna o número waid extraído
    } else {
      throw new Error("waid não encontrado no vCard.");
    }
  } catch (error) {
    console.error("Erro ao extrair waid:", error.message);
    return null;
  }
}
//para testes
const vcard =
  "BEGIN:VCARD\nVERSION:3.0\nN:Atendimento;Diêgo;;;\nFN:Diêgo Atendimento\nitem1.TEL;waid=558188532136:+55 81 8853-2136\nitem1.X-ABLabel:Celular\nEND:VCARD";
// extrairWaid(vcard);
module.exports = { extrairWaid };
