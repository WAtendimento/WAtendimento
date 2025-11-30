const { buscarNoSupabase } = require("../supabase/buscar-no-supabase");

async function buscarCredenciaisWAPIdoChip(telefone, supabase, credenciaisSupabase) {
    const tabela = credenciaisSupabase.table_data.table_chips; // Nome da tabela de chips;
    
    const filtros = {
      connected_phone: ["=", telefone],
    };
    
    const camposSelecionados = [
      "id_chip",
      "instance_id",
      "new_token",
    ];

    const resultadoConsultaChip = await buscarNoSupabase(
      supabase,
      tabela,
      filtros,
      camposSelecionados
    );

    // console.log("[WAt]Resultado da consulta ao chip:", resultadoConsultaChip);

    if (!resultadoConsultaChip || resultadoConsultaChip.length === 0) {
      console.log("[WAt]Nenhum registro encontrado para o telefone informado.");
      throw new Error("Nenhum registro encontrado para o telefone informado.");
    }

    const chip = resultadoConsultaChip[0];

    const credenciais = {
      id_chip: chip.id_chip,
      instance_id: chip.instance_id,
      token: chip.new_token,
    };

    // console.log("[WAt]> Credenciais WAPI do chip:", credenciais);

    return credenciais;
    
}

module.exports = { buscarCredenciaisWAPIdoChip };

// Exemplo de uso:
// (async () => {
//   try {
//     const telefone = "558194747345"; // Substitua pelo telefone desejado
//     const credenciais = await buscarCredenciaisWAPIdoChip(telefone);
//     console.log("[WAt]Credenciais WAPI do chip:", credenciais);
//   } catch (error) {
//     console.error("[WAt]Erro ao buscar credenciais WAPI do chip:", error.message);
//   }
// })();