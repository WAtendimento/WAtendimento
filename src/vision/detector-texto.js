const vision = require('@google-cloud/vision');

process.env.GOOGLE_APPLICATION_CREDENTIALS

async function imagemParaTexto({ image }) {
    try {
        // Cria um cliente da API Cloud Vision
        const client = new vision.ImageAnnotatorClient();

        // Realiza a detecção de texto
        const [result] = await client.textDetection({ image });

        // Extrai as anotações de texto
        const detections = result.textAnnotations;

        if (detections && detections.length > 0) {
            // Retorna o texto detectado
            return detections;
        } else {
            // Retorna texto informando que não houve detecção de texto na imagem
            return [];
        }
    } catch (error) {
        console.error('Erro na detecção de texto:', error);
        throw error; // Lança o erro para que o chamador possa tratá-lo
    }
}

module.exports = {
    imagemParaTexto: imagemParaTexto
};