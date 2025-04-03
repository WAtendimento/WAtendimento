//await delay(1000); // Delay de 1 segundo entre cada mensagem
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = delay;
