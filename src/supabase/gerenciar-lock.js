
// Função auxiliar: tenta adquirir lock via função SQL atômica
async function tentaAdquirirLock(supabase,telefoneContato, tabela, id_chip) {
  const agora = new Date();
  const timeoutMs = 30000; // 30 segundos
  const limite = new Date(agora.getTime() - timeoutMs);

  console.log('supabase', supabase);
  console.log('telefoneContato', telefoneContato);
  console.log('tabela', tabela);
  console.log('id_chip', id_chip);

  const { data, error } = await supabase.rpc('adquirir_lock', {
    p_telefone: telefoneContato,
    p_limite: limite.toISOString(),
    p_tabela: tabela,
    p_chip: id_chip,
  });

  console.log('Resultado adquirir_lock:', data);

  if (error) {
    console.error('[WAt][ERRO] ao chamar adquirir_lock:', error);
    return false;
  }

  return data === true;
}

// Função auxiliar: libera lock via update direto
async function liberaLock(supabase,tabela, telefoneContato, id_chip) {
  const { data, error } = await supabase.rpc('liberar_lock', {
    p_telefone: telefoneContato,
    p_tabela: tabela,
    p_chip: id_chip
  });

  if (error) {
    console.error('[WAt][ERRO] ao chamar liberar_lock:', error);
    return false;
  }
  return true;
}

module.exports = { tentaAdquirirLock, liberaLock };
