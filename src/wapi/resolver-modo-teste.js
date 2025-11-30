const { buscarNoSupabase } = require('../supabase/buscar-no-supabase');

  function mensagemComChave(mensagem, chaves) {
    if (!mensagem) return false;

    const msg = mensagem.toLowerCase(); // normaliza p/ minúsculo
    return chaves.some(chave => msg.includes(chave.toLowerCase()));
  }

  async function ehModoTeste(supabase, credenciaisSupabase) {
    const rows = await buscarNoSupabase(supabase, 
      credenciaisSupabase.table_data.table_configs,
      { tipo_config: ['=', 'modo_teste'] }, // <- formato exigido
      ['valor_config'] // opcional: seleciona só o necessário
    );

    const first = Array.isArray(rows) ? rows[0] : rows?.data?.[0];
    const val = first?.valor_config?.toString().trim().toLowerCase();
    return val === 'true' || val === '1' || val === 'on' || val === 'yes';
  }


  async function ehTelefoneTeste(supabase, credenciaisSupabase, telefoneContato) {
    try {

      const rows = await buscarNoSupabase(supabase, 
        credenciaisSupabase.table_data.table_configs,
        { tipo_config: ['=', 'telefone_teste'],
          valor_config: ['=', telefoneContato]
        },
        ['*'],
        true // <-- ativa variações de telefone
      );

      // Se o helper já retorna o array de linhas:
      if (Array.isArray(rows)) return rows.length > 0;

      // Caso ele retorne um objeto no formato { data, error }:
      if (rows?.data) return rows.data.length > 0;

      return false;
    } catch (err) {
      console.error('Erro ao verificar whitelist do modo teste:', err?.message || err);
      return false; // em erro, trate como não autorizado
    }
  }

  module.exports = { ehModoTeste, ehTelefoneTeste, mensagemComChave };