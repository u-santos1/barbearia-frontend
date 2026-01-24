// ==================================================
// CONFIGURAÇÕES GLOBAIS E UTILITÁRIOS
// ==================================================

// 🔗 Link oficial do seu Back-End (Spring Boot)
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";

// Estado Global (Compartilhado entre scripts)
const state = {
    barbeiroId: null,
    servicoId: null,
    data: null,
    hora: null,
    // Recupera o token salvo no navegador para usar nas requisições privadas
    token: localStorage.getItem('token'),
    donoNome: localStorage.getItem('donoNome')
};

// --- Funções de UI (Loading) ---
function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) loader.style.display = 'none';
}

// --- Formatação de Dinheiro ---
function formatarMoeda(valor) {
    // O "|| 0" evita erro se o backend mandar null ou undefined
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

// --- Tema e Personalização (Salvo no LocalStorage) ---
function carregarTemaGlobal() {
    const salvo = localStorage.getItem('site_config');
    if(salvo) {
        try {
            const tema = JSON.parse(salvo);

            // Aplica a cor principal
            document.documentElement.style.setProperty('--primary', tema.cor);

            // Atualiza o nome da barbearia (Logos)
            const logos = document.querySelectorAll('.logo span');
            logos.forEach(el => el.innerText = tema.nome.replace('Barber', ''));

            // Atualiza fundo da Home (apenas se estiver na home e tiver o elemento .hero)
            const hero = document.querySelector('.hero');
            if(hero && tema.bg) {
                hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${tema.bg}')`;
            }
        } catch(e) {
            console.error("Erro ao carregar tema salvo:", e);
        }
    }
}

// Inicializa o tema assim que qualquer página carregar
document.addEventListener('DOMContentLoaded', carregarTemaGlobal);