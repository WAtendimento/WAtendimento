# 📦 Pacote NPM WAtendimento - Bot de Atendimento Integrado com IA

## 📌 Descrição
Este pacote fornece um conjunto de funções e rotas essenciais para um bot de atendimento automatizado, integrado com inteligência artificial e múltiplos serviços. Ele inclui:

- 📲 Comunicação com a API do WhatsApp (Wapi);
- 🤖 Integração com um assistente de IA;
- 🗄️ Conexão com o banco de dados Supabase;
- 📊 Integração com o Google Sheets;
- 🖼️ Processamento de imagens com a biblioteca Visio.

---

## 🚀 Instalação

Na pasta raiz do projeto crie um arquivo .npmrc e adicione a configuração do pacote, para isso pode utilizar o comando:

```sh
echo "@watendimento:registry=https://npm.pkg.github.com/" > .npmrc
```

Em seguida, rode o comando abaixo para instalar o pacote:

```sh
npm install @watendimento/watendimento
```

---

## 📚 Uso

### 🔧 Configuração no Projeto

Para utilizar as rotas e serviços do pacote, importe-o no seu projeto:

```javascript
const express = require("express");
const pacoteAtendimento = require("@watendimento/rotas"); // Pacote NPM com as rotas comuns
const minhasRotas = require("./rotas"); // Arquivo de rotas específicas do projeto

const app = express();

app.use(express.json({ limit: "10MB" }));

// Rotas do pacote (comuns)
app.use("/webhook", pacoteAtendimento.rotas);

// Rotas específicas do projeto
app.use("/meu-projeto", minhasRotas);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
```

No arquivo `rotas.js` do seu projeto, você pode definir rotas específicas, sem interferir nas rotas do pacote:

```javascript
const express = require("express");
const { minhaFuncaoEspecifica } = require("./controladores/minhasFuncoes");

const router = express.Router();

router.post("/minha-rota", minhaFuncaoEspecifica);

module.exports = router;
```

### 📌 Exemplo de Uso das Funções

#### 🔹 Processar Mensagem do WhatsApp
```javascript
const { processarMensagemJson } = require("nome-do-pacote");

const mensagemRecebida = { texto: "Olá, quero ajuda!" };
const resposta = await processarMensagemJson(mensagemRecebida);
console.log(resposta);
```

#### 🔹 Integração com IA
```javascript
const { assistenteIA } = require("nome-do-pacote");

const pergunta = "Qual é a previsão do tempo para hoje?";
const respostaIA = await assistenteIA(pergunta);
console.log(respostaIA);
```

#### 🔹 Consultar o Banco de Dados
```javascript
const { consultarBanco } = require("nome-do-pacote");

const usuarios = await consultarBanco("usuarios");
console.log(usuarios);
```

#### 🔹 Integração com Google Sheets
```javascript
const { atualizarPlanilha } = require("nome-do-pacote");

await atualizarPlanilha("PlanilhaID", [["Nome", "Email"]]);
console.log("Dados atualizados com sucesso!");
```

#### 🔹 Processamento de Imagens com Visio
```javascript
const { processarImagem } = require("nome-do-pacote");

const resultado = await processarImagem("imagem.jpg");
console.log(resultado);
```

---

## 🛠️ Tecnologias Utilizadas

- Node.js
- Express.js
- Supabase
- Google Sheets API
- API do WhatsApp (Wapi)
- Assistente de IA
- Biblioteca de processamento de imagens Visio

---

## 📄 Licença
Este projeto é proprietário e não pode ser usado, modificado ou distribuído sem autorização.

---

## 📬 Contato
Caso tenha dúvidas ou sugestões, entre em contato através do email: `maria@leev.cc`.

