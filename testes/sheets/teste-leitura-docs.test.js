const {
    autenticarDocs,
    getDocs
} = require('../../src/sheets/instanciar-sheets');

const testeSheets = async () => {
    const docs = await autenticarDocs();
    if (docs) {
        await getDocs(docs);
    } else {
        console.log('Erro ao autenticar as planilhas');
    }
};

testeSheets();