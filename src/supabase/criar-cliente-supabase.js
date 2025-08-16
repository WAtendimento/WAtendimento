const { createClient } = require("@supabase/supabase-js");

function criarClienteSupabase(credenciaisSupabase) {
  return createClient(credenciaisSupabase.table_data.url, credenciaisSupabase.table_data.token);
}

module.exports = { criarClienteSupabase };
