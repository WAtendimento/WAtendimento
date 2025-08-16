
  // Função para gerar timestamp no formato Brasil
  function gerarTimestampBrasil() {
    const now = new Date();

    const offset = -3 * 60;
    const adjustedTime = new Date(now.getTime() + offset * 60 * 1000);

    return adjustedTime.toISOString();
  }

  module.exports = { gerarTimestampBrasil };