# 📦 WAtendimento

Pacote privado com funções para integrações e automações de atendimento via WhatsApp.  

Repositório: [https://github.com/WAtendimento/WAtendimento](https://github.com/WAtendimento/WAtendimento)  
> Necessita autenticação para instalar.

---

## 📥 Instalação

### Via Personal Access Token (PAT)
```bash
npm install git+https://<TOKEN>@github.com/watendimento/watendimento.git

Via SSH
npm install git+ssh://git@github.com/watendimento/watendimento.git


É necessário ter uma chave SSH configurada no GitHub.

🔄 Atualização

No package.json, use o padrão MAJOR.MINOR.PATCH:

MAJOR: mudanças incompatíveis

MINOR: novas funcionalidades compatíveis

PATCH: correções e ajustes

Para atualizar no projeto:

npm update

📌 Uso
const { receberMensagem, processarMensagensEmMassa } = require('@watendimento/watendimento');