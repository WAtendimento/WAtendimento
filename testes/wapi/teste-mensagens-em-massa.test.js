const { enviaMensagensEmMassa } = require('../../src/wapi/enviar-mensagens-em-massa'); // Ajuste o caminho conforme necessário

// Simulando credenciais de envio
const credenciais = {
  host: 'host06.serverapi.dev',
  connection_key: 'w-api_ROCRkaIPGT',
  token: 'FIuxkl9603DMCyEdnkTxJKH6BErwerq1W',
  connected_phone: '554197610279',
  id_chip: 1,
};

// JSON de teste (enviado diretamente no código)
const jsonDeTeste = {
  mensagensGeradas: {
    contacts: [
      {
        number: '81996948615',
        message: 'Olá! Seu boleto vence amanhã. Evite juros e pague em dia!',
        id_cliente: 7749,
      },
      {
        number: '81996948615',
        message: 'Aviso importante: detectamos um atraso no seu pagamento. Precisa de ajuda?',
        id_cliente: 7749,
      },
      {
        number: '81996948615',
        message: 'Bom dia! Temos uma oferta especial para você. Fale com nosso atendimento.',
        id_cliente: 7749,
      },
    ],
  },
};

// Chamando a função de envio com o JSON de teste
enviaMensagensEmMassa(jsonDeTeste, credenciais)
  .then((resultado) => console.log('Resultado do envio:', resultado))
  .catch((erro) => console.error('Erro no envio:', erro));
