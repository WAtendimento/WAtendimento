function existeDiferencaDeDias(dias, timestamp) {
  if (!timestamp) return true;

  const dataAtual = new Date();
  const dataComparacao = new Date(timestamp);
  
  // Calcula a diferença em milissegundos
  const diferencaEmMilissegundos = dataAtual - dataComparacao;
  
  // Converte a diferença para dias
  const diferencaEmDias = diferencaEmMilissegundos / (1000 * 60 * 60 * 24);
  
  // Verifica se a diferença é maior ou igual ao número de dias especificado
  return diferencaEmDias >= dias;
}

// Exporta a função para uso em outros módulos
module.exports = { existeDiferencaDeDias }
// Uso: const existeDiferencaDeDias = require('./existe-diferenca-dias.js');
// Exemplo: existeDiferencaDeDias(2, '2023-10-01T12:00:00Z');


// Teste 1: data de 5 dias atrás (deve retornar true para >= 2 dias)
// const timestamp1 = new Date();
// timestamp1.setDate(timestamp1.getDate() - 5);
// console.log('Teste 1:', existeDiferencaDeDias(2, timestamp1.toISOString())); // true

// // Teste 2: data de 1 dia atrás (deve retornar false para >= 2 dias)
// const timestamp2 = new Date();
// timestamp2.setDate(timestamp2.getDate() - 1);
// console.log('Teste 2:', existeDiferencaDeDias(2, timestamp2.toISOString())); // false

// // Teste 3: data exatamente 2 dias atrás (deve retornar true)
// const timestamp3 = new Date();
// timestamp3.setDate(timestamp3.getDate() - 2);
// console.log('Teste 3:', existeDiferencaDeDias(2, timestamp3.toISOString())); // true

// const timestamp4 = "2025-08-12 18:18:00.177+00"; // Exemplo de timestamp
// console.log('Teste 4:', existeDiferencaDeDias(2, timestamp4)); // true

// const timestamp5 = null; // Exemplo de timestamp
// console.log('Teste 5:', existeDiferencaDeDias(2, timestamp5)); // true


