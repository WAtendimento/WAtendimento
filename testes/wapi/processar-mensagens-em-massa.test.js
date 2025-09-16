import { processarMensagensEmMassa } from '../../src/wapi/processa-contatos-para-enviar-msgs.js';
import { createClient } from '@supabase/supabase-js';

// 🔒 Credenciais fixas neste arquivo
const supabaseCredentials = {
  table_data: {
    url: "https://ibeodbugpwcedcgeyzef.supabase.co", // URL do seu projeto Supabase
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliZW9kYnVncHdjZWRjZ2V5emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYxNzMyMTYsImV4cCI6MjA1MTc0OTIxNn0.0RTYv8S9jH3hHKzA4zHY8_oq-rGtC1Z1O8aTh2gI4Tg", // Token do Supabase
    table_contatos: "blu_contatos",
    table_chips: "blu_chips",
    table_pontos: "maxplural_pontos",
    table_pontuacao_corretor: "maxplural_pontuacao_corretor",
    table_metas: "maxplural_metas",
    table_atividades: "maxplural_valores_atividades",
  },
  chat: {
    url: "https://oasvdwczwlqnggmcdnlg.supabase.co",
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hc3Zkd2N6d2xxbmdnbWNkbmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0OTAxMDIsImV4cCI6MjA2MDA2NjEwMn0.zoty7QrMjXTa66ewxhGVxESiwApRmUO8O6Ct5U0Y40c', 
    table: "chats_watendimento",
  },
};

const supabase = createClient(
  supabaseCredentials.table_data.url,
  supabaseCredentials.table_data.token
);

await processarMensagensEmMassa(
  "Tudo bem? Passando para dizer que setembro é o mês perfeito para viver experiências únicas com a Blu Estadias. 🌴💙\n\nTemos tarifas especiais nos destinos mais paradisíacos do Brasil.\nMe chama aqui e te ajudo a escolher o lugar perfeito!",
  5,
  '',
   supabaseCredentials,
  supabase,
  1,
  "bluestadias",
  'SERIAL_CONTATOS',
  false 
);
