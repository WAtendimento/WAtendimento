/**
 * Função para procurar uma chave em um objeto JSON, tratando diferentes formatos de entrada.
 * @param {Object|string} obj - O objeto JSON ou uma string JSON a ser analisado.
 * @param {string} key - A chave a ser encontrada.
 * @param {*} defaultValue - Valor padrão a ser retornado caso a chave não seja encontrada.
 * @returns {*} - O valor da chave ou o valor padrão se não for encontrada.
 */
function encontrarChave(obj, key, defaultValue = null, depth = 0) {
  const indent = "  ".repeat(depth); // Indentação para facilitar leitura de logs
  console.log(
    `${indent}Iniciando busca da chave: "${key}" na profundidade ${depth}`
  );
  console.log(`${indent}Objeto atual: ${JSON.stringify(obj, null, 2)}`);

  if (typeof obj !== "object" || obj === null) {
    console.warn(
      `${indent}Tipo inválido detectado. Esperado objeto, recebido: ${typeof obj}`
    );
    return defaultValue;
  }

  // Verifica se o objeto é uma string e tenta convertê-la em JSON
  if (typeof obj === "string") {
    try {
      console.log(`${indent}String detectada, tentando parsear como JSON.`);
      const parsedObj = JSON.parse(obj);
      console.log(
        `${indent}String convertida para objeto: ${JSON.stringify(
          parsedObj,
          null,
          2
        )}`
      );
      return encontrarChave(parsedObj, key, defaultValue, depth + 1); // Chama recursivamente
    } catch (e) {
      console.warn(
        `${indent}Falha ao parsear string para JSON. Conteúdo: ${obj}`
      );
      return defaultValue;
    }
  }

  // Verifica se há encapsulamento em 'json' ou 'JSON'
  if (
    (obj.json && typeof obj.json === "object") ||
    (obj.JSON && typeof obj.JSON === "object")
  ) {
    console.log(
      `${indent}Encapsulamento detectado nas chaves "json" ou "JSON". Explorando...`
    );
    return encontrarChave(obj.json || obj.JSON, key, defaultValue, depth + 1);
  }

  // Verifica se a chave existe diretamente no objeto
  if (obj.hasOwnProperty(key)) {
    console.log(
      `${indent}Chave "${key}" encontrada com valor: ${JSON.stringify(
        obj[key],
        null,
        2
      )}`
    );
    return obj[key];
  }

  // Percorre as chaves do objeto e busca recursivamente
  for (const k in obj) {
    if (obj[k] && typeof obj[k] === "object") {
      console.log(`${indent}Explorando subobjeto na chave "${k}"...`);
      const resultado = encontrarChave(obj[k], key, defaultValue, depth + 1);
      if (resultado !== null) {
        console.log(`${indent}Chave "${key}" encontrada em subobjeto.`);
        return resultado;
      }
    } else {
      console.log(`${indent}Chave "${k}" ignorada (não é um objeto).`);
    }
  }

  console.warn(
    `${indent}Chave "${key}" não encontrada. Retornando valor padrão.`
  );
  return defaultValue;
}

module.exports = { encontrarChave };
