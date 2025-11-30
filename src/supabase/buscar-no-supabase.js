const { gerarVariacoesDeTelefone } = require('../utils/gerar-variacoes-telefone'); 

/**
 * Função genérica para buscar dados no Supabase.
 *
 * @param {string} tabela
 * @param {Object} filtros
 * @param {string[]} camposSelecionados
 * @param {boolean} [usarVariacoesTelefono=true]
 * @param {number} [limiteRegistros]
 *
 * @returns {Promise<Object>}
 */
async function buscarNoSupabase(
  supabase,
  tabela,
  filtros,
  camposSelecionados = [],
  usarVariacoesTelefone = true,
  limiteRegistros
) {
  if (!tabela || typeof tabela !== 'string') {
    throw new Error('O parâmetro "tabela" é obrigatório e deve ser uma string.');
  }

  if (typeof filtros !== 'object' || filtros === null) {
    throw new Error('O parâmetro "filtros" deve ser um objeto.');
  }

  const operadoresValidos = ['=', '>', '>=', '<', '<=', '!=', 'not'];

  // Validar filtros
  Object.entries(filtros).forEach(([campo, condicao]) => {
    if (!Array.isArray(condicao) || condicao.length !== 2) {
      throw new Error(`O filtro para o campo "${campo}" deve ser um array [operador, valor].`);
    }
    const [operador] = condicao;
    if (!operadoresValidos.includes(operador)) {
      throw new Error(`Operador "${operador}" inválido para o campo "${campo}".`);
    }
  });

  const chavesDosFiltros = Object.keys(filtros);

  // === ORIGINAL ===
  const nomeFiltro = ['telefone', 'connected_phone', 'valor_config'];

  // === CORREÇÃO AQUI ===
  // Detectar se o filtro é por identificador contendo telefone
  const telefoneRegex = /^55\d{10,13}$/;

  let identificadorPodeSerTelefone = false;

  if (filtros.identificador) {
    const valorId = Array.isArray(filtros.identificador)
      ? filtros.identificador[1]
      : filtros.identificador;

    if (typeof valorId === 'string' && telefoneRegex.test(valorId)) {
      identificadorPodeSerTelefone = true;
    }
  }

  // Modo variações: telefone, connected_phone, valor_config OU identificador que é telefone
  const deveGerarVariacoes =
    usarVariacoesTelefone &&
    (nomeFiltro.some((k) => chavesDosFiltros.includes(k)) || identificadorPodeSerTelefone);

  let contatoExistente = null;

  try {
    // ======================================================
    // === CORREÇÃO: GERAR VARIAÇÕES SE IDENTIFICADOR É TEL ===
    // ======================================================
    if (deveGerarVariacoes) {
      const camposPossiveis = [...nomeFiltro, 'identificador'];

      const campoParaVariacao = camposPossiveis.find((campo) => campo in filtros);

      const valorOriginal = filtros[campoParaVariacao][1];

      if (!telefoneRegex.test(valorOriginal)) {
        console.log("[WAt] Valor não parece telefone (provavelmente é um LID). Pulando geração de variações...");
      } else {
        let contador = 0;
        let variacoes = gerarVariacoesDeTelefone(valorOriginal);

        for (const variacaoTelefone of variacoes) {
          // Substituir SOMENTE o campo que está sendo variado
          filtros[campoParaVariacao][1] = gerarVariacoesDeTelefone(variacaoTelefone)[contador];

          let query = supabase
            .from(tabela)
            .select(camposSelecionados.length ? camposSelecionados.join(',') : '*');

          // Aplicar filtros
          Object.entries(filtros)
            .filter(([_, condicao]) => condicao[1] !== null)
            .forEach(([campo, condicao]) => {
              const [operador, valor] = condicao;

              switch (operador) {
                case '=':
                  query = query.eq(campo, valor);
                  break;
                case '>': query = query.gt(campo, valor); break;
                case '>=': query = query.gte(campo, valor); break;
                case '<': query = query.lt(campo, valor); break;
                case '<=': query = query.lte(campo, valor); break;
                case '!=': query = query.neq(campo, valor); break;
                case 'not': query = query.not(campo, 'is', valor); break;
              }
            });

          if (limiteRegistros) query = query.limit(limiteRegistros);

          const { data } = await query;

          if (data && data.length > 0) {
            contatoExistente = data; // encontrado!
            break;
          }
          continue;
        }

        contador++;
      }
    }

    // ======================================================
    // === SE NÃO ACHOU NA VARIAÇÃO, FAZ BUSCA NORMAL =======
    // ======================================================

    if (!contatoExistente) {
      let query = supabase
        .from(tabela)
        .select(camposSelecionados.length ? camposSelecionados.join(',') : '*');

      Object.entries(filtros)
        .filter(([_, condicao]) => condicao[1] !== null)
        .forEach(([campo, condicao]) => {
          const [operador, valor] = condicao;

          switch (operador) {
            case '=':
              query = query.eq(campo, valor);
              break;
            case '>': query = query.gt(campo, valor); break;
            case '>=': query = query.gte(campo, valor); break;
            case '<': query = query.lt(campo, valor); break;
            case '<=': query = query.lte(campo, valor); break;
            case '!=': query = query.neq(campo, valor); break;
            default:
              throw new Error(`Operador "${operador}" não suportado para o campo "${campo}".`);
          }
        });

      if (limiteRegistros) query = query.limit(limiteRegistros);

      const { data, error } = await query;

      if (error) throw new Error(`Erro ao buscar dados no Supabase: ${error.message}`);

      return data;
    }

    return contatoExistente;

  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

module.exports = { buscarNoSupabase };
