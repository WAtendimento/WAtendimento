const vision = require('@google-cloud/vision');
const credentials = require('../../credenciais/vision.json');

async function imagemParaTexto({ image }) {
    try {
        // Cria o cliente com as credenciais passadas
        const client = new vision.ImageAnnotatorClient({
            credentials: credentials
        });

        // Realiza a detecção de texto
        const [result] = await client.textDetection({ image });

        const detections = result.textAnnotations;

        if (detections && detections.length > 0) {
            return detections;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Erro na detecção de texto:', error);
        throw error;
    }
}

module.exports = {
    imagemParaTexto
};
