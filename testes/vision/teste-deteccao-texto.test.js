const fs = require('fs');
const { imagemParaTexto } = require('../../src/vision/detector-texto');
const credentials = require('../../credenciais/vision.json'); // agora é um .json válido

const imagePath = '../../dados/vision/image_example.jpeg';

const detectText = async () => {
    const imageBuffer = fs.readFileSync(imagePath);

    const detections = await imagemParaTexto({
        image: { content: imageBuffer },
        credentials: credentials
    });

    const texto = detections.map(t => t.description).join('\n');
    console.log('Texto detectado:', texto);
};

detectText();
