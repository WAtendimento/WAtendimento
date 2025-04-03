const { createClient } = require("@supabase/supabase-js");
const supabaseCredentials = require("../../credenciais/supabase");

const { url, token } = supabaseCredentials.table_data;

// Criação do cliente Supabase
const supabase = createClient(url, token);

module.exports = supabase;