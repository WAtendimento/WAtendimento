const { formatarTelefone } = require('../utils/formatar-telefone');

// Mapeamento dos meses
const mesesMap = {
  JANEIRO: '01',
  JANUARY: '01',
  FEBRUARY: '02',
  FEVEREIRO: '02',
  MARÇO: '03',
  MARCH: '03',
  ABRIL: '04',
  APRIL: '04',
  MAIO: '05',
  MAY: '05',
  JUNHO: '06',
  JUNE: '06',
  JULHO: '07',
  JULY: '07',
  AGOSTO: '08',
  AUGUST: '08',
  SETEMBRO: '09',
  SEPTEMBER: '09',
  OUTUBRO: '10',
  OCTOBER: '10',
  NOVEMBRO: '11',
  NOVEMBER: '11',
  DEZEMBRO: '12',
  DECEMBER: '12',
};

const limparTexto = (texto) => {
  return texto ? texto.replace(/\D/g, '') : ''; // Remove todos os caracteres não numéricos
};

// Função para extrair meses numéricos
const extrairMesesNumericos = (dados) => {
  return dados
    .map((dado) => {
      const mes = dado.toUpperCase().split('/')[0].trim();
      return mesesMap[mes] || null; // Retorna o número do mês ou null se não encontrado
    })
    .filter((mes) => mes !== null); // Remove valores nulos
};

// Função que busca aba por nome
const buscarAbaPorNome = async (doc, nomeAba) => {
  try {
    if (!doc) {
      console.error('Erro: a planilha ' + (doc ? doc.title : 'não possui título') + ' não foi carregada corretamente.');
      return null;
    }

    if (doc) {
      for (const aba of doc.sheetsByIndex) {
        if (aba.title === nomeAba) {
          return aba; // Retorna a aba se o nome corresponder
        }
      }
    } else {
      console.error('Abas não encontrada na planilha');
    }

    return null;
  } catch (err) {
    console.error('Erro ao buscar aba por nome:', err);
    return null; // Retorno nulo no caso de erro
  }
};

let inicioCampanha = '';
let mesSetup = '';
// Função que procura a data de setup de um contato por um valor
// TO - DO: Mudar essa funcao para receber um doc (sheet) e nao uma aba e
// dentro dela buscar a primeira aba
const buscarDataSetupPorValor = async (aba, colunaReferencia, valor) => {
  try {
    let mesSetup = await buscarCelulaPorValor(aba, colunaReferencia, 'MÊS DE SETUP', valor);
    console.log('Mês de setup:', mesSetup);
    if (!mesSetup) return null;
    inicioCampanha = await buscarCelulaPorValor(aba, colunaReferencia, 'INICIO DE CAMPANHA', valor);
    console.log('Inicio campanha:', inicioCampanha);

    // TRATAR MES E ANO
    mesSetup = extrairMesesNumericos([mesSetup])[0];
    // console.log('Mês de setup numérico:', mesSetup);

    anoSetup = inicioCampanha.split('/')[1];
    console.log('anoSetup', anoSetup);
    let mesAnoInicioCampanha = inicioCampanha.split('/')[0].substring(0, 2); // Obtém os 2 primeiros dígitos do mês
    console.log('mesAnoInicioCampanha', mesAnoInicioCampanha);
    // console.log('Ano de setup numérico:', anoSetup);
    let nomeAba1 = '';
    let nomeAba2 = '';

    if (mesSetup && anoSetup) {
      if (mesSetup.length === 1) {
        mesSetup = '0' + mesSetup;
      }
      nomeAba1 = mesSetup + '_' + anoSetup;
      nomeAba2 = mesAnoInicioCampanha + '_' + anoSetup;
      //console.log('Nome da aba:', nomeAba1);
    }

    return [nomeAba1, nomeAba2];
  } catch (err) {
    //console.error('Erro ao buscar data de setup:', err);
    return null; // Adicionado retorno nulo no caso de erro
  }
};

// Função que retorna o valor da célula de uma coluna específica, com base em um valor de referência
const buscarCelulaPorValor = async (aba, colunaReferencia, colunaRetorno, valorBuscado) => {
  try {
    await aba.loadHeaderRow();

    const headers = aba.headerValues;
    let indiceReferencia = headers.indexOf(colunaReferencia);
    let indiceRetorno = headers.indexOf(colunaRetorno);

    // console.log('Coluna de referência:', colunaReferencia);
    // console.log('Coluna de retorno:', colunaRetorno);

    // console.log('Indice de referencia:', indiceReferencia);
    // console.log('Indice de retorno:', indiceRetorno);
    // Verifica se as colunas necessárias existem
    if (indiceReferencia === -1) {
      console.log(`Coluna referencia ${colunaReferencia} não existe na aba "${aba.title}".`);
      return null;
    }
    if (indiceRetorno === -1) {
      console.log(`Coluna retorno ${colunaRetorno} não existe na aba "${aba.title}".`);
      return null;
    }

    // Obtém as linhas da aba
    const rows = await aba.getRows();

    // Percorre todas as células da coluna de referência
    for (let i = 0; i < rows.length; i++) {
      let valorCelula = rows[i]._rawData[indiceReferencia];
      //console.log(`Valor da célula na coluna ${i}: `, valorCelula);

      // Se a coluna for identificador (ID, CNPJ ou telefone), normaliza removendo caracteres especiais
      if (['ID', 'CNPJ', 'DIRECIONAMENTO'].includes(colunaReferencia.toUpperCase())) {
        valorCelula = limparTexto(valorCelula);
        valorBuscado = limparTexto(valorBuscado);
      }
      // Caso a coluna seja de telefones, o valor deve ser tratado
      if (colunaReferencia.toUpperCase().includes('PHONE') || colunaReferencia.toUpperCase().includes('TELEFONE')) {
        valorCelula = formatarTelefone(valorCelula);
        //console.log(`Valor formatado da célula na coluna ${i}: `, valorCelula);
      }

      // Verifica se o valor da célula é igual ao valor procurado
      if (valorCelula && valorCelula.toLowerCase() === valorBuscado.toLowerCase()) {
        //console.log(`Valor ${valorBuscado} encontrado na coluna ${i} da aba "${aba.title}".`);
        return rows[i]._rawData[indiceRetorno];
      }
    }

    console.log(`Valor ${valorBuscado} não encontrado em nenhuma aba da planilha ` + aba.title);
    return null; // Retorna null se não encontrar o valor buscado
  } catch (err) {
    console.error('Erro ao buscar coluna de retorno:', err);
    return null; // Adicionado retorno nulo no caso de erro
  }
};

module.exports = {
  buscarCelulaPorValor,
  buscarAbaPorNome,
  buscarDataSetupPorValor,
};
