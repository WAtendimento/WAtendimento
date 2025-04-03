const fs = require('fs');
const {imagemParaTexto,} = require('../../src/vision/detector-texto');
const file = '../../dados/vision/image_example.jpeg';  // Caminho do arquivo
const consultaOpenAI = require('../../src/waissistente/consulta-open-ai');



//IMPORTANTE - Definir a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
process.env.GOOGLE_APPLICATION_CREDENTIALS = '../../credenciais/vision';



async function detectText(imagePath) {
  
  // Lê o conteúdo da imagem
  return { content: fs.readFileSync(imagePath) };
  
}

async function main(){
    const imagem = await detectText(file);
   
    //console.log(">>>> imagem ", imagem);
    const textoDetectado = await imagemParaTexto({image:imagem});  
    const textoUnico = textoDetectado.map(texto => texto.description).join("\n");
    //console.log(">>>> textoUnico ", textoUnico);  
    //console.log("---> textoDetectado", textoDetectado.description);
    let mensagemCorreta = "";
    mensagemCorreta = await consultaOpenAI({
      data: {
        OPENAI_API_KEY: "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",
        assistant_id: "asst_EJ2nQMkxC4SvQFyVd0n86Dpx",
        invoice_text: textoUnico
      }
    });
    //textoDetectado.forEach((texto) => console.log(texto.description));
    console.log(">>>>> Texto processado pela openAI: ", mensagemCorreta);
    console.log('>>> Resposta bot processado pela openAI: ', mensagemCorreta.invoice.respostaBot);
}
  
main();