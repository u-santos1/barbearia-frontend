// ==================================================
// CONFIGURAÇÕES DO ADMIN
// ==================================================
// Certifique-se que essa URL é exatamente onde seu Spring Boot está rodando
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";

// ⚠️ MODO DE PRODUÇÃO: Agora vamos conectar de verdade!
const DEV_MODE = false;

const state = {
    token: localStorage.getItem('token'),
    donoNome: localStorage.getItem('donoNome'),
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

    // Mostra nome do admin
    document.getElementById('adminNameDisplay').innerText = state.donoNome || 'Admin';

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
    const linkAtivo = document.querySelector(`.sidebar-nav a[onclick*="${aba}"]`);
    if(linkAtivo) linkAtivo.classList.add('active');

    const container = document.getElementById('admin-content');
    const configSection = document.getElementById('config');

    // Se for Configuração
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

        // Define qual rota chamar baseado na aba
        if (aba === 'dashboard' || aba === 'agenda') {
            endpoint = '/agendamentos/admin/todos'; // Seu AgendamentoController
        } else if (aba === 'servicos') {
            endpoint = '/servicos'; // Seu ServicoController
        } else if (aba === 'equipe') {
            endpoint = '/barbeiros'; // Seu BarbeiroController
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': state.token } // Envia o Token JWT
        });

        if (res.status === 401 || res.status === 403) {
            Swal.fire('Sessão Expirada', 'Faça login novamente.', 'warning')
                .then(() => logout());
            return;
        }

        if(!res.ok) throw new Error('Erro na requisição');

        state.cacheData = await res.json();

        // Renderiza a tela correta com os dados recebidos
        if (aba === 'dashboard') renderDashboard(container);
        if (aba === 'agenda') renderAgenda(container);
        if (aba === 'servicos') renderListaGerencia(container, 'servicos');
        if (aba === 'equipe') renderListaGerencia(container, 'barbeiros');

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div style="text-align:center; color:red; padding:40px;">
            <i class="fas fa-exclamation-triangle"></i><br>
            Erro ao conectar com o servidor.<br>
            <small>${e.message}</small>
        </div>`;
    }
}

// ==================================================
// 3. RENDERIZAÇÃO DAS TELAS
// ==================================================

function renderDashboard(container) {
    const dados = state.cacheData; // Lista de Agendamentos
    const total = dados.length;

    // Soma valorCobrado (Se vier null do back, usa 0)
    const faturamento = dados.reduce((acc, item) => acc + (item.valorCobrado || 0), 0);

    // Filtra agendamentos de hoje
    const hojeStr = new Date().toISOString().split('T')[0];
    const hojeCount = dados.filter(a => a.dataHoraInicio && a.dataHoraInicio.startsWith(hojeStr)).length;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#4F46E5"><i class="fas fa-calendar-check"></i></div>
                <div><h3>Hoje</h3><span style="font-size:24px; font-weight:bold">${hojeCount}</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#10B981"><i class="fas fa-dollar-sign"></i></div>
                <div><h3>Faturamento</h3><span style="font-size:24px; font-weight:bold">${formatarMoeda(faturamento)}</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#F59E0B"><i class="fas fa-users"></i></div>
                <div><h3>Total Geral</h3><span style="font-size:24px; font-weight:bold">${total}</span></div>
            </div>
        </div>

        <div class="admin-card-container">
            <h3 style="margin-bottom:15px; color:#334155;">Últimos Agendamentos</h3>
            <table class="data-table">
                <thead>
                    <tr><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${dados.slice(0, 10).map(a => `
                        <tr>
                            <td>${a.cliente?.nome || 'Cliente'}</td>
                            <td>${a.servico?.nome || '-'}</td>
                            <td>${formatarMoeda(a.valorCobrado)}</td>
                            <td><span class="badge badge-${statusClass(a.status)}">${a.status || 'Agendado'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAgenda(container) {
    // Ordena por data (mais recente primeiro)
    const dados = state.cacheData.sort((a, b) => new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio));

    if (dados.length === 0) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748B;">Nenhum agendamento encontrado.</div>';
        return;
    }

    container.innerHTML = dados.map(a => `
        <div style="background:white; padding:20px; border-radius:12px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong style="color:#4F46E5; font-size:16px;">${formatarData(a.dataHoraInicio)}</strong>
                <div style="font-weight:600; margin-top:5px; font-size:15px;">${a.cliente?.nome || 'Cliente'}</div>
                <small style="color:#64748B; font-size:13px;">${a.servico?.nome} • ${a.barbeiroNome || 'Barbeiro'}</small>
            </div>
            <div style="text-align:right;">
                <span class="badge badge-${statusClass(a.status)}" style="margin-bottom:8px;">${a.status || 'Agendado'}</span>
                <br>
                <button onclick="deletarAgendamento(${a.id})" style="color:#DC2626; background:none; border:none; font-size:13px; cursor:pointer; margin-top:5px; font-weight:500;">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `).join('');
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
                    ${item.email ? `<br><small style="color:#64748B;">${item.email}</small>` : ''}
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
        // --- ADICIONAR SERVIÇO ---
        const { value: form } = await Swal.fire({
            title: 'Novo Serviço',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome do Serviço">
                <input id="swal-preco" type="number" class="swal2-input" placeholder="Preço (Ex: 35.00)">
                <input id="swal-tempo" type="number" class="swal2-input" placeholder="Duração (minutos)">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            preConfirm: () => [
                document.getElementById('swal-nome').value,
                document.getElementById('swal-preco').value,
                document.getElementById('swal-tempo').value
            ]
        });

        if (form && form[0] && form[1]) {
            await fetchApi('/servicos', 'POST', {
                nome: form[0],
                preco: parseFloat(form[1]),
                duracaoEmMinutos: parseInt(form[2])
            });
            carregarAdminData('servicos'); // Recarrega a lista
        }
    }
    else if (tipo === 'barbeiros') {
        // --- ADICIONAR BARBEIRO ---
        const { value: form } = await Swal.fire({
            title: 'Novo Profissional',
            html: `
                <input id="swal-nome" class="swal2-input" placeholder="Nome">
                <input id="swal-email" class="swal2-input" placeholder="Email (Login)">
                <input id="swal-pass" type="password" class="swal2-input" placeholder="Senha">
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Cadastrar',
            preConfirm: () => [
                document.getElementById('swal-nome').value,
                document.getElementById('swal-email').value,
                document.getElementById('swal-pass').value
            ]
        });

        if (form && form[0]) {
            await fetchApi('/barbeiros', 'POST', {
                nome: form[0],
                email: form[1],
                senha: form[2],
                especialidade: 'Barbeiro'
            });
            carregarAdminData('equipe'); // Recarrega a lista
        }
    }
}

async function deletarItem(tipo, id) {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Essa ação não pode ser desfeita.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Sim, excluir'
    });

    if (result.isConfirmed) {
        // endpoint = /servicos/1 ou /barbeiros/1
        await fetchApi(`/${tipo}/${id}`, 'DELETE');

        // Recarrega a tela atual
        carregarAdminData(tipo === 'servicos' ? 'servicos' : 'equipe');
    }
}

async function deletarAgendamento(id) {
    const result = await Swal.fire({
        title: 'Cancelar Agendamento?',
        text: "O horário ficará livre novamente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Sim, cancelar'
    });

    if (result.isConfirmed) {
        // Rota específica do seu Controller: DELETE /agendamentos/{id}/barbeiro
        await fetchApi(`/agendamentos/${id}/barbeiro`, 'DELETE');
        carregarAdminData('agenda');
    }
}

// --- HELPER PARA FAZER FETCH (POST/DELETE) ---
async function fetchApi(endpoint, method, body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': state.token
            }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${API_URL}${endpoint}`, options);

        if (!res.ok) throw new Error('Falha na operação');

        Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            showConfirmButton: false,
            timer: 1500
        });
        return res;

    } catch (error) {
        Swal.fire('Erro', 'Não foi possível completar a ação.', 'error');
        console.error(error);
    }
}

// ==================================================
// 5. CONFIGURAÇÕES & HELPERS VISUAIS
// ==================================================

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
        const cor = document.getElementById('conf-color');
        if(cor) {
            cor.value = tema.cor;
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
    Swal.fire('Sucesso', 'Configurações salvas localmente.', 'success');
}

function previewBg(url) {
    const div = document.getElementById('bg-preview');
    if(div) div.style.backgroundImage = `url('${url}')`;
}

function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('show');
    document.querySelector('.sidebar-overlay').classList.toggle('show');
}