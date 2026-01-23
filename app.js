// ==================================================
// CONFIGURAÇÕES GLOBAIS
// ==================================================
// Use localhost se estiver rodando local, ou a URL do Railway
const API_URL = "https://barbearia-backend-production-0dfc.up.railway.app";
// const API_URL = "http://localhost:8080";

// ESTADO DA APLICAÇÃO
const state = {
    barbeiroId: null,
    servicoId: null,
    data: null,
    hora: null,
    clienteId: null,
    token: null,     // JWT Token do Admin
    donoNome: null,  // Nome do Admin logado
    preco: 0
};

// --- Elementos Globais ---
const screenRegister = document.getElementById('screen-register-owner');
const screenLogin = document.getElementById('screen-login');

// ==================================================
// 1. NAVEGAÇÃO
// ==================================================
function navegarPara(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    const footer = document.getElementById('booking-footer');
    if(screenId === 'screen-booking') {
        if(footer) footer.style.display = 'flex';
        carregarDadosIniciais();
    } else {
        if(footer) footer.style.display = 'none';
    }
}

function irParaCadastro() {
    screenLogin.classList.remove('active');
    screenRegister.classList.add('active');
}

function voltarParaLogin() {
    screenRegister.classList.remove('active');
    screenLogin.classList.add('active');
}

function logout() {
    state.token = null;
    state.donoNome = null;
    state.clienteId = null;
    location.reload();
}

// --- UI AUXILIARES ---
function showLoading() { document.getElementById('loading-overlay').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(dataISO) {
    if(!dataISO) return '--';
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
           ' às ' +
           data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderEmptyState(mensagem) {
    return `
        <div style="text-align: center; padding: 40px 20px; opacity: 0.6;">
            <span class="material-icons-round" style="font-size: 48px; color: #D1D5DB; margin-bottom: 10px;">inbox</span>
            <p style="margin: 0; font-weight: 500; font-size: 14px; color: var(--text-sec);">${mensagem}</p>
        </div>
    `;
}

// ==================================================
// 2. CONEXÃO SEGURA (JWT)
// ==================================================
async function fetchAdmin(endpoint, options = {}) {
    if (!state.token) {
        navegarPara('screen-login');
        throw new Error("Sem token");
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': state.token, // O token já terá o prefixo "Bearer "
        ...options.headers
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (res.status === 403 || res.status === 401) {
        state.token = null;
        Swal.fire('Sessão Expirada', 'Faça login novamente', 'warning');
        navegarPara('screen-login');
        throw new Error("Acesso negado");
    }

    return res;
}

// ==================================================
// 3. LOGIN E CADASTRO
// ==================================================

// LOGIN COM JWT (Atualizado)
// Substitua a função fazerLogin antiga por esta:
async function fazerLogin() {
    const email = document.getElementById('loginUser').value.trim();
    const senha = document.getElementById('loginSenha').value;

    if(!email || !senha) return Swal.fire('Atenção', 'Digite e-mail e senha', 'warning');

    showLoading();

    try {
        console.log("Tentando logar em:", `${API_URL}/auth/login`); // Debug

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha })
        });

        // Debug: Mostra o status da resposta (200 = OK, 403 = Proibido, 404 = Não achou)
        console.log("Status da resposta:", response.status);

        if (response.ok) {
            const data = await response.json();

            // Verifica se o token veio mesmo
            if (!data.token) {
                throw new Error("O servidor respondeu, mas não enviou o token.");
            }

            state.token = "Bearer " + data.token;
            state.donoNome = data.nome;

            hideLoading();

            document.getElementById('welcome-msg').innerText = `Olá, ${data.nome}`;
            carregarAdmin();

            const Toast = Swal.mixin({toast: true, position: 'top-end', showConfirmButton: false, timer: 3000});
            Toast.fire({icon: 'success', title: 'Login realizado!'});

        } else {
            // Se der erro, tenta ler a mensagem de erro do Java
            const erroTexto = await response.text();
            console.error("Erro do servidor:", erroTexto);
            hideLoading();
            Swal.fire('Erro no Login', erroTexto || 'Usuário ou senha inválidos', 'error');
        }
    } catch (e) {
        hideLoading();
        console.error("Erro CRÍTICO no JS:", e); // Veja isso no Console do Chrome (F12)
        Swal.fire('Erro Técnico', 'Verifique o console (F12) para detalhes.', 'error');
    }
}

// CADASTRO DE DONO
async function cadastrarNovoDono() {
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const senha = document.getElementById('regSenha').value;
    const confirma = document.getElementById('regSenhaConfirm').value;

    if (!nome || !email || !senha) return Swal.fire('Erro', 'Preencha todos os campos.', 'warning');
    if (senha !== confirma) return Swal.fire('Erro', 'Senhas não conferem.', 'error');

    showLoading();

    try {
        const response = await fetch(`${API_URL}/barbeiros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                especialidade: 'Dono/Barbeiro'
            })
        });

        if (response.status === 201) {
            hideLoading();
            Swal.fire('Sucesso', 'Conta criada! Faça login agora.', 'success');
            voltarParaLogin();
            document.getElementById('loginUser').value = email;
        } else {
            throw new Error();
        }
    } catch (e) {
        hideLoading();
        Swal.fire('Erro', 'Não foi possível cadastrar. O email já existe?', 'error');
    }
}

// LOGIN DE CLIENTE (Recuperar ID)
async function recuperarId() {
    // ... (Mantive sua lógica original aqui, se ainda for usar)
}


// ==================================================
// 4. ÁREA DO CLIENTE (AGENDAMENTO)
// ==================================================

// CARREGAR DADOS INICIAIS (Barbeiros e Serviços)
async function carregarDadosIniciais() {
    const hoje = new Date().toISOString().split('T')[0];
    const elDate = document.getElementById('date-picker');
    if(elDate) elDate.value = hoje;
    state.data = hoje;

    const listaB = document.getElementById('list-barbers');
    const listaS = document.getElementById('list-services');

    listaB.innerHTML = 'Carregando...';

    try {
        // Busca Barbeiros
        const resB = await fetch(`${API_URL}/barbeiros`);
        const barbeiros = await resB.json();

        listaB.innerHTML = '';
        barbeiros.forEach(b => {
            const div = document.createElement('div');
            div.className = 'barber-card';
            div.innerHTML = `
                <div class="check-icon"><span class="material-icons-round">check</span></div>
                <div class="avatar" style="background:#E0E7FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:24px;">
                    ${b.nome.charAt(0)}
                </div>
                <span class="barber-name">${b.nome.split(' ')[0]}</span>
            `;

            div.onclick = () => {
                state.barbeiroId = b.id;
                document.querySelectorAll('.barber-card').forEach(e => e.classList.remove('selected'));
                div.classList.add('selected');
                carregarHorarios();
            };
            listaB.appendChild(div);
        });

        // Busca Serviços
        const resS = await fetch(`${API_URL}/servicos`);
        const servicos = await resS.json();

        listaS.innerHTML = '';
        servicos.forEach(s => {
            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <div style="flex:1">
                    <div style="font-weight:600; color:var(--text-main); font-size:14px;">${s.nome}</div>
                    <div style="font-size:11px; color:#6B7280;">${s.duracaoEmMinutos} min</div>
                </div>
                <div style="font-weight:700; color:var(--text-main); font-size:14px;">${formatarMoeda(s.preco)}</div>
            `;
            div.onclick = () => {
                state.servicoId = s.id;
                state.preco = s.preco;
                document.querySelectorAll('.service-card').forEach(e => e.classList.remove('selected'));
                div.classList.add('selected');

                const footerTotal = document.getElementById('total-price');
                if(footerTotal) footerTotal.innerText = formatarMoeda(s.preco);
            };
            listaS.appendChild(div);
        });

    } catch (e) {
        console.error(e);
        listaB.innerHTML = "Erro ao carregar.";
    }
}

// CALENDÁRIO
const datePicker = document.getElementById('date-picker');
if (datePicker) {
    datePicker.addEventListener('change', (e) => {
        const dt = e.target.value;
        if(!dt) return;

        // Bloqueio Domingo/Segunda
        const diaSemana = new Date(dt + 'T00:00:00').getDay();
        if (diaSemana === 0 || diaSemana === 1) {
            Swal.fire('Fechado', 'Não funcionamos Domingo e Segunda.', 'info');
            e.target.value = '';
            return;
        }
        state.data = dt;
        carregarHorarios();
    });
}

// CARREGAR HORÁRIOS
async function carregarHorarios() {
    if(!state.barbeiroId || !state.data) return;
    const grid = document.getElementById('grid-times');
    grid.innerHTML = 'Buscando...';

    try {
        const res = await fetch(`${API_URL}/agendamentos/barbeiro/${state.barbeiroId}?data=${state.data}`);
        const ocupados = await res.json();
        const horasOcupadas = ocupados.map(a => a.dataHoraInicio.split('T')[1].substring(0, 5));

        grid.innerHTML = '';
        for(let i=9; i<=19; i++) {
            const hora = i.toString().padStart(2, '0') + ":00";
            const div = document.createElement('div');
            div.className = 'time-slot';
            div.innerText = hora;

            if(horasOcupadas.includes(hora)) {
                div.classList.add('disabled');
            } else {
                div.onclick = () => {
                    state.hora = hora;
                    document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected'));
                    div.classList.add('selected');
                };
            }
            grid.appendChild(div);
        }
    } catch(e) { grid.innerHTML = 'Erro na agenda.'; }
}

// CONFIRMAR AGENDAMENTO (Cria Cliente Rápido)
async function confirmarAgendamento() {
    if(!state.barbeiroId || !state.servicoId || !state.hora) return Swal.fire('Preencha tudo', '', 'warning');

    const { value: nomeCliente } = await Swal.fire({
        title: 'Seu Nome',
        input: 'text',
        inputLabel: 'Para finalizar o agendamento',
        inputPlaceholder: 'João Silva',
        showCancelButton: true
    });

    if(!nomeCliente) return;

    showLoading();
    try {
        // 1. Cria Cliente
        const resCli = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nome: nomeCliente, email: `${Date.now()}@temp.com`, telefone: '000000000' })
        });
        const cliente = await resCli.json();

        // 2. Cria Agendamento
        const resAgenda = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                clienteId: cliente.id,
                barbeiroId: state.barbeiroId,
                servicoId: state.servicoId,
                dataHoraInicio: `${state.data}T${state.hora}:00`
            })
        });

        if(resAgenda.status === 201) {
            navegarPara('screen-success');
        } else {
            throw new Error();
        }
    } catch(e) {
        Swal.fire('Erro', 'Não foi possível agendar.', 'error');
    } finally { hideLoading(); }
}


// ==================================================
// 5. ÁREA ADMIN (DASHBOARD)
// ==================================================
let adminCache = [];

async function carregarAdmin() {
    navegarPara('screen-admin');
    navegarAdmin('dashboard');
}

async function navegarAdmin(aba) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Mapeamento simples
    const maps = { 'dashboard':0, 'agenda':1, 'servicos':2, 'equipe':3 };
    const items = document.querySelectorAll('.nav-item');
    if(items[maps[aba]]) items[maps[aba]].classList.add('active');

    const container = document.getElementById('admin-content');
    container.innerHTML = '<div style="text-align:center; padding:40px;">Carregando...</div>';

    if (aba === 'dashboard' || aba === 'agenda') {
        try {
            const res = await fetchAdmin('/agendamentos/admin/todos');
            adminCache = await res.json();
            adminCache.sort((a, b) => new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio));
        } catch(e) {
            container.innerHTML = 'Erro ao carregar dados.';
            return;
        }
    }

    if (aba === 'dashboard') renderDashboard(container);
    if (aba === 'agenda') renderAgenda(container);
    if (aba === 'servicos') carregarListaServicosAdmin(container);
    if (aba === 'equipe') carregarListaBarbeirosAdmin(container);
}

// RENDER DASHBOARD
function renderDashboard(container) {
    const total = adminCache.reduce((acc, item) => acc + (item.valorCobrado || 0), 0);
    const count = adminCache.length;

    container.innerHTML = `
        <div class="metrics-container">
            <div class="metric-card">
                <span class="metric-label">Faturamento</span>
                <span class="metric-value" style="color:#059669">${formatarMoeda(total)}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Agendamentos</span>
                <span class="metric-value">${count}</span>
            </div>
        </div>

        <div class="share-card">
            <h3>Link de Agendamento</h3>
            <p>Envie para seus clientes</p>
            <div class="share-link-box" onclick="copiarLink()">
                <span>barber.pro/agendar</span>
                <span class="material-icons-round">content_copy</span>
            </div>
        </div>

        <div style="background:white; padding:15px; border-radius:16px;">
            <h2 style="font-size:14px; margin-bottom:15px;">Serviços</h2>
            <div style="height:200px;"><canvas id="chartDash"></canvas></div>
        </div>
    `;

    setTimeout(() => {
        const ctx = document.getElementById('chartDash');
        if(ctx) {
            const counts = {};
            adminCache.forEach(a => { const n = a.servico?.nome || 'Outros'; counts[n] = (counts[n]||0)+1; });
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(counts),
                    datasets: [{ data: Object.values(counts), backgroundColor: ['#4F46E5', '#10B981', '#F59E0B'] }]
                },
                options: { maintainAspectRatio: false }
            });
        }
    }, 100);
}

function copiarLink() {
    // Simula abrir link cliente
    const vai = confirm("Simular cliente abrindo o link?");
    if(vai) {
        state.token = null; // Sai do admin
        navegarPara('screen-booking');
    }
}

// RENDER AGENDA
function renderAgenda(container) {
    if(!adminCache.length) { container.innerHTML = renderEmptyState('Agenda vazia.'); return; }

    let html = '';
    adminCache.forEach(a => {
        html += `
            <div class="admin-card-item">
                <div style="display:flex; justify-content:space-between;">
                    <span class="badge badge-agendado">${a.status}</span>
                    <strong style="color:#4F46E5;">${formatarData(a.dataHoraInicio)}</strong>
                </div>
                <div style="margin-top:8px;">
                    <strong>${a.cliente?.nome || 'Cliente'}</strong>
                    <div style="font-size:12px; color:#6B7280;">${a.servico?.nome} • ${formatarMoeda(a.valorCobrado)}</div>
                </div>
                <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end;">
                    <button class="btn-mini btn-cancel" onclick="atualizarStatus(${a.id}, 'cancelar')">Cancelar</button>
                    <button class="btn-mini btn-confirm" onclick="atualizarStatus(${a.id}, 'confirmar')">Confirmar</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function atualizarStatus(id, acao) {
    try {
        let endpoint = `/agendamentos/${id}`;
        let method = 'PUT';
        if(acao === 'cancelar') { endpoint += '/barbeiro'; method = 'DELETE'; }
        else if(acao === 'confirmar') endpoint += '/confirmar';

        await fetchAdmin(endpoint, { method });
        Swal.fire('Ok', 'Status atualizado', 'success');
        navegarAdmin('agenda');
    } catch(e) { Swal.fire('Erro', 'Falha ao atualizar', 'error'); }
}

// GERENCIAR SERVIÇOS E EQUIPE (Simples)
async function carregarListaServicosAdmin(container) {
    container.innerHTML = `<h3>Serviços <button class="btn-mini btn-confirm" onclick="addServicoModal()">+ Novo</button></h3><div id="lista-s">Loading...</div>`;
    const res = await fetch(`${API_URL}/servicos`);
    const dados = await res.json();
    renderListaSimples(dados, 'lista-s', 'servicos');
}

async function carregarListaBarbeirosAdmin(container) {
    container.innerHTML = `<h3>Equipe <button class="btn-mini btn-confirm" onclick="addBarbeiroModal()">+ Novo</button></h3><div id="lista-b">Loading...</div>`;
    const res = await fetch(`${API_URL}/barbeiros`);
    const dados = await res.json();
    renderListaSimples(dados, 'lista-b', 'barbeiros');
}

function renderListaSimples(lista, divId, tipo) {
    const div = document.getElementById(divId);
    if(!lista.length) { div.innerHTML = "Vazio."; return; }
    div.innerHTML = lista.map(item => `
        <div class="admin-card-item" style="flex-direction:row; justify-content:space-between; align-items:center;">
            <span>${item.nome}</span>
            <button onclick="excluirItem('${tipo}', ${item.id})" style="color:red;border:none;background:none;"><span class="material-icons-round">delete</span></button>
        </div>
    `).join('');
}

async function excluirItem(tipo, id) {
    if(!confirm('Excluir?')) return;
    await fetchAdmin(`/${tipo}/${id}`, { method: 'DELETE' });
    // Recarrega aba
    if(tipo === 'servicos') carregarListaServicosAdmin(document.getElementById('admin-content'));
    else carregarListaBarbeirosAdmin(document.getElementById('admin-content'));
}

async function addServicoModal() {
    const { value: form } = await Swal.fire({
        title: 'Novo Serviço',
        html: '<input id="swal-nome" class="swal2-input" placeholder="Nome"><input id="swal-preco" type="number" class="swal2-input" placeholder="Preço"><input id="swal-tempo" type="number" class="swal2-input" placeholder="Minutos">',
        focusConfirm: false,
        preConfirm: () => [document.getElementById('swal-nome').value, document.getElementById('swal-preco').value, document.getElementById('swal-tempo').value]
    });
    if(form) {
        await fetchAdmin('/servicos', { method: 'POST', body: JSON.stringify({ nome: form[0], preco: form[1], duracaoEmMinutos: form[2] }) });
        carregarListaServicosAdmin(document.getElementById('admin-content'));
    }
}