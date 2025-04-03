# WAtendimento - Package

Pacote de funções e arquivos básicos da implementação do bot WAtendimento.

## 📋 Requisitos

Antes de iniciar, certifique-se de que você possui os seguintes requisitos instalados em seu ambiente:

- [Node.js]
- [Docker]

## 🚀 Instalação

1. Clone este repositório:

   ```sh
   git clone -b maxplural --single-branch https://github.com/dig-ie/bot-e-clientes.git

   cd bot-e-clientes
   ```

2. Instale as dependências:

   ```sh
   npm install
   ```

3. Configure as variáveis de ambiente (por enquanto não será necessário).

## ⚙️ Configuração
(configurações específicas)

## 🛠️ Uso

Para rodar:

```sh
npm start
```

## 📡 Endpoints

### Documentação:

- `POST webhook/receberWebhook` - Recebe o webhook ao chegar mensagem no whatsapp configurado e chama a função de integração do bot ao fluxo do cliente (integraBotComFuncoesDoCiente)
- `POST webhook/forcarEnvio` - Força envio de mensagem (manualmente)
- `POST webhook/atualizarBot` - Endpoint para receber o disparo webhook de atualização do bot (o disparo de webhook é configurado no github > bot nucleo > config > webhooks)
- `GET /node-version` - Consulta a versão do node. útil para consultar a versão node do ambiente cloud de implantação.

# Fluxo do endpoint/função `atualizarBot`: 
https://github.com/dig-ie/bot-e-clientes/blob/maxplural/atualizaBot.md

## 📜 Licença

## 👥 Autores

- **Maria** – [@mariacireno] (https://github.com/mariacireno
- **Lívia** – [@liviamfurtado] (https://github.com/liviamfurtado)
