const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const credenciais = require('../../credenciais/sheets');
const arquivo = require('../../dados/sheets/arquivo_sheets.json');

const autenticarDocs = async () => {
    try {
        // Crie o cliente JWT para autenticação
        const auth = new JWT({
            key: credenciais.private_key,
            email: credenciais.client_email,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // Usando 'await' para autenticação assíncrona
        await auth.authorize();

        const doc_cadastros = new GoogleSpreadsheet(arquivo.id_cadastros, auth);
        const doc_login = new GoogleSpreadsheet(arquivo.id_login, auth);
        const doc_moura = new GoogleSpreadsheet(arquivo.id_sheet_i_moura, auth);
        const doc_report = new GoogleSpreadsheet(arquivo.id_sheet_report, auth);

        const docs = {
            cadastros: doc_cadastros,
            login: doc_login,
            moura: doc_moura,
            report: doc_report
        };

        //console.log("Planilhas criadas com sucesso");
        return docs; // Retorna a estrutura 'docs' com as planilhas autenticadas
    } catch (err) {
        console.error('Erro na autenticação:', err);
        return []; // Caso ocorra erro, retorna um array vazio
    }
};

const getDocs = async (docs) => {
    
    try {
        await docs.cadastros.loadInfo();
        await docs.login.loadInfo();
        await docs.moura.loadInfo();
        await docs.report.loadInfo();


    } catch (err) {
        console.error('Erro ao acessar a planilha:', err);
    }
}

module.exports = {
    getDocs: getDocs, 
    autenticarDocs: autenticarDocs 
};
