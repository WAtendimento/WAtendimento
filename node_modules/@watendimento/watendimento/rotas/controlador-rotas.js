const { processarMensagemJson } = require('../src/wapi/receber-mensagem');
const { pesquisarContatosEGerarMensagens } = require('../src/wapi/processa-contatos-para-enviar-msgs');

/**
 * Controlador para webhooks gerais
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 */
async function receberWebhook(req, res, credenciaisOpenAi, integraBot) {
  try {
    // Log do payload para debug
    // console.log("Payload recebido:", JSON.stringify(req.body, null, 2));.
    //console.log("Payload completo recebido:", req.body);

    if (req.body && Object.keys(req.body).length > 0) {
      const mensagem = req.body ?? req.body | req.body.body;

      // Processa a mensagem usando o serviço
      const dadosProcessados = await processarMensagemJson(mensagem, credenciaisOpenAi, integraBot);

      if (dadosProcessados) {
        //console.log("Mensagem processada com sucesso:", dadosProcessados);
        return res.status(200).json({
          status: 'Mensagem recebida com sucesso.',
          dados: dadosProcessados,
        });
      } else {
        console.error('Erro ao processar os dados.');
        return res.status(400).json({ status: 'Erro ao processar a mensagem.' });
      }
    } else {
      console.warn('Corpo da requisição vazio.');
      return res.status(400).json({ status: 'Nenhum dado recebido.' });
    }
  } catch (error) {
    console.error('Erro no processamento do webhook:', error.message);
    return res.status(500).json({ status: 'Erro interno no servidor.' });
  }
}
//

/**
 * Controlador para forçar envio via webhook.
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 */
async function forcarEnvio(req, res, credenciaisOpenAi, integraBot) {
  try {
    const { mensagem, nome, telefoneOrigem, telefoneDestino } = req.body;

    // Validar os parâmetros recebidos
    if (!mensagem || !nome || !telefoneOrigem || !telefoneDestino) {
      return res.status(400).json({
        status: 'Erro',
        mensagem: 'Parâmetros inválidos ou ausentes.',
      });
    }

    // Processar o envio
    await integraBot(mensagem, nome, telefoneOrigem, telefoneDestino, credenciaisOpenAi);

    // Retornar sucesso
    return res.status(200).json({
      status: 'Sucesso',
      mensagem: 'Envio forçado com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao forçar envio:', error.message);
    return res.status(500).json({
      status: 'Erro',
      mensagem: 'Erro interno ao forçar envio.',
    });
  }
}

/*
 *
 * Controlador para envio de mensagens em massa.
 * Lida com diferentes formatos de requisição e busca recursiva de dados.
 * @param {Object} req - Objeto de requisição.
 * @param {Object} res - Objeto de resposta.
 */
async function receberWebhookEnvioEmMassa(req, res, credenciaisWAPI) {
  try {
    // Log do payload para debug
    //console.log("Payload recebido:", JSON.stringify(req.body, null, 2));

    if (req.body && Object.keys(req.body).length > 0) {
      const { quantidade, mensagem } = req.body;
      // Valida os tipos dos parâmetros recebidos
      if (typeof quantidade === 'number') {
        // Chama o serviço com os parâmetros recebidos
        const resultado = await pesquisarContatosEGerarMensagens(mensagem, quantidade, credenciaisWAPI);

        if (resultado) {
          return res.status(200).json({
            status: 'Processamento concluído com sucesso.',
            dados: resultado,
          });
        } else {
          console.error('Erro ao processar o envio em massa. Tipo de um de parâmetro(s) está incorreto, devem ser números');

          return res.status(400).json({
            status: 'Erro ao processar os dados.',
          });
        }
      } else {
        console.error("Chaves 'quantidade' ou 'buscarSomenteSemMensagem' inválidas ou ausentes.");
        return res.status(400).json({
          status: "Requisição inválida. As chaves 'quantidade' e 'buscarSomenteSemMensagem' devem ser do tipo correto.",
        });
      }
    } else {
      console.error('Corpo da requisição vazio.');
      return res.status(400).json({ status: 'Nenhum dado recebido.' });
    }
  } catch (error) {
    console.error('Erro no processamento do webhook:', error.message);
    return res.status(500).json({ status: 'Erro interno no servidor.' });
  }
}


module.exports = {
  receberWebhook,
  forcarEnvio,
  receberWebhookEnvioEmMassa,
};
