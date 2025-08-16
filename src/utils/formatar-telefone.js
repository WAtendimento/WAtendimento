
const formatarTelefone = (telefone) => {
    // Remove caracteres não numéricos
    let telefoneString = String(telefone).replace(/[^\d]/g, "");
  
    // Valida comprimento e prefixo
    if (telefoneString.length < 10 || telefoneString.length > 13) {
      //console.warn("[WAt][LOG] Número fora do formato esperado:", telefoneString);
      return null; // Formato inesperado
    } else {
        return telefoneString;
    }
}

function removerNoveDoTelefone(numero) {
  // Converte o número para string (caso não seja)
  let numeroStr = numero.toString();

  // Verifica se o número tem o formato correto e o '9' na posição certa
  if (numeroStr.length === 13 && numeroStr[4] === '9') {
      return numeroStr.slice(0, 4) + numeroStr.slice(5);
  } else if (numeroStr.length === 11 && numeroStr[2] === '9') {
    return "55" + numeroStr.slice(0, 2) + numeroStr.slice(3);
}

  // Retorna o número original caso não precise de ajustes
  return numeroStr;

}

module.exports = { formatarTelefone, removerNoveDoTelefone };