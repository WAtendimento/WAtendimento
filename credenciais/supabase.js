const supabaseCredentials = {
  table_data: {
    url: "https://ibeodbugpwcedcgeyzef.supabase.co", // URL do seu projeto Supabase
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZW9kYnVncHdjZWRjZ2V5emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzMyMTYsImV4cCI6MjA1MTc0OTIxNn0.0RTYv8S9jH3hHKzA4zHY8_oq-rGtC1Z1O8aTh2gI4Tg", // Token do Supabase
    table_contatos: "maxplural_contatos", // Nome da tabela de contatos
    table_chips: "maxplural_chips", // Nome da tabela de chips //
    table_pontos: "maxplural_pontos", // Nome da tabela de pontos
    table_pontuacao_corretor: "maxplural_pontuacao_corretor", // Nome da tabela de pontuação do corretor
    table_metas: "maxplural_metas", // Nome da tabela de metas
    table_atividades: "maxplural_valores_atividades", // Nome da tabela de atividades
  },
  chat: {
    url: 'https://oasvdwczwlqnggmcdnlg.supabase.co',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hc3Zkd2N6d2xxbmdnbWNkbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0OTAxMDIsImV4cCI6MjA2MDA2NjEwMn0.zoty7QrMjXTa66ewxhGVxESiwApRmUO8O6Ct5U0Y40c', // Token do Supabase
    table: 'chats_watendimento',
  },
};


module.exports = { supabaseCredentials };
