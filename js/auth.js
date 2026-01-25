// ==================================================
// LÓGICA DE AUTENTICAÇÃO (LOGIN & CADASTRO)
// ==================================================

// 1. FUNÇÃO DE LOGIN
async function fazerLogin() {
    const email = document.getElementById('loginUser').value;
    const senha = document.getElementById('loginSenha').value;

    if(!email || !senha) return Swal.fire('Atenção', 'Preencha email e senha', 'warning');

    showLoading(); // Vem do utils.js

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email, senha })
        });

        if(!res.ok) {
            if(res.status === 403 || res.status === 401) throw new Error('Credenciais inválidas');
            throw new Error('Erro no servidor');
        }

        const data = await res.json();

        if(data.token) {
            // Salva dados no navegador
            localStorage.setItem('token', "Bearer " + data.token);
            localStorage.setItem('donoNome', data.nome);
            localStorage.setItem('userPerfil', data.perfil); // Importante para o Admin

            // Redireciona
            window.location.href = "admin.html";
        }

    } catch(e) {
        hideLoading();
        console.error(e);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao entrar',
            text: e.message === 'Credenciais inválidas' ? 'E-mail ou senha incorretos.' : 'Tente novamente.'
        });
    }
}

// 2. FUNÇÃO DE CADASTRO (CRIAR CONTA)
async function cadastrarNovoDono() {
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const senha = document.getElementById('regSenha').value;

    if(!nome || !email || !senha) return Swal.fire('Campos vazios', 'Preencha todos os dados.', 'warning');

    showLoading();

    try {
        // Envia para o Backend criar o Barbeiro (Dono)
        const res = await fetch(`${API_URL}/barbeiros`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                especialidade: 'Dono', // Força o perfil de Dono
                comissaoPorcentagem: 100.0 // Dono ganha 100% ou define depois
            })
        });

        if(res.status === 201) {
            Swal.fire({
                icon: 'success',
                title: 'Conta Criada!',
                text: 'Faça login agora para acessar o painel.',
                confirmButtonColor: '#6366F1'
            }).then(() => {
                toggleForms(); // Volta para a tela de login
                // Limpa campos
                document.getElementById('regNome').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regSenha').value = '';
            });
        } else {
            throw new Error('Falha ao cadastrar');
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível cadastrar. Verifique se o email já existe.', 'error');
    } finally {
        hideLoading();
    }
}

// 3. FUNÇÃO DE ALTERNAR TELAS (TOGGLE)
function toggleForms() {
    const loginInfo = document.getElementById('form-login');
    const regInfo = document.getElementById('form-register');

    // Se o login está visível (ou sem estilo inline definido), esconde ele e mostra cadastro
    if(loginInfo.style.display === 'none') {
        // MOSTRAR LOGIN
        regInfo.style.display = 'none';
        loginInfo.style.display = 'block';
        loginInfo.style.animation = "slideUp 0.5s ease-out";
    } else {
        // MOSTRAR CADASTRO
        loginInfo.style.display = 'none';
        regInfo.style.display = 'block';
        regInfo.style.animation = "slideUp 0.5s ease-out";
    }
}