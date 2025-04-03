const express = require("express");
const controlador = require("./controlador-rotas");

module.exports = (integraBot) => {
  if (typeof integraBot !== "function") {
    throw new Error("É necessário fornecer a função de integração do bot.");
  }

  const router = express.Router();
  router.use(express.json());

  // Webhook de Recebimento
  router.post("/receberWebhook", (req, res) =>
    controlador.receberWebhook(req, res, integraBot)
  );

  // Forçar Envio (depende da função injetada)
  router.post("/forcarEnvio", (req, res) =>
    controlador.forcarEnvio(req, res, integraBot)
  );

  // Webhook para envio em massa
  router.post("/receberWebhookEnvioEmMassa", controlador.receberWebhookEnvioEmMassa);

  // Rota para versão do Node.js
  router.get("/node-version", (req, res) => {
    res.send({ version: process.version });
  });

  return router;
};
