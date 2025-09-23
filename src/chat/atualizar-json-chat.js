const { insertOuUpsert }  = require('../supabase/inserir-ou-atualizar-no-supabase');
const { buscarNoSupabase } = require('../supabase/buscar-no-supabase');
const { atualizarNoSupabase } = require('../supabase/atualizar-no-supabase');
const { uploadParaSupabase } = require('../supabase/upload-para-supabase');
const { createClient } = require('@supabase/supabase-js');
const { supabaseCredentials } = require('../../credenciais/supabase');

const supabase = createClient(supabaseCredentials.chat.url, supabaseCredentials.chat.token);

async function atualizarJSONChat({ id_chip, numeroContato, connectedPhone, fromMe, nomeContato, mensagem, tabelaContato, bot, supabaseClient }) {
  try {
    if (!id_chip || !numeroContato || !mensagem) return;

    
    const telefoneCliente = numeroContato.toString();

    // Define quem está enviando a mensagem
    const remetente = fromMe ? connectedPhone.toString() : telefoneCliente;

    const isMidia = typeof mensagem === 'string' && (mensagem.startsWith('https://') || mensagem.includes('base64,'));

    let conteudoCorrigido = mensagem;

    if (isMidia) {
      try {
        conteudoCorrigido = await uploadParaSupabase(mensagem, supabase);
        console.log('📤 Mídia enviada para Supabase com sucesso');
      } catch (err) {
        console.error('❌ Falha ao enviar mídia para Supabase:', err.message);
      }
    }

    const novaMensagem = {
      name: nomeContato || '',
      phone: remetente,
      role: fromMe ? 'sales' : 'customer',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('.')[0],
      message: conteudoCorrigido,
    };

    const clientes = await buscarNoSupabase(
      supabase,
      'chats_watendimento',
      {
        telefone: ['=', telefoneCliente],
        id_chip: ['=', id_chip],
        bot: ['=', bot],
      },
      ['json_conversa'],
      null,
      null,
      true
    );

    let jsonConversa = [];

    if (clientes && clientes.length > 0 && Array.isArray(clientes[0].json_conversa)) {
      const jsonOriginal = JSON.parse(JSON.stringify(clientes[0].json_conversa));

      jsonConversa = [...jsonOriginal, novaMensagem];
    } else {
      jsonConversa = [novaMensagem];
    }

    console.log('[WAt] Registrando mensagem na conversa...');
    // Insere ou atualiza na tabela de chats_watendimento
    // console.log('[WAt] Bot: ', bot);

    await insertOuUpsert(
      supabase,
      'chats_watendimento',
      {
        telefone: telefoneCliente,
        id_chip: id_chip,
        json_conversa: jsonConversa,
        bot: bot,
      },
      true,
      ['id_chip', 'telefone', 'bot'], 
      true
    );

    console.log('[WAt] Tabela contato normal: ', tabelaContato);
    console.log('[WAt] Telefone cliente: ', telefoneCliente);

    // Insere na tabela de contatos normal
    await atualizarNoSupabase(
      supabaseClient,
      tabelaContato,
      {
        telefone: telefoneCliente,
        id_chip: id_chip,
      },
      {json_conversa: jsonConversa}
    );

   console.log('[WAt] Atualizou json de chat no banco');

  } catch (error) {
    console.error('Erro ao registrar mensagem na conversa:', error.message);
  }
}


module.exports = { atualizarJSONChat };

// (async () => {
//   try {
//     const resultado = await atualizaJSONChat({
//       id_chip: 3,
//       numeroContato: '558196948615',
//       connectedPhone: '558694416060',
//       fromMe: true,
//       nomeContato: 'Concessionaria',
//       mensagem:
//         'Parece que foi',
//       //mensagem: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAYGBgYHBgcICAcKCwoLCg8ODAwODxYQERAREBYiFRkVFRkVIh4kHhweJB42KiYmKjY+NDI0PkxERExfWl98fKcBBgYGBgcGBwgIBwoLCgsKDw4MDA4PFhAREBEQFiIVGRUVGRUiHiQeHB4kHjYqJiYqNj40MjQ+TERETF9aX3x8p//CABEIBkAC4gMBIgACEQEDEQH/xAAyAAEAAgMBAQAAAAAAAAAAAAAAAQIDBAUGBwEBAQEBAQEAAAAAAAAAAAAAAAECAwQF/9oADAMBAAIQAxAAAAL1QAAAAAAAAAAAAfnH8T84/ifnH8T84/ifnH8T84/ifnH8T84/ifnH8T84/ifnH8T84/ifnH8T84/iUUtFGq/UP/AH//2Q==',
//     });

//     console.log('✅ Atualização concluída:', resultado);
//   } catch (erro) {
//     console.error('❌ Erro no teste:', erro.message);
//   }
// })();