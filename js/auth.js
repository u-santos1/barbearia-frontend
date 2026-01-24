// ==================================================
// LÓGICA DE LOGIN E CADASTRO
// ==================================================

// NOTA: A variável API_URL vem do arquivo js/utils.js.
// Certifique-se de carregar utils.js ANTES deste arquivo no HTML.

async function fazerLogin() {
    const email = document.getElementById('loginUser').value;
    const senha = document.getElementById('loginSenha').value;

    if(!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');

    showLoading(); // Função do utils.js

    try {
        // Conecta no endpoint: @PostMapping("/auth/login")
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email, senha })
        });

        if(!res.ok) {
            // Se o erro for 403 ou 401, é senha errada
            if(res.status === 403 || res.status === 401) throw new Error('Credenciais inválidas');
            throw new Error('Erro no servidor');
        }

        const data = await res.json();

        // Debug: Veja no console o que o back devolveu
        console.log("Login sucesso:", data);

        // O Back retorna TokenJWTData(String token, String nome)
        if(data.token) {
            localStorage.setItem('token', "Bearer " + data.token);
            localStorage.setItem('donoNome', data.nome); // Salva o nome para mostrar no Admin

            // Redireciona para o Dashboard
            window.location.href = "admin.html";
        } else {
            throw new Error("Token não recebido do servidor");
        }

    } catch(e) {
        hideLoading();
        console.error(e);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao entrar',
            text: e.message === 'Credenciais inválidas' ? 'E-mail ou senha incorretos.' : 'Tente novamente mais tarde.'
        });
    }
}

async function cadastrarNovoDono() {
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const senha = document.getElementById('regSenha').value;

    if(!nome || !email || !senha) return Swal.fire('Atenção', 'Preencha todos os campos', 'warning');

    showLoading();

    try {
        // Conecta no endpoint: @PostMapping("/barbeiros")
        // O DTO espera: nome, email, senha, especialidade
        const res = await fetch(`${API_URL}/barbeiros`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                especialidade: 'Dono' // Define como Dono automaticamente
            })
        });

        if(res.status === 201) {
            Swal.fire({
                icon: 'success',
                title: 'Conta Criada!',
                text: 'Faça login para acessar o painel.',
                confirmButtonColor: '#6366F1'
            }).then(() => {
                toggleForms(); // Volta para a tela de login
                // Limpa os campos
                document.getElementById('regNome').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regSenha').value = '';
            });
        } else {
            throw new Error('Falha ao criar conta');
        }
    } catch(e) {
        hideLoading();
        Swal.fire('Erro', 'Não foi possível cadastrar. Verifique se o email já existe.', 'error');
    } finally {
        hideLoading();
    }
}

function toggleForms() {
    const loginInfo = document.getElementById('form-login');
    const regInfo = document.getElementById('form-register');

    // Efeito de transição simples
    if(loginInfo.style.display === 'none') {
        regInfo.style.display = 'none';
        loginInfo.style.display = 'block';
        loginInfo.style.animation = "slideUp 0.5s ease-out";
    } else {
        loginInfo.style.display = 'none';
        regInfo.style.display = 'block';
        regInfo.style.animation = "slideUp 0.5s ease-out";
    }
}