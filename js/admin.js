// ==================================================
// 1. CONFIGURAÇÕES GLOBAIS
// ==================================================
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";
const DEV_MODE = false;

// Estado da Aplicação
const state = {
    token: localStorage.getItem('token'),
    donoNome: localStorage.getItem('donoNome'),
    perfil: localStorage.getItem('userPerfil'), // 'Dono' ou 'Barbeiro'
    cacheData: []
};

// ==================================================
// 2. INICIALIZAÇÃO & SEGURANÇA
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificação de Segurança
    if (!state.token && !DEV_MODE) {
        window.location.href = "login.html";
        return;
    }

    // Exibir nome do usuário logado
    const displayElement = document.getElementById('adminNameDisplay');
    if (displayElement) {
        displayElement.innerText = state.donoNome || 'Usuário';
    }

    // Controle de Acesso (RBAC)
    if (state.perfil !== 'Dono') {
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            const texto = link.innerText;
            // Oculta menus administrativos para barbeiros comuns
            if (texto.includes('Config') || texto.includes('Equipe') || texto.includes('Serviços') || texto.includes('Clientes')) {
                link.parentElement.style.display = 'none'; // Esconde o wrapper do link se necessário
                link.style.display = 'none';
            }
        });
    }

    // Carrega configuração visual salva (tema)
    carregarConfiguracoesSalvas();

    // Inicia na Dashboard
    carregarAdminData('dashboard');
});

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('show');
    document.querySelector('.sidebar-overlay').classList.toggle('show');
}

// ==================================================
// 3. NAVEGAÇÃO E REQUISIÇÕES
// ==================================================
async function carregarAdminData(aba) {
    // 1. Atualiza UI (Menu Ativo)
    document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));

    // Procura o link clicado para marcar como ativo
    const linkAtivo = document.querySelector(`.sidebar-nav a[onclick*="'${aba}'"]`) ||
                      document.querySelector(`.sidebar-nav a[onclick*='"${aba}"']`);
    if (linkAtivo) linkAtivo.classList.add('active');

    // 2. Prepara Container
    const container = document.getElementById('admin-content');
    const configSection = document.getElementById('config');

    // Se for aba de Configuração (Local), não faz fetch
    if (aba === 'config') {
        if(container) container.style.display = 'none';
        if(configSection) configSection.style.display = 'block';
        return;
    }

    // Reseta visualização
    if(container) container.style.display = 'block';
    if(configSection) configSection.style.display = 'none';

    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-circle-notch fa-spin"></i> Carregando dados...
        </div>`;

    // 3. Determina Endpoint
    let endpoint = '';
    switch (aba) {
        case 'dashboard':
            endpoint = state.perfil === 'Dono' ? '/agendamentos/admin/todos' : '/agendamentos/meus';
            break;
        case 'agenda':
            endpoint = state.perfil === 'Dono' ? '/agendamentos/admin/todos' : '/agendamentos/meus';
            break;
        case 'servicos':
            endpoint = '/servicos';
            break;
        case 'equipe':
            endpoint = '/barbeiros';
            break;
        case 'clientes':
            endpoint = '/clientes';
            break;
        default:
            endpoint = '/agendamentos/meus';
    }

    // 4. Executa Requisição
    try {
        const dados = await apiFetch(endpoint);
        state.cacheData = dados; // Salva em cache local

        // 5. Renderiza a Tela Apropriada
        if (aba === 'dashboard') {
            state.perfil === 'Dono' ? renderDashboardDono(container) : renderAgenda(container);
        }
        else if (aba === 'agenda') renderAgenda(container);
        else if (aba === 'servicos') renderListaGerencia(container, 'servicos');
        else if (aba === 'equipe') renderListaGerencia(container, 'barbeiros');
        else if (aba === 'clientes') renderListaClientes(container);

    } catch (error) {
        container.innerHTML = `
            <div style="text-align:center; color:#EF4444; padding:40px;">
                <i class="fas fa-wifi" style="font-size:30px; margin-bottom:10px;"></i><br>
                <strong>Erro de Conexão</strong><br>
                <small>${error.message}</small>
                <br><br>
                <button onclick="carregarAdminData('${aba}')" class="btn-primary btn-sm">Tentar Novamente</button>
            </div>`;
    }
}

// ==================================================
// 4. RENDERIZAÇÃO (VIEWS)
// ==================================================

// --- DASHBOARD DO DONO (FINANCEIRO) ---
async function renderDashboardDono(container) {
    let financeiro = { faturamentoTotal: 0, lucroCasa: 0, repasseBarbeiros: 0 };

    try {
        financeiro = await apiFetch('/agendamentos/admin/financeiro');
    } catch (e) { console.warn("Erro ao carregar financeiro", e); }

    const hojeStr = new Date().toISOString().split('T')[0];
    // Filtra agendamentos de hoje apenas para a tabela rápida
    const agendamentosHoje = state.cacheData.filter(a => a.dataHoraInicio && a.dataHoraInicio.startsWith(hojeStr));

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card" style="border-left: 5px solid #4F46E5;">
                <div class="stat-icon" style="background:#EEF2FF; color:#4F46E5;"><i class="fas fa-wallet"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:12px; margin:0;">Total Bruto</h3>
                    <span style="font-size:20px; font-weight:bold; color:#1E293B;">${formatarMoeda(financeiro.faturamentoTotal)}</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid #10B981;">
                <div class="stat-icon" style="background:#D1FAE5; color:#059669;"><i class="fas fa-building"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:12px; margin:0;">Lucro Casa</h3>
                    <span style="font-size:20px; font-weight:bold; color:#059669;">${formatarMoeda(financeiro.lucroCasa)}</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid #F59E0B;">
                <div class="stat-icon" style="background:#FEF3C7; color:#D97706;"><i class="fas fa-users"></i></div>
                <div>
                    <h3 style="color:#64748B; font-size:12px; margin:0;">Comissões</h3>
                    <span style="font-size:20px; font-weight:bold; color:#D97706;">${formatarMoeda(financeiro.repasseBarbeiros)}</span>
                </div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
             <div class="admin-card-container" style="height:300px; display:flex; align-items:center; justify-content:center;">
                <canvas id="financeChart"></canvas>
            </div>
             <div class="admin-card-container" style="overflow-y:auto; height:300px;">
                <h3 style="margin-bottom:15px; font-size:16px; color:#334155;">Hoje (${agendamentosHoje.length})</h3>
                <table class="data-table">
                    <thead><tr><th>Hora</th><th>Cliente</th><th>Valor</th></tr></thead>
                    <tbody>
                        ${agendamentosHoje.length ? agendamentosHoje.map(a => `
                            <tr>
                                <td>${a.dataHoraInicio.split('T')[1].substring(0,5)}</td>
                                <td>${a.cliente?.nome || 'Anônimo'}</td>
                                <td>${formatarMoeda(a.valorCobrado)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center;">Sem movimentos hoje.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    renderizarGrafico(financeiro);
}

// --- AGENDA / MEUS AGENDAMENTOS ---
function renderAgenda(container) {
    // Lógica de Ordenação: Agendados primeiro, depois horário decrescente
    const dados = state.cacheData.sort((a, b) => {
        if (a.status === 'AGENDADO' && b.status !== 'AGENDADO') return -1;
        if (a.status !== 'AGENDADO' && b.status === 'AGENDADO') return 1;
        return new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio);
    });

    const titulo = state.perfil === 'Dono' ? 'Visão Geral' : 'Minha Agenda';
    const btnBloqueio = `<button onclick="abrirModalBloqueio()" class="btn-primary btn-sm" style="background:#64748B;"><i class="fas fa-ban"></i> Bloquear Horário</button>`;

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="page-title" style="margin:0;">${titulo}</h2>
            ${state.perfil !== 'Dono' ? btnBloqueio : ''}
        </div>
    `;

    if (dados.length === 0) {
        html += '<div style="padding:40px; text-align:center; color:#94A3B8;">Nenhum agendamento encontrado.</div>';
    } else {
        html += '<div style="display:flex; flex-direction:column; gap:10px;">';

        html += dados.map(a => {
            const isConcluido = a.status === 'CONCLUIDO';
            const isCancelado = a.status === 'CANCELADO';

            // Estilização do Card
            let estiloBorda = 'border-left: 4px solid #4F46E5;'; // Roxo (Agendado)
            let opacidade = '1';

            if(isConcluido) { estiloBorda = 'border-left: 4px solid #10B981;'; opacidade = '0.7'; }
            if(isCancelado) { estiloBorda = 'border-left: 4px solid #EF4444;'; opacidade = '0.6'; }

            // Botões de Ação
            const botoesAcao = (!isConcluido && !isCancelado) ? `
                <div style="display:flex; gap:10px;">
                    <button onclick="deletarAgendamento(${a.id})" style="color:#EF4444; background:none; border:none; cursor:pointer;" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button onclick="concluirAtendimento(${a.id})" class="badge badge-confirmado" style="border:none; cursor:pointer;">
                        <i class="fas fa-check"></i> Concluir
                    </button>
                </div>
            ` : `<span class="badge badge-${statusClass(a.status)}">${a.status}</span>`;

            return `
            <div style="background:white; padding:15px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05); ${estiloBorda} opacity:${opacidade}; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong style="color:#1E293B; font-size:16px;">${formatarData(a.dataHoraInicio)}</strong>
                        <span style="font-size:12px; color:#64748B;">(${a.servico?.nome || 'Serviço'})</span>
                    </div>
                    <div style="margin-top:4px; font-size:14px; color:#475569;">
                        <i class="fas fa-user" style="font-size:12px; margin-right:5px;"></i> ${a.cliente?.nome || 'Cliente'}
                        ${state.perfil === 'Dono' ? ` • <b>${a.barbeiroNome}</b>` : ''}
                    </div>
                </div>
                ${botoesAcao}
            </div>`;
        }).join('');

        html += '</div>';
    }

    container.innerHTML = html;
}

// --- GERENCIAMENTO (SERVIÇOS E BARBEIROS) ---
function renderListaGerencia(container, tipo) {
    const dados = state.cacheData;
    const titulo = tipo === 'servicos' ? 'Serviços' : 'Equipe';
    const icone = tipo === 'servicos' ? 'fa-cut' : 'fa-users';

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
            <h2 class="page-title"><i class="fas ${icone}"></i> Gerenciar ${titulo}</h2>
            <button onclick="adicionarItem('${tipo}')" class="btn-primary btn-sm">
                <i class="fas fa-plus"></i> Novo
            </button>
        </div>
    `;

    if (dados.length === 0) {
        html += '<p style="text-align:center; color:#94A3B8;">Nenhum registro encontrado.</p>';
    } else {
        html += '<div style="display:grid; gap:10px;">';
        html += dados.map(item => `
            <div style="background:white; padding:15px 20px; border-radius:10px; border:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight:600; color:#1E293B; font-size:15px;">${item.nome}</span>
                    <div style="font-size:13px; color:#64748B; margin-top:2px;">
                        ${item.preco ? `${formatarMoeda(item.preco)} • ${item.duracaoEmMinutos} min` : ''}
                        ${item.email ? `${item.email} • Comissão: ${item.comissaoPorcentagem || 50}%` : ''}
                    </div>
                </div>
                <button onclick="deletarItem('${tipo}', ${item.id})" style="color:#EF4444; border:none; background:none; cursor:pointer; padding:8px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
        html += '</div>';
    }
    container.innerHTML = html;
}

// --- LISTA DE CLIENTES ---
function renderListaClientes(container) {
    const dados = state.cacheData;

    container.innerHTML = `
        <h2 class="page-title" style="margin-bottom:20px;">Base de Clientes (${dados.length})</h2>
        <div class="admin-card-container">
            <table class="data-table">
                <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Contato</th></tr></thead>
                <tbody>
                    ${dados.map(c => {
                        const zapLink = c.telefone ? `https://wa.me/55${limparTelefone(c.telefone)}` : '#';
                        return `
                        <tr>
                            <td>${c.nome}</td>
                            <td>${c.telefone || '-'}</td>
                            <td>${c.email || '-'}</td>
                            <td>
                                ${c.telefone ? `
                                <a href="${zapLink}" target="_blank" style="color:#25D366; text-decoration:none; font-weight:600;">
                                    <i class="fab fa-whatsapp"></i> Chamar
                                </a>` : '<span style="color:#ccc;">Sem nº</span>'}
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================================================
// 5. AÇÕES (CRUD)
// ==================================================

// Função genérica para adicionar Serviços ou Barbeiros
async function adicionarItem(tipo) {
    if (tipo === 'servicos') {
        const { value: form } = await Swal.fire({
            title: 'Novo Serviço',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome (Ex: Corte Degradê)">
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

        if (form && form[0] && form[1]) {
            await apiFetch('/servicos', 'POST', {
                nome: form[0], preco: parseFloat(form[1]), duracaoEmMinutos: parseInt(form[2] || 30)
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
                    <input id="swal-tel" class="swal2-input" placeholder="WhatsApp (Com DDD)">
                    <input id="swal-pass" type="password" class="swal2-input" placeholder="Senha">
                    <label style="margin-top:10px; display:block; font-size:12px;">Comissão (%)</label>
                    <input id="swal-comissao" type="number" class="swal2-input" placeholder="Ex: 50" value="50">
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Cadastrar',
                didOpen: () => {
                    // Aplica máscara no campo de telefone do Admin
                    const inputTel = document.getElementById('swal-tel');
                    if(typeof IMask !== 'undefined') IMask(inputTel, { mask: '(00) 00000-0000' });
                },
                preConfirm: () => [
                    document.getElementById('swal-nome').value,
                    document.getElementById('swal-email').value,
                    document.getElementById('swal-tel').value.replace(/\D/g, ''), // Limpa o telefone
                    document.getElementById('swal-pass').value,
                    document.getElementById('swal-comissao').value
                ]
            });

            if (form && form[0] && form[1]) {
                await apiFetch('/barbeiros', 'POST', {
                    nome: form[0],
                    email: form[1],
                    telefone: form[2], // <--- AGORA ENVIA O TELEFONE
                    senha: form[3],
                    especialidade: 'Barbeiro',
                    comissaoPorcentagem: parseFloat(form[4])
                });
                carregarAdminData('equipe');
            }
        }
}

async function deletarItem(tipo, id) {
    const result = await Swal.fire({
        title: 'Tem certeza?', text: "Esta ação não pode ser desfeita.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sim, excluir'
    });

    if (result.isConfirmed) {
        await apiFetch(`/${tipo}/${id}`, 'DELETE');
        carregarAdminData(tipo === 'servicos' ? 'servicos' : 'equipe');
    }
}

async function deletarAgendamento(id) {
    const result = await Swal.fire({
        title: 'Cancelar Agendamento?', text: "O horário ficará disponível novamente.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Sim, cancelar'
    });

    if (result.isConfirmed) {
        // Usa rota que permite barbeiro cancelar
        await apiFetch(`/agendamentos/${id}/barbeiro`, 'DELETE');
        carregarAdminData('agenda');
    }
}

async function concluirAtendimento(id) {
    const result = await Swal.fire({
        title: 'Concluir Atendimento?',
        text: "Isso confirmará o pagamento e gerará a comissão.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Sim, concluir'
    });

    if (result.isConfirmed) {
        await apiFetch(`/agendamentos/${id}/concluir`, 'PUT');
        carregarAdminData('agenda');

        // Feedback sonoro opcional
        // const audio = new Audio('assets/cash.mp3'); audio.play().catch(e => {});
    }
}

async function abrirModalBloqueio() {
    const agora = new Date();
    const dataHoje = agora.toISOString().split('T')[0];

    const { value: form } = await Swal.fire({
        title: 'Bloquear Agenda',
        html: `
            <div style="text-align:left">
                <label style="font-size:12px;">Dia</label>
                <input id="bloq-data" type="date" class="swal2-input" value="${dataHoje}" style="margin:5px 0 15px 0;">

                <div style="display:flex; gap:10px;">
                    <div style="flex:1;">
                        <label style="font-size:12px;">Início</label>
                        <input id="bloq-inicio" type="time" class="swal2-input" value="12:00" style="margin:5px 0;">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:12px;">Fim</label>
                        <input id="bloq-fim" type="time" class="swal2-input" value="13:00" style="margin:5px 0;">
                    </div>
                </div>

                <label style="font-size:12px; margin-top:10px; display:block;">Motivo</label>
                <input id="bloq-motivo" type="text" class="swal2-input" placeholder="Ex: Almoço" style="margin:5px 0;">
            </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: 'Bloquear', confirmButtonColor: '#64748B',
        preConfirm: () => {
            return {
                data: document.getElementById('bloq-data').value,
                inicio: document.getElementById('bloq-inicio').value,
                fim: document.getElementById('bloq-fim').value,
                motivo: document.getElementById('bloq-motivo').value
            }
        }
    });

    if (form) {
        await apiFetch('/bloqueios', 'POST', {
            inicio: `${form.data}T${form.inicio}:00`,
            fim: `${form.data}T${form.fim}:00`,
            motivo: form.motivo,
            barbeiroId: 0 // Backend deve pegar ID do token
        });
        carregarAdminData('agenda');
    }
}

// ==================================================
// 6. UTILITÁRIOS (HELPERS)
// ==================================================

// Centraliza chamadas API para tratar Token e Erros num só lugar
async function apiFetch(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': state.token
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, options);

    // Tratamento de Sessão Expirada
    if (res.status === 401 || res.status === 403) {
        Swal.fire({
            title: 'Sessão Expirada',
            text: 'Por favor, faça login novamente.',
            icon: 'warning'
        }).then(() => logout());
        throw new Error('Sessão inválida');
    }

    if (!res.ok) {
        const erroMsg = await res.text();
        Swal.fire('Erro', 'Operação falhou.', 'error');
        throw new Error(erroMsg || 'Erro na requisição');
    }

    // Se for DELETE ou PUT sem retorno, ok
    if (method === 'DELETE') return true;

    // Tenta parsear JSON, se falhar retorna texto ou null
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    // Destrói gráfico anterior se existir
    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Lucro Casa', 'Comissões'],
            datasets: [{
                data: [dados.lucroCasa || 0, dados.repasseBarbeiros || 0],
                backgroundColor: ['#10B981', '#F59E0B'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, font: {size: 11} } }
            },
            cutout: '70%'
        }
    });
}

function carregarConfiguracoesSalvas() {
    const salvo = localStorage.getItem('site_config');
    if (salvo && document.getElementById('conf-color')) {
        const tema = JSON.parse(salvo);
        document.getElementById('conf-color').value = tema.cor || '#4F46E5';
        document.getElementById('conf-name').value = tema.nome || '';
        document.getElementById('conf-bg').value = tema.bg || '';
        previewBg(tema.bg);
    }
}

function salvarPersonalizacao() {
    const novoTema = {
        cor: document.getElementById('conf-color').value,
        nome: document.getElementById('conf-name').value,
        bg: document.getElementById('conf-bg').value
    };
    localStorage.setItem('site_config', JSON.stringify(novoTema));
    Swal.fire({
        icon: 'success',
        title: 'Configurações Salvas',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
    });
}

function previewBg(url) {
    const div = document.getElementById('bg-preview');
    if (div && url) div.style.backgroundImage = `url('${url}')`;
}

// Helpers de Formatação
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function formatarData(dataISO) {
    if (!dataISO) return '--/--';
    const d = new Date(dataISO);
    return d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) + ' ' +
           d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function statusClass(status) {
    if (!status) return 'agendado';
    const s = status.toLowerCase();
    if (s.includes('cancel')) return 'cancelado';
    if (s.includes('conclu') || s.includes('final')) return 'concluido';
    return 'agendado';
}

function limparTelefone(tel) {
    return tel ? tel.replace(/\D/g, '') : '';
}