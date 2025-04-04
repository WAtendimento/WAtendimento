const { autenticarDocs, getDocs } = require('../../src/sheets/instanciar-sheets');
const credentials = require('../../credenciais/sheets.json');
const sheetIds = require('../../dados/sheets/arquivo_sheets.json');

const main = async () => {
    console.log('Iniciando teste de autenticação das planilhas...');

    const docs = await autenticarDocs({ credentials, sheetIds });

    if (!docs) {
        console.error('Erro na autenticação.');
        return;
    }

    console.log('Docs autenticados. Tentando carregar info...');

    try {
        await getDocs(docs);
        console.log('Planilhas carregadas com sucesso!');
        
        console.log('Títulos das planilhas:');
        console.log('Cadastros:', docs.cadastros.title);
        console.log('Login:', docs.login.title);
        console.log('Moura:', docs.moura.title);
        console.log('Report:', docs.report.title);

    } catch (err) {
        console.error('Erro ao acessar as planilhas:', err);
    }
};

main();
