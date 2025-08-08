function gerarVariacoesDeTelefone(telefone) {
  const variacoes = new Set();
  const original = telefone;
  const temCodigoInternacional = telefone.startsWith("55");

  // Número sem o código internacional
  const telefoneSemCodigo = temCodigoInternacional
    ? telefone.slice(2)
    : telefone;

  // Lógica para adicionar variações com base no tamanho do número
  const adicionarVariacoes = (descricao, numero) => {
    variacoes.add(numero);
    //console.log(`Variação gerada (${descricao}): ${numero}`);
  };

  if (telefone.length === 13) {
    // 13 dígitos
    adicionarVariacoes("ele mesmo", original);
    adicionarVariacoes("tirar apenas o 55", telefoneSemCodigo);
    adicionarVariacoes(
      "tirar o 55 e o 9 extra",
      telefoneSemCodigo.slice(0, 2) + telefoneSemCodigo.slice(3)
    );
    adicionarVariacoes(
      "manter o 55 e tirar o 9 extra",
      "55" + telefoneSemCodigo.slice(0, 2) + telefoneSemCodigo.slice(3)
    );
  } else if (telefone.length === 11) {
    // 11 dígitos
    adicionarVariacoes("ele mesmo", original);
    adicionarVariacoes("incluir 55", "55" + original);
    adicionarVariacoes(
      "tirar o 9 extra",
      telefoneSemCodigo.slice(0, 2) + telefoneSemCodigo.slice(3)
    );
    adicionarVariacoes(
      "tirar o 9 extra e incluir 55",
      "55" + telefoneSemCodigo.slice(0, 2) + telefoneSemCodigo.slice(3)
    );
  } else if (telefone.length === 10) {
    // 10 dígitos
    adicionarVariacoes("ele mesmo", original);
    adicionarVariacoes("incluir 55", "55" + original);
    adicionarVariacoes(
      "incluir 55 e incluir 9",
      "55" + original.slice(0, 2) + "9" + original.slice(2)
    );
    adicionarVariacoes(
      "incluir apenas 9",
      original.slice(0, 2) + "9" + original.slice(2)
    );
  } else if (telefone.length === 12) {
    // 12 dígitos
    adicionarVariacoes("ele mesmo", original);
    adicionarVariacoes(
      "incluir 9",
      original.slice(0, 4) + "9" + original.slice(4)
    );
    adicionarVariacoes(
      "apagar 55 e incluir 9",
      telefoneSemCodigo.slice(0, 2) + "9" + telefoneSemCodigo.slice(2)
    );
    adicionarVariacoes("apagar 55", telefoneSemCodigo);
  }

  // Exibe todas as variações no final
  //console.log("Todas as variações geradas:", Array.from(variacoes));
  return Array.from(variacoes);
}

module.exports = gerarVariacoesDeTelefone;

// const resultado = gerarVariacoesDeTelefone(81988532136);
// console.log(resultado);