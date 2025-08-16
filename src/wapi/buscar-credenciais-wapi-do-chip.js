const { buscarNoSupabase } = require("../supabase/buscar-no-supabase");
const { criarClienteSupabase } = require("../supabase/criar-cliente-supabase");

async function buscarCredenciaisWAPIdoChip(telefone, credenciaisSupabase) {
    const supabase = criarClienteSupabase(credenciaisSupabase);
    const tabela = credenciaisSupabase.table_data.table_chips; // Nome da tabela de chips;
    
    const filtros = {
      connected_phone: ["=", telefone],
    };
    
    const camposSelecionados = [
      "instance_id",
      "new_token",
    ];

    const resultadoConsultaChip = await buscarNoSupabase(
      supabase,
      tabela,
      filtros,
      camposSelecionados
    );

    console.log("Resultado da consulta ao chip:", resultadoConsultaChip);

    if (!resultadoConsultaChip || resultadoConsultaChip.length === 0) {
      console.log("Nenhum registro encontrado para o telefone informado.");
      throw new Error("Nenhum registro encontrado para o telefone informado.");
    }

    const chip = resultadoConsultaChip[0];

    const credenciais = {
      instance_id: chip.instance_id,
      token: chip.new_token,
    };

    console.log("> Credenciais WAPI do chip:", credenciais);

    return credenciais;
    
}

module.exports = { buscarCredenciaisWAPIdoChip };

// Exemplo de uso:
// (async () => {
//   try {
//     const telefone = "558194747345"; // Substitua pelo telefone desejado
//     const credenciais = await buscarCredenciaisWAPIdoChip(telefone);
//     console.log("Credenciais WAPI do chip:", credenciais);
//   } catch (error) {
//     console.error("Erro ao buscar credenciais WAPI do chip:", error.message);
//   }
// })();