// ==================================================
// LÓGICA DA LANDING PAGE (HOME)
// ==================================================

// 1. MENU MOBILE (Função Global para o onclick do HTML)
function toggleHomeMenu() {
    const menu = document.getElementById('home-menu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarServicosHome();
    setupLinksMobile(); // Fecha menu ao clicar em links
    atualizarAnoCopyright();
});

// ==================================================
// 3. CARREGAMENTO DE SERVIÇOS
// ==================================================
async function carregarServicosHome() {
    const container = document.getElementById('services-container');
    if (!container) return; // Se não estiver na home, para.

    // Loading State
    container.innerHTML = `
        <div class="loading-placeholder">
            <i class="fas fa-circle-notch fa-spin fa-2x" style="color:var(--primary, #4F46E5)"></i>
            <p style="margin-top:10px; opacity:0.7;">Buscando cortes...</p>
        </div>
    `;

    try {
        // Usa API_URL global ou fallback seguro
        const baseUrl = (typeof API_URL !== 'undefined') ? API_URL : "https://barbearia-backend-production-0dfc.up.railway.app";

        const res = await fetch(`${baseUrl}/servicos`);
        if (!res.ok) throw new Error('Falha ao buscar serviços');

        const servicos = await res.json();

        // Lista Vazia
        if (servicos.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748B;">
                    <i class="far fa-calendar-times" style="font-size: 30px; margin-bottom: 10px;"></i>
                    <p>Nenhum serviço disponível no momento.</p>
                </div>
            `;
            return;
        }

        // Renderiza Cards
        container.innerHTML = servicos.map(s => {
            // Formatação segura de moeda (caso utils.js falhe)
            const precoFormatado = typeof formatarMoeda === 'function'
                ? formatarMoeda(s.preco)
                : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.preco);

            return `
            <div class="service-item" onclick="irParaAgendamento()" style="cursor: pointer;" title="Agendar ${s.nome}">
                <i class="fas fa-cut" style="font-size:32px; color:var(--primary, #4F46E5); margin-bottom:20px;"></i>

                <h3>${s.nome}</h3>

                <div style="display:flex; justify-content:center; align-items:center; gap:5px; margin-bottom:15px; color:#64748B; font-size:14px;">
                    <i class="far fa-clock"></i> <span>${s.duracaoEmMinutos} min</span>
                </div>

                <span class="service-price">${precoFormatado}</span>

                <div class="card-hover-action" style="margin-top:15px; font-size:12px; color:var(--primary, #4F46E5); font-weight:600; text-transform:uppercase; opacity:0; transition: opacity 0.3s;">
                    Agendar <i class="fas fa-arrow-right"></i>
                </div>
            </div>
            `;
        }).join('');

        // Injeta CSS para o hover funcionar (via JS para não mexer no CSS agora)
        const style = document.createElement('style');
        style.innerHTML = `.service-item:hover .card-hover-action { opacity: 1 !important; }`;
        document.head.appendChild(style);

    } catch (error) {
        console.error("Erro na Home:", error);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #EF4444; background: #FEF2F2; border-radius: 8px;">
                <i class="fas fa-wifi" style="margin-bottom: 8px;"></i>
                <p>Erro ao carregar preços.</p>
            </div>
        `;
    }
}

// ==================================================
// 4. UTILITÁRIOS INTERNOS
// ==================================================

function irParaAgendamento() {
    window.location.href = "agendamento.html";
}

function setupLinksMobile() {
    const links = document.querySelectorAll('.nav-menu a');
    const menu = document.getElementById('home-menu');

    if(menu) {
        links.forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        });
    }
}

function atualizarAnoCopyright() {
    const el = document.getElementById('anoAtual');
    if (el) el.innerText = new Date().getFullYear();
}