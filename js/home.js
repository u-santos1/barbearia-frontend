// ==================================================
// LÓGICA DA LANDING PAGE (HOME)
// ==================================================

// Garante que o utils.js carregou a API_URL
if (typeof API_URL === 'undefined') {
    console.error("Erro Crítico: utils.js não foi carregado.");
    var API_URL = "https://barbearia-backend-production-0dfc.up.railway.app"; // Fallback de segurança
}

document.addEventListener('DOMContentLoaded', () => {
    carregarServicosHome();
    setupMobileMenu();
    atualizarAnoCopyright();
});

// ==================================================
// 1. CARREGAMENTO DE SERVIÇOS
// ==================================================
async function carregarServicosHome() {
    const container = document.getElementById('services-container');
    if (!container) return; // Não estamos na home ou o elemento sumiu

    // Estado de Loading (Skeleton UI)
    // Isso evita que a tela fique branca enquanto carrega
    container.innerHTML = `
        <div class="loading-placeholder">
            <i class="fas fa-circle-notch fa-spin fa-2x" style="color:var(--primary)"></i>
            <p style="margin-top:10px; opacity:0.7;">Buscando melhores cortes...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/servicos`);

        if (!res.ok) throw new Error('Falha ao buscar serviços');

        const servicos = await res.json();

        // Caso não tenha serviços cadastrados
        if (servicos.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-sec);">
                    <i class="far fa-calendar-times" style="font-size: 30px; margin-bottom: 10px;"></i>
                    <p>Nenhum serviço disponível no momento.</p>
                </div>
            `;
            return;
        }

        // Renderiza os Cards
        container.innerHTML = servicos.map(s => `
            <div class="service-item" onclick="irParaAgendamento()" style="cursor: pointer;" title="Clique para agendar">
                <i class="fas fa-cut" style="font-size:32px; color:var(--primary); margin-bottom:20px;"></i>

                <h3>${s.nome}</h3>

                <div style="display:flex; justify-content:center; align-items:center; gap:5px; margin-bottom:15px; color:var(--text-sec); font-size:14px;">
                    <i class="far fa-clock"></i> <span>${s.duracaoEmMinutos} min</span>
                </div>

                <span class="service-price">
                    ${formatarMoeda(s.preco)}
                </span>

                <div style="margin-top:15px; font-size:12px; color:var(--primary); font-weight:600; text-transform:uppercase; opacity:0;">
                    Agendar <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `).join('');

        // Pequena animação CSS extra para o hover funcionar bem
        adicionarEfeitoHoverCards();

    } catch (error) {
        console.error("Erro API:", error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #EF4444; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
                <i class="fas fa-wifi" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>Não foi possível carregar a tabela de preços.</p>
                <button onclick="carregarServicosHome()" class="btn-outline" style="margin-top:15px; padding: 5px 15px; font-size:12px;">Tentar Novamente</button>
            </div>
        `;
    }
}

// ==================================================
// 2. UTILITÁRIOS DA HOME
// ==================================================

function irParaAgendamento() {
    window.location.href = "agendamento.html";
}

function setupMobileMenu() {
    // Fecha o menu se clicar em um link
    const links = document.querySelectorAll('.nav-menu a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('home-menu').classList.remove('show');
        });
    });
}

function atualizarAnoCopyright() {
    const el = document.getElementById('anoAtual');
    if (el) el.innerText = new Date().getFullYear();
}

// Pequeno script para melhorar a experiência visual dos cards
function adicionarEfeitoHoverCards() {
    const style = document.createElement('style');
    style.innerHTML = `
        .service-item:hover div[style*="opacity:0"] {
            opacity: 1 !important;
            transition: opacity 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}