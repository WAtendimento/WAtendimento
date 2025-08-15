if (!global.estadoExecucao) {
  global.estadoExecucao = { envioEmMassaAtivo: true }; // Inicialmente ativo
}

const controleExecucao = {
  setEstado(novoEstado) {
    console.log(
      `##ENVIO EM MASSA: 🔄 Alterando estado para: ${
        novoEstado ? "ATIVO" : "PAUSADO"
      }`
    );
    global.estadoExecucao.envioEmMassaAtivo = novoEstado;
  },
  getEstado() {
    return global.estadoExecucao.envioEmMassaAtivo;
  },
};

module.exports = { controleExecucao };
