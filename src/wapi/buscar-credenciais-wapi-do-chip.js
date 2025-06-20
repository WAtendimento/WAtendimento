const buscarNoSupabase = require("../supabase/buscar-no-supabase");
const { credenciaisSupabase } = require("../../credenciais/supabase");

async function buscarCredenciaisWAPIdoChip(telefone) {
    const tabela = credenciaisSupabase.table_data.table_chips; // Nome da tabela de chips;
    const filtros = {
      connected_phone: ["=", telefone],
    };
    
    const camposSelecionados = [
      "instance_id",
      "new_token",
    ];

    const resultadoConsultaChip = await buscarNoSupabase(
      tabela,
      filtros,
      camposSelecionados
    );

    if (!resultadoConsultaChip || resultadoConsultaChip.length === 0) {
      console.log("Nenhum registro encontrado para o telefone informado.");
      throw new Error("Nenhum registro encontrado para o telefone informado.");
    }

    const chip = resultadoConsultaChip[0];

    const credenciais = {
      instance_id: chip.instance_id,
      token: chip.new_token,
    };

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