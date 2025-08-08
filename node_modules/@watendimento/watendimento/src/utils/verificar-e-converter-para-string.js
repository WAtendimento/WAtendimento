function verificaEConverteParaString(parametro) {
  if (typeof parametro !== "string") {
    return parametro == null ? "" : String(parametro);
  }
  return parametro;
}

module.exports = verificaEConverteParaString;
