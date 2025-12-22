
function gerarData() {
  const s = new Date().toLocaleString('sv-SE', {
    timeZone: 'America/Recife'
  });
  return s.slice(0, 10);
}

module.exports = {
  gerarData,
};