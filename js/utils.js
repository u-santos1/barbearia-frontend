// ==================================================
// CONFIGURAÇÕES GLOBAIS (CONSTANTES)
// ==================================================
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";
const WHATSAPP_BARBEARIA = "5521999999999"; // Coloque o número do dono aqui

// ==================================================
// 1. FORMATADORES (HELPERS)
// ==================================================

/**
 * Formata números para Real (BRL)
 * Ex: 30.0 -> R$ 30,00
 */
function formatarMoeda(valor) {
    if (valor === undefined || valor === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/**
 * Formata datas ISO para o padrão brasileiro
 * Ex: 2026-01-30T14:00 -> 30/01/2026 14:00
 */
function formatarData(dataISO) {
    if (!dataISO) return '--/--';
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) + ' ' +
           d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

/**
 * Limpa formatação de telefone para enviar ao backend
 * Ex: (21) 9999-9999 -> 2199999999
 */
function limparTelefone(tel) {
    return tel ? tel.replace(/\D/g, '') : '';
}

// ==================================================
// 2. CONTROLE DE INTERFACE (UI)
// ==================================================

function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.remove('hidden');
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('hidden');
        loader.style.display = 'none';
    }
}

/**
 * Aplica máscaras de input usando IMask (se disponível)
 * Pode ser chamado manualmente ao abrir modais
 */
function aplicarMascaras(contexto = document) {
    if (typeof IMask === 'undefined') return;

    // Máscara de Telefone Geral
    const inputsTelefone = contexto.querySelectorAll('input[type="tel"], .mask-phone');
    inputsTelefone.forEach(input => {
        IMask(input, { mask: '(00) 00000-0000' });
    });
}

// ==================================================
// 3. MOTOR DE TEMAS (PERSONALIZAÇÃO)
// ==================================================
function carregarTemaGlobal() {
    const salvo = localStorage.getItem('site_config');
    if (salvo) {
        try {
            const tema = JSON.parse(salvo);

            // 1. Aplica Cor Principal
            if (tema.cor) {
                document.documentElement.style.setProperty('--primary', tema.cor);
            }

            // 2. Atualiza Nomes (Logos)
            if (tema.nome) {
                document.querySelectorAll('.logo span, .brand-logo span').forEach(el => {
                    // Mantém o ícone, troca só o texto se possível, ou ajusta conforme seu HTML
                    // Aqui assumimos que o span tem o texto "Barber"
                    el.innerText = tema.nome.split(' ')[0];
                });

                // Tenta atualizar o título da página também
                document.title = tema.nome + " - Agendamento";
            }

            // 3. Imagem de Fundo (Hero)
            if (tema.bg) {
                const hero = document.querySelector('.hero');
                if (hero) {
                    hero.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.6)), url('${tema.bg}')`;
                }
            }

        } catch (e) {
            console.warn("Erro ao carregar tema:", e);
        }
    }
}

// ==================================================
// 4. INICIALIZAÇÃO AUTOMÁTICA
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarTemaGlobal();
    aplicarMascaras();

    // Corrige altura de telas mobile (vh fix)
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

window.addEventListener('resize', () => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
});

// Ajusta a altura real para navegadores móveis (Safari/Chrome Mobile)
function ajustarAlturaMobile() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', ajustarAlturaMobile);
document.addEventListener('DOMContentLoaded', ajustarAlturaMobile);