const axios = require('axios');

/**
 * Manda a imagem para a Responses API e devolve a descrição em texto.
 * Substitui o caminho antigo de Google Vision mais Assistants.
 *
 * @param {string} urlImagem - URL pública da imagem, vinda do download da W-API.
 * @param {string} apiKey - Chave da OpenAI.
 * @param {string} modelo - Modelo a usar. Padrão gpt-4.1.
 * @returns {Promise<string|null>} - Texto descrevendo a imagem, ou null.
 */
async function descreverImagem(urlImagem, apiKey, modelo = 'gpt-4.1') {
  if (!urlImagem) return null;
  if (!apiKey) throw new Error('Chave da OpenAI não informada para ler a imagem.');

  const instrucao = [
    'Descreva esta imagem para quem não pode vê-la.',
    'Transcreva todo o texto que aparecer, na ordem em que aparece.',
    'Sendo um print de rede social, diga de que rede é, o perfil que publicou e o teor da publicação.',
    'Responda em texto corrido, sem comentar que é uma imagem.',
  ].join(' ');

  try {
    const resposta = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: modelo,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: instrucao },
              { type: 'input_image', image_url: urlImagem },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const saida = resposta.data?.output || [];

    for (const item of saida) {
      for (const parte of item.content || []) {
        if (parte.type === 'output_text' && parte.text) {
          console.log('[WAt] Imagem descrita com sucesso.');
          return parte.text.trim();
        }
      }
    }

    console.log('[WAt] A Responses API não devolveu texto para a imagem.');
    return null;
  } catch (erro) {
    console.error('[WAt] Erro ao descrever imagem:', erro.response?.data || erro.message);
    return null;
  }
}

module.exports = { descreverImagem };