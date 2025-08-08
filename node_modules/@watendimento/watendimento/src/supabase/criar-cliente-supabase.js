const { createClient } = require("@supabase/supabase-js");

function criarClienteSupabase({ url, token }) {
  return createClient(url, token);
}

module.exports = criarClienteSupabase;
