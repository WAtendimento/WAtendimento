const express = require("express");
const controlador = require("./controlador-rotas");

module.exports = (credenciaisOpenAi, credenciaisWAPI, integraBot) => {
  if (!credenciaisOpenAi || typeof credenciaisOpenAi !== "object") {
    throw new Error("Credenciais da OpenAI são obrigatórias e devem ser um objeto.");
  }

  if (!credenciaisWAPI || typeof credenciaisWAPI !== "object") {
    throw new Error("Credenciais da WAPI são obrigatórias e devem ser um objeto.");
  }
  if (typeof integraBot !== "function") {
    throw new Error("É necessário fornecer a função de integração do bot.");
  }

  const router = express.Router();
  router.use(express.json());

  // Webhook de Recebimento
  router.post("/receberWebhook", (req, res) =>
    controlador.receberWebhook(req, res, credenciaisOpenAi, credenciaisWAPI, integraBot)
  );

  // Forçar Envio (depende da função injetada)
  router.post("/forcarEnvio", (req, res) =>
    controlador.forcarEnvio(req, res, credenciaisOpenAi, integraBot)
  );

  // Webhook para envio em massa
  router.post("/receberWebhookEnvioEmMassa", (req, res) =>
  controlador.receberWebhookEnvioEmMassa(req, res, credenciaisWAPI)
);

  // Rota para versão do Node.js
  router.get("/node-version", (req, res) => {
    res.send({ version: process.version });
  });

  return router;
};
