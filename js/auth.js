// ==================================================
// CONFIGURAÇÕES & CONSTANTES
// ==================================================
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";

// ==================================================
// 1. EVENT LISTENERS (UX)
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    // Permite fazer login apertando ENTER no campo de senha
    const inputSenha = document.getElementById('loginSenha');
    if(inputSenha) {
        inputSenha.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') fazerLogin();
        });
    }

    // Limpa sessão antiga ao entrar na tela de login
    localStorage.clear();
});

// ==================================================
// 2. LÓGICA DE LOGIN
// ==================================================
async function fazerLogin() {
    const emailInput = document.getElementById('loginUser');
    const senhaInput = document.getElementById('loginSenha');

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // Validação Básica
    if (!email || !senha) {
        return Swal.fire({
            icon: 'warning',
            title: 'Campos vazios',
            text: 'Por favor, informe seu e-mail e senha.',
            confirmButtonColor: '#6366F1'
        });
    }

    // Feedback visual (Loading)
    toggleLoading(true);

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        // Tratamento de Erros Específicos
        if (res.status === 403 || res.status === 401) {
            throw new Error('E-mail ou senha incorretos.');
        }
        if (!res.ok) {
            throw new Error('Erro de conexão com o servidor.');
        }

        const data = await res.json();

        // Sucesso: Salvar Sessão
        if (data.token) {
            localStorage.setItem('token', "Bearer " + data.token);
            localStorage.setItem('donoNome', data.nome);
            localStorage.setItem('userPerfil', data.perfil);

            // Redirecionamento suave
            Swal.fire({
                icon: 'success',
                title: 'Bem-vindo!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1000
            }).then(() => {
                window.location.href = "admin.html";
            });
        }

    } catch (error) {
        console.warn('Login falhou:', error.message); // Log discreto apenas para debug
        Swal.fire({
            icon: 'error',
            title: 'Acesso Negado',
            text: error.message,
            confirmButtonColor: '#EF4444'
        });
    } finally {
        toggleLoading(false);
    }
}

// ==================================================
// 3. LÓGICA DE CADASTRO (NOVO DONO)
// ==================================================
async function cadastrarNovoDono() {
    const nomeInput = document.getElementById('regNome');
    const emailInput = document.getElementById('regEmail');
    const senhaInput = document.getElementById('regSenha');

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // Validações
    if (!nome || !email || !senha) {
        return Swal.fire('Atenção', 'Preencha todos os campos.', 'warning');
    }
    if (senha.length < 6) {
        return Swal.fire('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.', 'warning');
    }

    toggleLoading(true);

    try {
        const res = await fetch(`${API_URL}/barbeiros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                especialidade: 'Dono',       // Define perfil administrativo
                comissaoPorcentagem: 100.0   // Dono inicia com 100%
            })
        });

        if (res.status === 201) {
            // Sucesso
            Swal.fire({
                icon: 'success',
                title: 'Conta Criada!',
                text: 'Faça login agora para configurar sua barbearia.',
                confirmButtonColor: '#6366F1'
            }).then(() => {
                toggleForms(); // Volta para login
                // Limpa formulário
                nomeInput.value = '';
                emailInput.value = '';
                senhaInput.value = '';
            });
        } else {
            // Tenta ler mensagem de erro do backend (ex: Email duplicado)
            const erroTexto = await res.text();
            throw new Error(erroTexto || 'Não foi possível criar a conta.');
        }

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Erro no Cadastro',
            text: 'Verifique se este e-mail já está em uso.',
            confirmButtonColor: '#EF4444'
        });
    } finally {
        toggleLoading(false);
    }
}

// ==================================================
// 4. UTILITÁRIOS VISUAIS
// ==================================================

function toggleForms() {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    // Verifica se login está visível (check simples)
    const isLoginVisible = loginForm.style.display !== 'none';

    if (isLoginVisible) {
        // Mudar para Cadastro
        fadeOut(loginForm, () => {
            fadeIn(registerForm);
        });
    } else {
        // Mudar para Login
        fadeOut(registerForm, () => {
            fadeIn(loginForm);
        });
    }
}

// Helpers de Animação simples (substituindo classes CSS complexas se necessário)
function fadeOut(element, callback) {
    element.style.opacity = 1;
    (function fade() {
        if ((element.style.opacity -= .1) < 0) {
            element.style.display = "none";
            if (callback) callback();
        } else {
            requestAnimationFrame(fade);
        }
    })();
}

function fadeIn(element) {
    element.style.opacity = 0;
    element.style.display = "block";
    (function fade() {
        var val = parseFloat(element.style.opacity);
        if (!((val += .1) > 1)) {
            element.style.opacity = val;
            requestAnimationFrame(fade);
        }
    })();
}

// Wrapper para o loading (garante compatibilidade com utils.js ou fallback)
function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        if(show) {
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
        } else {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    }
}