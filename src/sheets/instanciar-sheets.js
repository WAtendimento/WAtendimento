// src/sheets/instanciar-sheets.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const autenticarDocs = async ({ credentials, sheetIds }) => {
    try {
        const auth = new JWT({
            key: credentials.private_key,
            email: credentials.client_email,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        await auth.authorize();

        const docs = {
            cadastros: new GoogleSpreadsheet(sheetIds.id_cadastros, auth),
            login: new GoogleSpreadsheet(sheetIds.id_login, auth),
            moura: new GoogleSpreadsheet(sheetIds.id_sheet_i_moura, auth),
            report: new GoogleSpreadsheet(sheetIds.id_sheet_report, auth),
        };

        return docs;
    } catch (err) {
        console.error('Erro na autenticação:', err);
        return null;
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
};

module.exports = {
    autenticarDocs,
    getDocs,
};
