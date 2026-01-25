// ==================================================
// CONFIGURAÇÕES DO ADMIN (FINAL)
// ==================================================
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";
const DEV_MODE = false;

const state = {
    token: localStorage.getItem('token'),
    donoNome: localStorage.getItem('donoNome'),
    perfil: localStorage.getItem('userPerfil'), // Pega se é 'Dono' ou 'Barbeiro'
    cacheData: []
};

// ==================================================
// 1. INICIALIZAÇÃO & SEGURANÇA
// ==================================================
document.addEventListener('DOMContentLoaded', () => {

    // Verificação de Token
    if (!state.token && !DEV_MODE) {
        window.location.href = "login.html";
        return;
    }

    // Mostra nome do usuário
    document.getElementById('adminNameDisplay').innerText = state.donoNome || 'Usuário';

    // --- CONTROLE DE ACESSO (PERMISSÕES) ---
    // Se NÃO for Dono, esconde menus sensíveis
    if (state.perfil !== 'Dono') {
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            const texto = link.innerText;
            // Esconde Configuração, Equipe e Serviços
            if(texto.includes('Config') || texto.includes('Equipe') || texto.includes('Serviços')) {
                link.style.display = 'none';
            }
        });
    }

    // Carrega a aba padrão
    carregarAdminData('dashboard');
});

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// ==================================================
// 2. NAVEGAÇÃO E FETCH DE DADOS
// ==================================================
async function carregarAdminData(aba) {
    // UI: Atualiza Menu Lateral
    document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));

    // Tenta encontrar o link pelo onclick (ex: onclick="carregarAdminData('clientes')")
    const linkAtivo = document.querySelector(`.sidebar-nav a[onclick*="'${aba}'"]`) ||
                      document.querySelector(`.sidebar-nav a[onclick*='"${aba}"']`);
    if(linkAtivo) linkAtivo.classList.add('active');

    const container = document.getElementById('admin-content');
    const configSection = document.getElementById('config');

    // Se for Configuração (não precisa de fetch)
    if (aba === 'config') {
        container.style.display = 'none';
        configSection.style.display = 'block';
        carregarConfiguracoesSalvas();
        return;
    } else {
        container.style.display = 'block';
        configSection.style.display = 'none';
    }

    container.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fas fa-circle-notch fa-spin"></i> Carregando dados...</div>';

    // --- CONEXÃO COM O BACKEND ---
    try {
        let endpoint = '';

        // 1. Define qual rota chamar baseado na aba e no PERFIL
        if (aba === 'dashboard' || aba === 'agenda') {
            if (state.perfil === 'Dono') {
                endpoint = '/agendamentos/admin/todos'; // Dono vê tudo
            } else {
                endpoint = '/agendamentos/meus'; // Barbeiro vê só o dele
            }
        }
        else if (aba === 'servicos') {
            endpoint = '/servicos';
        }
        else if (aba === 'equipe') {
            endpoint = '/barbeiros';
        }
        else if (aba === 'clientes') { // <--- ATUALIZAÇÃO AQUI
            endpoint = '/clientes';
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': state.token }
        });

        if (res.status === 401 || res.status === 403) {
            Swal.fire('Sessão Expirada', 'Faça login novamente.', 'warning').then(() => logout());
            return;
        }

        if(!res.ok) throw new Error('Erro na requisição');

        state.cacheData = await res.json();

        // --- RENDERIZAÇÃO CONDICIONAL ---
        if (aba === 'dashboard') {
            if (state.perfil === 'Dono') {
                renderDashboardDono(container);
            } else {
                renderAgenda(container);
            }
        }
        else if (aba === 'agenda') renderAgenda(container);
        else if (aba === 'servicos') renderListaGerencia(container, 'servicos');
        else if (aba === 'equipe') renderListaGerencia(container, 'barbeiros');
        else if (aba === 'clientes') renderListaClientes(container); // <--- ATUALIZAÇÃO AQUI

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="text-align:center; color:red; padding:40px;">
            <i class="fas fa-exclamation-triangle"></i><br>
            Erro ao conectar.<br>
            <small>${e.message}</small>
        </div>`;
    }
}

// ==================================================
// 3. RENDERIZAÇÃO DAS TELAS
// ==================================================

// TELA EXCLUSIVA DO DONO (COM FINANCEIRO)
async function renderDashboardDono(container) {
    let financeiro = { faturamentoTotal: 0, lucroCasa: 0, repasseBarbeiros: 0, totalCortes: 0 };

    try {
        const res = await fetch(`${API_URL}/agendamentos/admin/financeiro`, {
             headers: { 'Authorization': state.token }
        });
        if(res.ok) financeiro = await res.json();
    } catch(e) { console.error("Erro financeiro", e); }

    const hojeStr = new Date().toISOString().split('T')[0];
    const agendamentosHoje = state.cacheData.filter(a => a.dataHoraInicio && a.dataHoraInicio.startsWith(hojeStr));

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="border-left: 5px solid #4F46E5;">
                <div class="stat-icon" style="background:#EEF2FF; color:#4F46E5;"><i class="fas fa-wallet"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:14px;">Total Bruto</h3>
                    <span style="font-size:22px; font-weight:bold; color:#1E293B;">${formatarMoeda(financeiro.faturamentoTotal)}</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid #10B981;">
                <div class="stat-icon" style="background:#D1FAE5; color:#059669;"><i class="fas fa-building"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:14px;">Lucro Casa</h3>
                    <span style="font-size:22px; font-weight:bold; color:#059669;">${formatarMoeda(financeiro.lucroCasa)}</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid #F59E0B;">
                <div class="stat-icon" style="background:#FEF3C7; color:#D97706;"><i class="fas fa-users"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:14px;">Comissões</h3>
                    <span style="font-size:22px; font-weight:bold; color:#D97706;">${formatarMoeda(financeiro.repasseBarbeiros)}</span>
                </div>
            </div>
        </div>

        <div style="background:white; padding:20px; border-radius:12px; margin-bottom:20px; border:1px solid #E2E8F0;">
            <canvas id="financeChart" style="max-height: 300px;"></canvas>
        </div>

        <div class="admin-card-container">
            <h3 style="margin-bottom:15px; color:#334155;">Hoje (${agendamentosHoje.length})</h3>
            <table class="data-table">
                <thead><tr><th>Hora</th><th>Cliente</th><th>Barbeiro</th><th>Valor</th></tr></thead>
                <tbody>
                    ${agendamentosHoje.map(a => `
                        <tr>
                            <td>${a.dataHoraInicio.split('T')[1].substring(0,5)}</td>
                            <td>${a.cliente?.nome}</td>
                            <td>${a.barbeiroNome || '---'}</td>
                            <td>${formatarMoeda(a.valorCobrado)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    renderizarGrafico(financeiro);
}

// TELA COMUM (AGENDA)
function renderAgenda(container) {
    // Ordena: Agendados primeiro, depois por horário
    const dados = state.cacheData.sort((a, b) => {
        if (a.status === 'AGENDADO' && b.status !== 'AGENDADO') return -1;
        if (a.status !== 'AGENDADO' && b.status === 'AGENDADO') return 1;
        return new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio);
    });

    const titulo = state.perfil === 'Dono' ? 'Visão Geral' : 'Minha Agenda';

    // Botão de Bloqueio (Mantido da etapa anterior)
    const btnBloqueio = `<button onclick="abrirModalBloqueio()" class="btn-primary" style="width:auto; float:right; background:#64748B; font-size:14px;"><i class="fas fa-ban"></i> Bloquear</button>`;

    let html = `
        <div style="margin-bottom:20px; overflow:hidden;">
            <h3 style="float:left; margin:0;">${titulo}</h3>
            ${state.perfil !== 'Dono' ? btnBloqueio : ''}
        </div>
    `;

    if (dados.length === 0) {
        html += '<div style="padding:40px; text-align:center; color:#64748B;">Nenhum agendamento hoje.</div>';
    }

    html += dados.map(a => {
        const isConcluido = a.status === 'CONCLUIDO';

        // Se estiver concluído, fica mais apagado (opacity 0.6)
        const estiloCard = isConcluido ? 'opacity: 0.6; background: #F1F5F9;' : 'background: white; border-left: 4px solid #4F46E5;';

        // Botões de Ação (Só aparecem se NÃO estiver concluído)
        const botoesAcao = !isConcluido ? `
            <div style="text-align:right; display:flex; gap:10px; justify-content:flex-end;">
                <button onclick="deletarAgendamento(${a.id})" style="color:#DC2626; background:none; border:none; cursor:pointer;" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>

                <button onclick="concluirAtendimento(${a.id})" class="btn-primary" style="width:auto; padding:5px 15px; font-size:12px; background:#10B981;">
                    <i class="fas fa-check"></i> Concluir
                </button>
            </div>
        ` : `<div style="text-align:right;"><span class="badge badge-concluido">Concluído</span></div>`;

        return `
        <div style="${estiloCard} padding:15px; border-radius:12px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#4F46E5; font-size:16px;">${formatarData(a.dataHoraInicio)}</strong>
                    <div style="font-weight:600; margin-top:2px;">${a.cliente?.nome || 'Cliente'}</div>
                    <small style="color:#64748B;">${a.servico?.nome} • ${a.barbeiroNome || 'Eu'}</small>
                </div>
                ${botoesAcao}
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// --- FUNÇÃO PARA ABRIR O MODAL DE BLOQUEIO ---
async function abrirModalBloqueio() {
    // Pega a data e hora atual para sugerir
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];

    const { value: form } = await Swal.fire({
        title: 'Bloquear Agenda',
        html: `
            <label style="display:block; text-align:left; font-size:12px;">Dia</label>
            <input id="bloq-data" type="date" class="swal2-input" value="${dataHoje}">

            <div style="display:flex; gap:10px;">
                <div>
                    <label style="display:block; text-align:left; font-size:12px;">Início</label>
                    <input id="bloq-inicio" type="time" class="swal2-input" value="12:00">
                </div>
                <div>
                    <label style="display:block; text-align:left; font-size:12px;">Fim</label>
                    <input id="bloq-fim" type="time" class="swal2-input" value="13:00">
                </div>
            </div>

            <label style="display:block; text-align:left; font-size:12px; margin-top:10px;">Motivo</label>
            <input id="bloq-motivo" type="text" class="swal2-input" placeholder="Ex: Almoço">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Bloquear',
        confirmButtonColor: '#64748B'
    });

    if (form) {
        // Monta o objeto para o Backend
        const data = document.getElementById('bloq-data').value;
        const inicio = document.getElementById('bloq-inicio').value;
        const fim = document.getElementById('bloq-fim').value;
        const motivo = document.getElementById('bloq-motivo').value;

        // Precisamos saber o ID do barbeiro logado.
        // TRUQUE: O backend pode pegar pelo Token se fizermos o endpoint certo,
        // mas para facilitar, vamos assumir que o usuário logado sabe o ID dele ou o backend infere.
        // O ideal é o backend pegar o ID do token. Vamos atualizar o Controller.

        await fetchApi('/bloqueios', 'POST', {
            // O backend vai ter que se virar para descobrir o ID ou passamos aqui se tivermos salvo no state
            // Vamos ajustar o Controller para pegar do Token, é mais seguro.
            inicio: `${data}T${inicio}:00`,
            fim: `${data}T${fim}:00`,
            motivo: motivo,
            barbeiroId: 0 // Placeholder, o backend deve ignorar isso e usar o token se for barbeiro
        });
    }
}

function renderListaGerencia(container, tipo) {
    const dados = state.cacheData;
    const titulo = tipo === 'servicos' ? 'Serviços' : 'Equipe';

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
            <h2 style="font-size:20px; margin:0;">Gerenciar ${titulo}</h2>
            <button onclick="adicionarItem('${tipo}')" class="btn-primary" style="width:auto; padding:10px 20px;">
                <i class="fas fa-plus"></i> Novo
            </button>
        </div>
    `;

    if(dados.length === 0) {
        html += '<p style="color:#64748B;">Nenhum registro encontrado.</p>';
    } else {
        html += dados.map(item => `
            <div style="background:white; padding:15px 20px; border-radius:12px; margin-bottom:10px; border:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight:600; color:#1E293B; font-size:15px;">${item.nome}</span>
                    ${item.preco ? `<br><small style="color:#64748B;">${formatarMoeda(item.preco)} • ${item.duracaoEmMinutos} min</small>` : ''}
                    ${item.email ? `<br><small style="color:#64748B;">${item.email} (Comissão: ${item.comissaoPorcentagem || 50}%)</small>` : ''}
                </div>
                <button onclick="deletarItem('${tipo}', ${item.id})" style="color:#EF4444; border:none; background:none; cursor:pointer; padding:5px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    container.innerHTML = html;
}

// ==================================================
// 4. AÇÕES CRUD (CREATE & DELETE)
// ==================================================

async function adicionarItem(tipo) {
    if (tipo === 'servicos') {
        const { value: form } = await Swal.fire({
            title: 'Novo Serviço',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome do Serviço">
                <input id="swal-preco" type="number" class="swal2-input" placeholder="Preço (Ex: 35.00)">
                <input id="swal-tempo" type="number" class="swal2-input" placeholder="Duração (minutos)">
            `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Salvar',
            preConfirm: () => [
                document.getElementById('swal-nome').value,
                document.getElementById('swal-preco').value,
                document.getElementById('swal-tempo').value
            ]
        });

        if (form && form[0]) {
            await fetchApi('/servicos', 'POST', {
                nome: form[0], preco: parseFloat(form[1]), duracaoEmMinutos: parseInt(form[2])
            });
            carregarAdminData('servicos');
        }
    }
    else if (tipo === 'barbeiros') {
        const { value: form } = await Swal.fire({
            title: 'Novo Profissional',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome">
                <input id="swal-email" class="swal2-input" placeholder="Email (Login)">
                <input id="swal-pass" type="password" class="swal2-input" placeholder="Senha">
                <label style="display:block; margin-top:15px; font-size:14px;">Comissão (%)</label>
                <input id="swal-comissao" type="number" class="swal2-input" placeholder="Ex: 50" value="50">
            `,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Cadastrar',
            preConfirm: () => [
                document.getElementById('swal-nome').value,
                document.getElementById('swal-email').value,
                document.getElementById('swal-pass').value,
                document.getElementById('swal-comissao').value
            ]
        });

        if (form && form[0]) {
            await fetchApi('/barbeiros', 'POST', {
                nome: form[0], email: form[1], senha: form[2], especialidade: 'Barbeiro',
                comissaoPorcentagem: parseFloat(form[3])
            });
            carregarAdminData('equipe');
        }
    }
}

async function deletarItem(tipo, id) {
    const result = await Swal.fire({
        title: 'Tem certeza?', text: "Irreversível.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sim, excluir'
    });
    if (result.isConfirmed) {
        await fetchApi(`/${tipo}/${id}`, 'DELETE');
        carregarAdminData(tipo === 'servicos' ? 'servicos' : 'equipe');
    }
}

async function deletarAgendamento(id) {
    const result = await Swal.fire({
        title: 'Cancelar?', text: "Horário ficará livre.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sim, cancelar'
    });
    if (result.isConfirmed) {
        await fetchApi(`/agendamentos/${id}/barbeiro`, 'DELETE'); // Usa rota de barbeiro que cancela
        carregarAdminData('agenda');
    }
}

// --- HELPER FETCH ---
async function fetchApi(endpoint, method, body = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': state.token }
        };
        if (body) options.body = JSON.stringify(body);
        const res = await fetch(`${API_URL}${endpoint}`, options);
        if (!res.ok) throw new Error('Falha');
        Swal.fire({ icon: 'success', title: 'Sucesso!', showConfirmButton: false, timer: 1500 });
        return res;
    } catch (error) {
        Swal.fire('Erro', 'Ação falhou.', 'error');
    }
}

// ==================================================
// 5. HELPERS VISUAIS & GRÁFICOS
// ==================================================

function renderizarGrafico(dados) {
    const ctx = document.getElementById('financeChart');
    if(!ctx) return;
    if(window.meuGrafico) window.meuGrafico.destroy();
    window.meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Lucro da Casa', 'Comissão Barbeiros'],
            datasets: [{
                data: [dados.lucroCasa, dados.repasseBarbeiros],
                backgroundColor: ['#10B981', '#F59E0B'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function statusClass(status) {
    if(!status) return 'agendado';
    const s = status.toLowerCase();
    if(s.includes('cancel')) return 'cancelado';
    if(s.includes('conclu') || s.includes('final')) return 'concluido';
    if(s.includes('confirm')) return 'confirmado';
    return 'agendado';
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(dataISO) {
    if(!dataISO) return '--/-- --:--';
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function carregarConfiguracoesSalvas() {
    const salvo = localStorage.getItem('site_config');
    if (salvo) {
        const tema = JSON.parse(salvo);
        if(document.getElementById('conf-color')) {
            document.getElementById('conf-color').value = tema.cor;
            document.getElementById('conf-name').value = tema.nome;
            document.getElementById('conf-bg').value = tema.bg;
            previewBg(tema.bg);
        }
    }
}

function salvarPersonalizacao() {
    const novoTema = {
        cor: document.getElementById('conf-color').value,
        nome: document.getElementById('conf-name').value,
        bg: document.getElementById('conf-bg').value
    };
    localStorage.setItem('site_config', JSON.stringify(novoTema));
    Swal.fire('Sucesso', 'Configurações salvas.', 'success');
}

function previewBg(url) {
    const div = document.getElementById('bg-preview');
    if(div) div.style.backgroundImage = `url('${url}')`;
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('show');
    document.querySelector('.sidebar-overlay').classList.toggle('show');
}
function renderListaClientes(container) {
    const dados = state.cacheData;

    container.innerHTML = `
        <h2 style="font-size:20px; margin-bottom:20px;">Base de Clientes</h2>
        <div class="admin-card-container">
            <table class="data-table">
                <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Ações</th></tr></thead>
                <tbody>
                    ${dados.map(c => `
                        <tr>
                            <td>${c.nome}</td>
                            <td>${c.telefone}</td>
                            <td>${c.email}</td>
                            <td>
                                <a href="https://wa.me/55${c.telefone}" target="_blank" style="color:#25D366; text-decoration:none;">
                                    <i class="fab fa-whatsapp"></i> Chamar
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
function renderListaClientes(container) {
    const dados = state.cacheData;

    container.innerHTML = `
        <h2 style="font-size:20px; margin-bottom:20px;">Base de Clientes</h2>
        <div class="admin-card-container">
            <table class="data-table">
                <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Ações</th></tr></thead>
                <tbody>
                    ${dados.map(c => `
                        <tr>
                            <td>${c.nome}</td>
                            <td>${c.telefone}</td>
                            <td>${c.email}</td>
                            <td>
                                <a href="https://wa.me/55${c.telefone}" target="_blank" style="color:#25D366; text-decoration:none;">
                                    <i class="fab fa-whatsapp"></i> Chamar
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
async function concluirAtendimento(id) {
    const result = await Swal.fire({
        title: 'Finalizar Serviço?',
        text: "Isso confirmará o pagamento e liberará a comissão.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Sim, concluir!',
        cancelButtonText: 'Ainda não'
    });

    if (result.isConfirmed) {
        await fetchApi(`/agendamentos/${id}/concluir`, 'PUT');

        // Recarrega a agenda para atualizar o status visualmente
        carregarAdminData('agenda');

        // Toca um som de caixa registradora (Opcional, mas clientes amam esse detalhe)
        // const audio = new Audio('https://www.myinstants.com/media/sounds/cash-register-sound.mp3');
        // audio.play();
    }
}