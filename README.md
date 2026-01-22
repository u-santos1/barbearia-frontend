### 📂 2. Para o Repositório do FRONTEND (HTML/JS)

Crie um arquivo `README.md` na pasta onde ficam seus arquivos HTML/JS/CSS.

```markdown
# ✂️ Barbearia Web (Frontend)

Interface web responsiva para agendamento de serviços de barbearia. O sistema possui uma área pública para clientes e um painel administrativo protegido para gestão do negócio.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000)

## 🔗 Links

- **Acessar Site:** [https://barbearia-frontend-rose.vercel.app](https://barbearia-frontend-rose.vercel.app)
- **Repositório da API:** [https://github.com/u-santos1/barbearia-backend]

## 📱 Funcionalidades

### Cliente
- Visualização de barbeiros e serviços com preços atualizados.
- Validação de calendário (não permite agendar domingos/segundas).
- Login simplificado via ID.
- Cancelamento de horário pelo próprio usuário.

### Painel Admin (Dashboard)
- Login seguro.
- Gráficos de serviços mais populares.
- **Fluxo de Status:** Botões para Confirmar, Concluir (Faturar) e Cancelar agendamentos.
- Cadastro de novos funcionários e serviços.

## 🚀 Como rodar localmente

1. Clone este repositório.
2. Abra o arquivo `app.js`.
3. Altere a constante `API_URL` para apontar para seu backend local ou de produção:
   ```javascript
   // const API_URL = "[https://barbearia-backend-production-0dfc.up.railway.app](https://barbearia-backend-production-0dfc.up.railway.app)";
   const API_URL = "http://localhost:8080";
