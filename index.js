const express = require("express");
const criarRotas = require("../WAtendimento/rotas/rotas"); // Importa as rotas do pacote

const app = express();
app.use(express.json({ limit: "20MB" }));

// Função específica do projeto (pode ser diferente para cada projeto)
const integraBot = async (msg, nome, origem, destino) => {
  console.log("Enviando mensagem personalizada:", { msg, nome, origem, destino });
};

// Configura as rotas comuns e específicas do projeto
app.use("/webhook", criarRotas(integraBot));

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
