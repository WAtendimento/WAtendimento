const { buscarNoSupabase } = require('../supabase/buscar-no-supabase');

/**
 * Busca informações do chip no Supabase pelo telefone conectado.
 *
 * @param {string} tabela - Nome da tabela no Supabase.
 * @param {string} connectedPhone - Número do telefone conectado.
 * @returns {Object|null} Objeto do chip encontrado ou null se não houver resultado.
 */
async function buscarChip(tabela, supabase, connectedPhone) {
  try {
    const filtros = {
      connected_phone: ['=', connectedPhone],
    };
    const camposSelecionados = ['*'];

    const resultadoConsulta = await buscarNoSupabase(supabase, tabela, filtros, camposSelecionados, true);

    if (!resultadoConsulta || resultadoConsulta.length === 0) {
      console.warn(`Nenhum chip encontrado na tabela "${tabela}" para o telefone ${connectedPhone}.`);
      return null;
    }

    const chip = resultadoConsulta[0];
    console.log(`✅ Chip encontrado: ID ${chip.id_chip}`);
    return chip;
  } catch (error) {
    console.error('Erro ao buscar chip no Supabase:', error.message);
    return null;
  }
}

module.exports = { buscarChip };
