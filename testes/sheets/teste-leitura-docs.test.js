const {
    autenticarDocs,
    getDocs
} = require('../../src/sheets/instanciar-sheets');

const credentials = require('../../credenciais/sheets.json');
const sheetIds = require('../../dados/sheets/arquivo_sheets.json'); 

const testeSheets = async () => {
    const docs = await autenticarDocs({ credentials, sheetIds });
    if (docs) {
        await getDocs(docs);
    } else {
        console.log('Erro ao autenticar as planilhas');
    }
};

testeSheets();
