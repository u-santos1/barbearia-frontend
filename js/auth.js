// ==================================================
// LÓGICA DE AUTENTICAÇÃO
// ==================================================

// NOTA: API_URL e showLoading() vêm do arquivo js/utils.js

// 1. EVENTOS E INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    // Permite login com Enter
    const inputSenha = document.getElementById('loginSenha');
    if (inputSenha) {
        inputSenha.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fazerLogin();
        });
    }

    // Aplica máscara no campo de telefone de cadastro (se existir)
    const inputTelReg = document.getElementById('regTelefone');
    if (inputTelReg && typeof IMask !== 'undefined') {
        IMask(inputTelReg, { mask: '(00) 00000-0000' });
    }

    // Limpa sessão ao abrir a tela
    localStorage.clear();
});

// 2. LOGIN
async function fazerLogin() {
    const emailInput = document.getElementById('loginUser');
    const senhaInput = document.getElementById('loginSenha');

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!email || !senha) {
        return Swal.fire('Ops!', 'Informe e-mail e senha.', 'warning');
    }

    showLoading(); // Função global do utils.js

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        if (res.status === 403 || res.status === 401) throw new Error('Credenciais inválidas');
        if (!res.ok) throw new Error('Erro ao conectar no servidor');

        const data = await res.json();

        if (data.token) {
            localStorage.setItem('token', "Bearer " + data.token);
            localStorage.setItem('donoNome', data.nome);
            localStorage.setItem('userPerfil', data.perfil);

            window.location.href = "admin.html";
        }

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Acesso Negado',
            text: error.message === 'Credenciais inválidas' ? 'E-mail ou senha incorretos.' : 'Tente novamente.',
            confirmButtonColor: '#EF4444'
        });
    } finally {
        hideLoading();
    }
}

// 3. CADASTRO (Novo Dono)
async function cadastrarNovoDono() {
    const nome = document.getElementById('regNome').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const telefone = document.getElementById('regTelefone').value.replace(/\D/g, ''); // Novo Campo
    const senha = document.getElementById('regSenha').value.trim();

    if (!nome || !email || !senha || !telefone) {
        return Swal.fire('Campos vazios', 'Preencha todos os dados, incluindo WhatsApp.', 'warning');
    }

    showLoading();

    try {
        const res = await fetch(`${API_URL}/barbeiros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                email: email,
                telefone: telefone, // Envia o telefone para o WhatsApp funcionar
                senha: senha,
                especialidade: 'Dono',
                comissaoPorcentagem: 100.0
            })
        });

        if (res.status === 201) {
            Swal.fire({
                icon: 'success',
                title: 'Conta Criada!',
                text: 'Faça login agora para acessar.',
                confirmButtonColor: '#6366F1'
            }).then(() => {
                toggleForms();
                // Limpa campos
                document.getElementById('regNome').value = '';
                document.getElementById('regEmail').value = '';
                document.getElementById('regTelefone').value = '';
                document.getElementById('regSenha').value = '';
            });
        } else {
            const erro = await res.text();
            throw new Error(erro || 'Falha ao cadastrar');
        }
    } catch (e) {
        Swal.fire('Erro', 'Verifique se o e-mail já existe.', 'error');
    } finally {
        hideLoading();
    }
}

// 4. INTERFACE
function toggleForms() {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (loginForm.style.display !== 'none') {
        // Vai para Cadastro
        loginForm.style.opacity = 0;
        setTimeout(() => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            setTimeout(() => registerForm.style.opacity = 1, 50);
        }, 300);
    } else {
        // Vai para Login
        registerForm.style.opacity = 0;
        setTimeout(() => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            setTimeout(() => loginForm.style.opacity = 1, 50);
        }, 300);
    }
}