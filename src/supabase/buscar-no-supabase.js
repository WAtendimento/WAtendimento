const { gerarVariacoesDeTelefone } = require('../utils/gerar-variacoes-telefone'); 
/**
 * Função genérica para buscar dados no Supabase.
 *
 * @param {string} tabela - Nome da tabela no Supabase.
 * @param {Object} filtros - Objeto contendo os campos e valores para busca, incluindo operador. Para strings e operador '=' será convertido para ilike com %string%
 * @param {string[]} camposSelecionados - Array de strings com os campos para selecionar.
 * @param {boolean} [usarVariacoesTelefone=true] - Indica se deve usar variações de telefone para busca.
 * @param {number} [limiteRegistros] - Número máximo de registros a serem retornados.
 *
 * @returns {Promise<Object>} Resultado da busca.
 */
async function buscarNoSupabase(supabase, tabela, filtros, camposSelecionados = [], usarVariacoesTelefone = true, limiteRegistros) {
  if (!tabela || typeof tabela !== 'string') {
    throw new Error('O parâmetro "tabela" é obrigatório e deve ser uma string.');
  }

  if (typeof filtros !== 'object' || filtros === null) {
    throw new Error('O parâmetro "filtros" deve ser um objeto.');
  }

  const operadoresValidos = ['=', '>', '>=', '<', '<=', '!=', 'not'];

  // Validar os filtros no formato { campo: [operador, valor] }
  Object.entries(filtros).forEach(([campo, condicao]) => {
    if (!Array.isArray(condicao) || condicao.length !== 2) {
      throw new Error(`O filtro para o campo "${campo}" deve ser um array no formato [operador, valor].`);
    }

    const [operador, valor] = condicao;

    if (!operadoresValidos.includes(operador)) {
      throw new Error(`Operador "${operador}" inválido para o campo "${campo}".`);
    }
  });

  const chavesDosFiltros = Object.keys(filtros);

  const nomeFiltro = ['telefone', 'connected_phone', 'valor_config'];
  let contatoExistente = null;

  try {
    // Gerar variações de telefone, caso seja solicitado e o filtro seja de telefone
    if (usarVariacoesTelefone && nomeFiltro.some((filtro) => chavesDosFiltros.includes(filtro))) {

      const chaveTelefone = nomeFiltro.find((k) => k in filtros);
      const valorOriginal = filtros[chaveTelefone][1];
      const regexTelefone = /^55\d{10,13}$/;

      if (!regexTelefone.test(valorOriginal)) {
        console.log(">>> Valor não parece telefone (provavelmente é um LID). Pulando geração de variações...");
      } else {
        let contador = 0;
        let variacoes = [];
        nomeFiltro.forEach((filtro) => {
          if (filtros[filtro]) {
            variacoes = gerarVariacoesDeTelefone(filtros[filtro][1]);
          }
        });

        for (const variacaoTelefone of variacoes) {
          nomeFiltro.forEach((filtro) => {
            if (filtros[filtro]) {
              filtros[filtro][1] = gerarVariacoesDeTelefone(variacaoTelefone)[contador];
            }
          });

          let query = supabase.from(tabela).select(camposSelecionados.length ? camposSelecionados.join(',') : '*');

          // Aplicando filtros com operadores
          Object.entries(filtros)
            .filter(([_, condicao]) => condicao[1] !== null)
            .forEach(([campo, condicao]) => {
              const [operador, valor] = condicao;

              switch (operador) {
                case '=':
                  if (typeof valor === 'string') {
                    // Use `ilike` para ignorar case quando o valor for string
                    query = query.ilike(campo, `%${valor}%`);
                  } else {
                    query = query.eq(campo, valor);
                  }
                  break;
                case '>':
                  query = query.gt(campo, valor);
                  break;
                case '>=':
                  query = query.gte(campo, valor);
                  break;
                case '<':
                  query = query.lt(campo, valor);
                  break;
                case '<=':
                  query = query.lte(campo, valor);
                  break;
                case '!=':
                  query = query.neq(campo, valor);
                  break;
                case 'not':
                  query = query.not(campo, 'is', valor);
                  break;
                default:
                  throw new Error(`Operador "${operador}" não suportado para o campo "${campo}".`);
              }
            });

          if (limiteRegistros) {
            query = query.limit(limiteRegistros);
          }

          const { data, error } = await query;
          if (data && data.length > 0) {
            // Registro encontrado, salva os dados e quebra o loop
            contatoExistente = data;
            break;
          }
          continue;
        }

        contador++;
      }
    }

    let query = supabase.from(tabela).select(camposSelecionados.length ? camposSelecionados.join(',') : '*');

    // Aplicando filtros com operadores
    Object.entries(filtros)
      .filter(([_, condicao]) => condicao[1] !== null)
      .forEach(([campo, condicao]) => {
        const [operador, valor] = condicao;
        if (typeof valor === 'string' && operador === '=') {
          // Caso seja uma string, use `ilike` para ignorar o case
          query = query.ilike(campo, `%${valor}%`);
        } else {
          switch (operador) {
            case '=':
              query = query.eq(campo, valor);
              break;
            case '>':
              query = query.gt(campo, valor);
              break;
            case '>=':
              query = query.gte(campo, valor);
              break;
            case '<':
              query = query.lt(campo, valor);
              break;
            case '<=':
              query = query.lte(campo, valor);
              break;
            case '!=':
              query = query.neq(campo, valor);
              break;
            default:
              throw new Error(`Operador "${operador}" não suportado para o campo "${campo}".`);
          }
        }
      });

    if (limiteRegistros) {
      query = query.limit(limiteRegistros);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar dados no Supabase: ${error.message}`);
    }
    return data;
  } catch (error) {
    console.error(error.message);
    throw error;
  }
}

module.exports = { buscarNoSupabase };

