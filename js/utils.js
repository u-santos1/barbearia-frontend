// ==================================================
// CONFIGURAÇÕES GLOBAIS E UTILITÁRIOS
// ==================================================

const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";
// Número do dono da barbearia para notificações (Formato Internacional: 55 + DDD + Numero)
const WHATSAPP_BARBEARIA = "5521999999999";

const state = {
    barbeiroId: null,
    servicoId: null,
    data: null,
    hora: null,
    token: localStorage.getItem('token'),
    donoNome: localStorage.getItem('donoNome')
};

// --- Funções de UI ---
function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.style.display = 'none';
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

// --- MÁSCARAS DE INPUT (NOVO) ---
function aplicarMascaras() {
    // Máscara de Telefone (funciona para (00) 0000-0000 e (00) 00000-0000)
    const inputsTelefone = document.querySelectorAll('input[type="tel"], #regTelefone'); // Adiciona ID se necessário
    inputsTelefone.forEach(input => {
        IMask(input, { mask: '(00) 00000-0000' });
    });

    // Máscara de Preço (Dinheiro) - Usado no Admin
    const inputsPreco = document.querySelectorAll('#swal-preco'); // Inputs do SweetAlert
    // Nota: O SweetAlert recria o DOM, então a máscara deve ser aplicada no momento que abre.
    // Veremos isso no admin.js
}

// --- Tema e Personalização ---
function carregarTemaGlobal() {
    const salvo = localStorage.getItem('site_config');
    if(salvo) {
        try {
            const tema = JSON.parse(salvo);
            document.documentElement.style.setProperty('--primary', tema.cor);

            const logos = document.querySelectorAll('.logo span');
            logos.forEach(el => el.innerText = tema.nome.replace('Barber', ''));

            const hero = document.querySelector('.hero');
            if(hero && tema.bg) {
                hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${tema.bg}')`;
            }
        } catch(e) { console.error("Erro tema", e); }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarTemaGlobal();
    aplicarMascaras();
});