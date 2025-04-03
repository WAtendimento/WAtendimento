

async function testeCron(){
    console.log("------ RODANDO A CRON --------", new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    return true;
}

//testeCron();

//https://maxplural-42045741439.us-central1.run.app/webhook/testeCron

module.exports = testeCron;