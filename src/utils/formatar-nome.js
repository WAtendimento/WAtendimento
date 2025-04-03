/**
 * Formata um nome em Proper Case e, se houver três ou mais partes,
 * retorna somente o primeiro e o último nome.
 *
 * @param {string} nomeCompleto - O nome completo.
 * @return {string} - O nome formatado.
 */
function formatarNome(nomeCompleto) {
  if (!nomeCompleto || typeof nomeCompleto !== "string") return "";

  // Converte para Proper Case, lidando com caracteres acentuados
  const paraProperCase = (texto) =>
    texto.toLowerCase().replace(/(?:^|\s)\S/g, (letra) => letra.toUpperCase());

  // Divide o nome completo em partes
  const partesDoNome = nomeCompleto.trim().split(/\s+/);

  // Retorna o nome formatado com as regras definidas
  const nomeFormatado =
    partesDoNome.length >= 3
      ? `${partesDoNome[0]} ${partesDoNome[partesDoNome.length - 1]}`
      : nomeCompleto;

  return paraProperCase(nomeFormatado);
}

module.exports = { formatarNome };
