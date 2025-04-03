const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const credenciais = require('../../credenciais/sheets');
const arquivo = require('../../dados/sheets/arquivo_sheets.json');

// Crie o cliente JWT para autenticação
const auth = new JWT({
    key: credenciais.private_key,
    email: credenciais.client_email,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

console.log('Inicializando documentos...');

auth.authorize((err, tokens) => {
    if (err) {
        console.error('Erro na autenticação:', err);
        return;
    }

    //console.log('Autenticação realizada com sucesso!');

    const doc_cadastros = new GoogleSpreadsheet(arquivo.id_cadastros, auth);
    const doc_revendas = new GoogleSpreadsheet(arquivo.id_login, auth);
    const doc_moura = new GoogleSpreadsheet(arquivo.id_sheet_i_moura, auth);
    const doc_report = new GoogleSpreadsheet(arquivo.id_sheet_report, auth);

    console.log("PLanilhas criadas com sucesso");

    const getDoc = async () => {

        try {
            await doc_cadastros.loadInfo();
            await doc_revendas.loadInfo();
            await doc_moura.loadInfo();
            await doc_report.loadInfo();

            console.log(doc_cadastros.title, doc_revendas.title, doc_moura.title, doc_report.title);    

        } catch (err) {
            console.error('Erro ao acessar a planilha:', err);
        }
    }

    getDoc();
    
 });
