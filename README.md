# ✂️ Barbearia Web (Frontend)
---

## 🤖 Nota sobre o Desenvolvimento

Este Frontend foi desenvolvido com **assistência de Inteligência Artificial**.

Como o foco principal deste projeto de estudo é o **Backend (Java, Spring Boot, Arquitetura e Segurança)**, a interface web foi gerada para servir como cliente de consumo da API. O objetivo foi criar uma experiência visual funcional e agradável para validar as regras de negócio do servidor, otimizando o tempo de desenvolvimento.

---

Interface web responsiva e moderna para o Sistema de Agendamento de Barbearia. O projeto consome uma API RESTful para gerenciar horários, clientes e fluxo financeiro em tempo real.

![Status](https://img.shields.io/badge/Status-Concluído-success)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white)

## 🔗 Links Importantes

- **📱 Acessar Site (Demo):** [https://barbearia-frontend-rose.vercel.app](https://barbearia-frontend-rose.vercel.app)
- **🔙 Repositório da API (Backend):** [https://github.com/u-santos1/barbearia-backend]



## 💻 Sobre o Projeto

O frontend foi desenvolvido com foco em usabilidade (UX) e performance. Não utiliza frameworks pesados (como React ou Angular), sendo construído com **JavaScript Puro (Vanilla)** para garantir leveza e domínio dos fundamentos da web.

### Principais Bibliotecas Usadas:
- **SweetAlert2:** Para modais de confirmação e alertas bonitos.
- **Chart.js:** Para o gráfico de serviços mais vendidos no Dashboard.
- **Fetch API:** Para comunicação assíncrona com o Backend Java.

---

## 🚀 Funcionalidades

### 🧔 Para o Cliente
1.  **Agendamento Fácil:** Escolha de Barbeiro, Serviço e Horário.
2.  **Validação Inteligente:** Bloqueio de horários já ocupados e dias fechados (Domingo/Segunda).
3.  **Login via ID:** Sistema simplificado onde o cliente acessa seus dados com seu ID único.
4.  **Meus Agendamentos:** Visualização de histórico e opção de cancelamento.

### 🛡️ Para o Admin (Gestão)
1.  **Dashboard Financeiro:** Receita prevista, confirmada e total de atendimentos.
2.  **Fluxo de Status:**
    - `Confirmar`: Barbeiro sinaliza que viu o agendamento.
    - `Concluir`: Serviço finalizado e valor computado no caixa.
    - `Cancelar`: Libera a agenda para outro cliente.
3.  **Gestão de Equipe e Serviços:** Adicionar ou remover barbeiros e preços dinamicamente.

---

## 📸 Screenshots

| Área do Cliente | Dashboard Admin |
|:---:|:---:|
| *(Coloque um print da tela de agendamento aqui)* | *(Coloque um print do gráfico/lista aqui)* |

---

## ⚙️ Como rodar localmente

Se você quiser testar este frontend no seu computador:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/u-santos1/barbearia-frontend
    ```

2.  **Configure a API:**
    Abra o arquivo `app.js` e procure a linha da `API_URL`.
    
    *Para usar com o Backend online (Railway):*
    ```javascript
    const API_URL = "[https://barbearia-backend-production-0dfc.up.railway.app](https://barbearia-backend-production-0dfc.up.railway.app)";
    ```
    
    *Para usar com o Backend local (seu PC):*
    ```javascript
    const API_URL = "http://localhost:8080";
    ```

3.  **Execute:**
    Basta abrir o arquivo `index.html` no seu navegador ou usar uma extensão como **Live Server** no VS Code.

---

## 👨‍💻 Autor

Desenvolvido por **[Seu Nome]**.
Projeto Full Stack para portfólio.
