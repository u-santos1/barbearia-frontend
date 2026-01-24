// ==================================================
// LÓGICA DA HOME PAGE
// ==================================================

// NOTA: Certifique-se de que o arquivo 'js/utils.js' foi carregado antes deste no HTML,
// pois precisamos da variável API_URL e da função formatarMoeda().

document.addEventListener('DOMContentLoaded', () => {
    carregarServicosHome();
});

async function carregarServicosHome() {
    const container = document.getElementById('services-container');

    // Se não encontrar o container (ex: está em outra página), para a execução.
    if(!container) return;

    try {
        // Conecta no endpoint: GET /servicos
        // O Backend retorna uma lista: [{id, nome, preco, duracaoEmMinutos}, ...]
        const res = await fetch(`${API_URL}/servicos`);

        if(!res.ok) throw new Error('Erro na resposta da API');

        const servicos = await res.json();

        // Se a lista estiver vazia
        if(servicos.length === 0) {
            container.innerHTML = '<p style="color:var(--text-sec); text-align:center; grid-column:1/-1;">Nenhum serviço cadastrado ainda.</p>';
            return;
        }

        // Gera os cards (mantendo o estilo Dark/Moderno que definimos)
        container.innerHTML = servicos.map(s => `
            <div class="service-item">
                <i class="fas fa-cut" style="font-size:30px; color:var(--primary); margin-bottom:15px;"></i>
                <h3>${s.nome}</h3>
                <p style="color:var(--text-sec); font-size:14px;">
                    <i class="far fa-clock"></i> ${s.duracaoEmMinutos} min
                </p>
                <span class="service-price">${formatarMoeda(s.preco)}</span>
            </div>
        `).join('');

    } catch(e) {
        console.error("Erro ao carregar serviços:", e);
        container.innerHTML = `
            <div style="text-align:center; grid-column:1/-1; color:var(--text-sec);">
                <i class="fas fa-wifi" style="font-size:24px; margin-bottom:10px; opacity:0.5;"></i>
                <p>Não foi possível carregar os serviços.</p>
            </div>
        `;
    }
}

// Menu Mobile (Hambúrguer)
function toggleHomeMenu() {
    const menu = document.getElementById('home-menu');
    if(menu) menu.classList.toggle('show');
}