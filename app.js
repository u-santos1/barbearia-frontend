
// 1. A URL do seu Backend no Railway (SEM a barra no final)
const API_URL = "https://barbearia-backend-production.up.railway.app";

// 2. Seus dados de login (Aqueles que configuramos no Railway)
const USUARIO = "admin";
const SENHA = "123456";

// Função para codificar a senha (Padrão Basic Auth)
// O btoa() transforma texto em Base64, que é o formato exigido
const authHeader = 'Basic ' + btoa(USUARIO + ":" + SENHA);

async function buscarAgendamentos() {
    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 3. AQUI ESTÁ O SEGREDO! Sem isso, dá erro 401
                'Authorization': authHeader
            }
        });

        if (response.ok) {
            const dados = await response.json();
            console.log("Sucesso! Agendamentos:", dados);
            // Aqui você desenha na tela (document.getElementById...)
        } else {
            console.error("Erro na requisição:", response.status);
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
    }
}

// Chama a função para testar
async function buscarAgendamentos() {
    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            method: 'GET',
            headers: {
                // Removido o Content-Type (não é necessário no GET)
                'Authorization': authHeader
            },
            // Adicionado para sincronizar com o allowCredentials(true) do Java
            mode: 'cors',
            credentials: 'include'
        });

        if (response.ok) {
            const dados = await response.json();
            console.log("Sucesso! Agendamentos:", dados);
        } else {
            console.error("Erro na requisição:", response.status);
            // Se der 401 aqui, a senha '123456' ou o user 'admin' estão diferentes no Railway
        }
    } catch (error) {
        console.error("Erro de conexão (CORS provável):", error);
    }
}

function formatarData(dataISO) {
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

function showLoading() { document.getElementById('loading-overlay').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

// --- 2. O "TÚNEL SEGURO" (ISOLAMENTO DO ADMIN) ---
async function fetchAdmin(endpoint, options = {}) {
    if (!state.token) {
        navegarPara('screen-login');
        throw new Error("Sem token de admin");
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': state.token,
        ...options.headers
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
        state.token = null;
        Swal.fire('Sessão Expirada', 'Faça login novamente', 'warning');
        navegarPara('screen-login');
        throw new Error("Acesso negado pelo servidor");
    }

    return res;
}

// --- 3. NAVEGAÇÃO ---
function navegarPara(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    const footer = document.getElementById('booking-footer');
    if(screenId === 'screen-booking') {
        footer.style.display = 'flex';
        carregarDadosIniciais();
    } else {
        footer.style.display = 'none';
    }
}

// --- 4. VALIDAÇÃO DE DATA (REGRA DE NEGÓCIO) ---
document.getElementById('date-picker').addEventListener('change', (e) => {
    const dataSelecionada = e.target.value;

    if (!dataSelecionada) return;

    const dataObj = new Date(dataSelecionada + 'T00:00:00');
    const diaSemana = dataObj.getDay(); // 0 = Domingo, 1 = Segunda ...

    if (diaSemana === 0 || diaSemana === 1) {
        Swal.fire({
            icon: 'warning',
            title: 'Estamos Fechados!',
            text: 'A barbearia não funciona aos domingos e segundas-feiras. Por favor, escolha outro dia.'
        });
        e.target.value = '';
        state.data = null;
        document.getElementById('grid-times').innerHTML = '';
        return;
    }

    state.data = dataSelecionada;
    carregarHorarios();
});

// --- 5. LOGIN E RECUPERAÇÃO ---
async function fazerLogin() {
    const idInput = document.getElementById('loginId').value.trim();
    if(!idInput) return Swal.fire('Digite seu ID ou admin');

    if (idInput.toLowerCase() === 'admin') {
        const { value: password } = await Swal.fire({
            title: 'Área Restrita',
            input: 'password',
            inputPlaceholder: 'Senha do Admin...',
            showCancelButton: true
        });

        if (password) {
            const tokenCandidato = 'Basic ' + btoa('admin:' + password);
            state.token = tokenCandidato;

            showLoading();
            try {
                const res = await fetchAdmin('/agendamentos/admin/todos');
                if (res.ok) {
                    hideLoading();
                    carregarAdmin();
                    navegarPara('screen-admin');
                    const Toast = Swal.mixin({toast: true, position: 'top-end', showConfirmButton: false, timer: 3000});
                    Toast.fire({icon: 'success', title: 'Login Admin Sucesso'});
                }
            } catch (e) {
                hideLoading();
                state.token = null;
            }
        }
    } else {
        state.clienteId = idInput;
        document.getElementById('user-name-display').innerText = "Cliente #" + idInput;
        navegarPara('screen-booking');
    }
}

async function recuperarId() {
    const { value: email } = await Swal.fire({
        title: 'Esqueceu o ID?',
        text: 'Digite seu email cadastrado para recuperar:',
        input: 'email',
        inputPlaceholder: 'exemplo@email.com',
        showCancelButton: true,
        confirmButtonText: 'Buscar meu ID'
    });

    if (!email) return;

    showLoading();
    try {
        const res = await fetch(`${API_URL}/clientes/recuperar-id?email=${email}`);
        if (res.ok) {
            const idRecuperado = await res.json();
            document.getElementById('loginId').value = idRecuperado;
            Swal.fire({
                icon: 'success',
                title: 'Encontramos!',
                html: `Seu ID é: <h1 style="color:#2563EB">${idRecuperado}</h1>Já preenchemos para você.`
            });
        } else {
            Swal.fire('Não encontrado', 'Não existe cliente com este email.', 'error');
        }
    } catch (e) {
        Swal.fire('Erro', 'Falha ao conectar com o servidor.', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    state.token = null;
    location.reload();
}

// --- 6. CLIENTE: CADASTRO E AGENDAMENTO ---
async function cadastrarCliente() {
    const nome = document.getElementById('regNome').value;
    const email = document.getElementById('regEmail').value;
    const telefone = document.getElementById('regTelefone').value;

    if(!nome || !email || !telefone) return Swal.fire('Atenção', 'Preencha todos os campos!', 'warning');

    showLoading();
    try {
        const res = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ nome, email, telefone })
        });

        if(res.ok) {
            const cli = await res.json();
            document.getElementById('loginId').value = cli.id;

            // UX Melhorada: Mostra o ID antes de logar
            Swal.fire({
                title: 'Cadastro Sucesso!',
                html: `Seu ID de acesso é: <h1 style="color:#2563EB">${cli.id}</h1>Anote este número!`,
                icon: 'success',
                confirmButtonText: 'Entendi, entrar agora'
            }).then(() => {
                fazerLogin();
            });

        } else {
            const erroTexto = await res.text();
            Swal.fire('Erro ao Cadastrar', erroTexto || 'Verifique os dados.', 'error');
        }
    } catch(e) {
        Swal.fire('Erro de Conexão', 'Servidor indisponível.', 'error');
    }
    finally { hideLoading(); }
}

async function carregarDadosIniciais() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('date-picker').value = hoje;
    state.data = hoje;
    showLoading();
    try {
            const res = await fetch(`${API_URL}/barbeiros`);
            console.log("Status da Resposta:", res.status); // ADICIONE ISSO

            if (!res.ok) {
                throw new Error(`Erro no servidor: ${res.status}`);
            }

            const barbeiros = await res.json();
            console.log("Barbeiros recebidos:", barbeiros);
    try {
        const res = await fetch(`${API_URL}/barbeiros`);
        const barbeiros = await res.json();

        const lista = document.getElementById('list-barbers');
        lista.innerHTML = '';

        // LISTA DE FOTOS REAIS (Para parecer profissional)
        const fotosMock = [
            'https://images.unsplash.com/photo-1580256081112-e49377338b7f?auto=format&fit=crop&w=200&q=80', // Barbeiro 1
            'https://images.unsplash.com/photo-1618077360395-f3068be8e001?auto=format&fit=crop&w=200&q=80', // Barbeiro 2
            'https://images.unsplash.com/photo-1534030347209-7147fd69a370?auto=format&fit=crop&w=200&q=80', // Barbeiro 3
        ];

        barbeiros.forEach((b, index) => {
            // Nota aleatória entre 4.7 e 5.0 para dar credibilidade
            const nota = (Math.random() * (5.0 - 4.7) + 4.7).toFixed(1);
            const avaliacoes = Math.floor(Math.random() * 100) + 20;
            const foto = fotosMock[index % fotosMock.length]; // Pega uma foto da lista

            const div = document.createElement('div');
            div.className = 'barber-card';
            div.innerHTML = `
                <div class="avatar" style="background-image: url('${foto}')"></div>
                <div style="text-align:center">
                    <span style="font-size:12px; font-weight:600; display:block; color:var(--text-main);">${b.nome.split(' ')[0]}</span>
                    <div style="display:flex; align-items:center; justify-content:center; gap:2px; margin-top:2px;">
                        <span class="material-icons-round" style="font-size:10px; color:#F59E0B;">star</span>
                        <span style="font-size:10px; font-weight:700; color:var(--text-main);">${nota}</span>
                        <span style="font-size:9px; color:#9CA3AF;">(${avaliacoes})</span>
                    </div>
                </div>
            `;
            div.onclick = () => {
                state.barbeiroId = b.id;
                document.querySelectorAll('.barber-card').forEach(e => e.classList.remove('selected'));
                div.classList.add('selected');
                carregarHorarios();
            };
            lista.appendChild(div);
        });

        const resS = await fetch(`${API_URL}/servicos`);
        const servicos = await resS.json();
        const listaS = document.getElementById('list-services');
        listaS.innerHTML = '';

        servicos.forEach(s => {
            // Descrição fake baseada no nome para dar valor
            let descricao = "Procedimento padrão com acabamento.";
            if(s.nome.toLowerCase().includes('barba')) descricao = "Modelagem, toalha quente e pós-barba.";
            if(s.nome.toLowerCase().includes('corte')) descricao = "Lavagem, corte e finalização com pomada.";

            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <div style="flex:1">
                    <div style="font-weight:600; color:var(--text-main); font-size:14px;">${s.nome}</div>
                    <div style="font-size:11px; color:#6B7280; margin-top:2px;">${descricao}</div>
                    <div style="font-size:11px; color:#4F46E5; font-weight:500; margin-top:4px;">${s.duracaoEmMinutos} min • Presencial</div>
                </div>
                <div style="font-weight:700; color:var(--text-main); font-size:14px;">${formatarMoeda(s.preco)}</div>
            `;
            div.onclick = () => {
                state.servicoId = s.id;
                state.preco = s.preco;
                document.querySelectorAll('.service-card').forEach(e => e.classList.remove('selected'));
                div.classList.add('selected');
                document.getElementById('total-price').innerText = formatarMoeda(s.preco);
            };
            listaS.appendChild(div);
        });
    } catch (e) { document.getElementById('booking-error').style.display = 'block'; document.getElementById('booking-error').innerText = "Erro ao carregar dados"; }
    finally { hideLoading(); }
}

async function carregarHorarios() {
    if(!state.barbeiroId || !state.data) return;
    const grid = document.getElementById('grid-times');
    grid.innerHTML = '<p style="grid-column:span 4;text-align:center; font-size:13px; color:#888;">Buscando horários...</p>';
    try {
        const res = await fetch(`${API_URL}/agendamentos/barbeiro/${state.barbeiroId}?data=${state.data}`);
        const ocupados = await res.json();
        const horasOcupadas = ocupados.map(a => a.dataHoraInicio.split('T')[1].substring(0, 5));
        grid.innerHTML = '';
        for(let i=9; i<=18; i++) {
            const hora = i.toString().padStart(2, '0') + ":00";
            const div = document.createElement('div');
            div.className = 'time-slot';
            div.innerText = hora;
            if(horasOcupadas.includes(hora)) div.classList.add('disabled');
            else div.onclick = () => { state.hora = hora; document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected')); div.classList.add('selected'); };
            grid.appendChild(div);
        }
    } catch(e) { grid.innerHTML = '<p>Erro</p>'; }
}

async function confirmarAgendamento() {
    if(!state.clienteId || !state.barbeiroId || !state.servicoId || !state.hora) return Swal.fire('Complete os dados');
    showLoading();
    try {
        const res = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                clienteId: state.clienteId,
                barbeiroId: state.barbeiroId,
                servicoId: state.servicoId,
                dataHoraInicio: `${state.data}T${state.hora}:00`
            })
        });

        if(res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Agendado!',
                showConfirmButton: false,
                timer: 1500
            });

            // Atualiza a tela de sucesso com dados reais
            document.getElementById('screen-success').innerHTML = `
                <div style="text-align: center; padding-top: 60px;">
                    <div style="width: 80px; height: 80px; background: #D1FAE5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto;">
                        <span class="material-icons-round" style="font-size: 40px; color: #059669;">check</span>
                    </div>
                    <h1 style="margin-bottom: 10px;">Tudo Certo!</h1>
                    <p>Agendado para <b>${formatarData(state.data + 'T' + state.hora)}</b></p>

                    <div style="background:#F3F4F6; padding:15px; border-radius:12px; margin:20px 0; text-align:left; border:1px solid #E5E7EB;">
                        <div style="font-size:12px; color:#6B7280; margin-bottom:4px;">Lembrete</div>
                        <div style="font-size:14px; font-weight:600;">Chegue 5 minutos antes.</div>
                    </div>

                    <button class="btn-primary" style="background:#25D366; box-shadow:0 4px 10px rgba(37, 211, 102, 0.2);" onclick="enviarWhatsapp()">
                        <span class="material-icons-round">whatsapp</span> Receber no Zap
                    </button>

                    <button class="btn-outline" style="margin-top:15px; border:none;" onclick="location.reload()">Voltar ao Início</button>
                </div>
            `;

            navegarPara('screen-success');
        }
        else Swal.fire('Erro ao agendar');
    } catch(e) { Swal.fire('Erro Conexão'); }
    finally { hideLoading(); }
}

// Função Auxiliar para abrir o Zap
function enviarWhatsapp() {
    const texto = `Olá! Acabei de agendar na Barbearia para ${formatarData(state.data + 'T' + state.hora)}. Podem confirmar?`;
    // Coloque aqui o número da barbearia real
    window.open(`https://wa.me/5521993434258?text=${encodeURIComponent(texto)}`, '_blank');
}

// --- 7. ADMIN ---
async function carregarAdmin() {
    mostrarAbaAdmin('dashboard');
    showLoading();
    try {
        const res = await fetchAdmin('/agendamentos/admin/todos');
        const agendamentos = await res.json();

        const total = agendamentos.reduce((acc, item) => acc + (item.valorCobrado || 0), 0);
        document.getElementById('admin-count').innerText = agendamentos.length;
        document.getElementById('admin-revenue').innerText = formatarMoeda(total);

        const lista = document.getElementById('admin-list');
        lista.innerHTML = '';
        if(agendamentos.length === 0) {
            lista.innerHTML = renderEmptyState('Nenhum agendamento encontrado.');
        } else {
            agendamentos.forEach(a => {
              // Lógica de Cores da Badge
              let classeCor = 'badge-agendado';
              if(a.status === 'CONCLUIDO') classeCor = 'badge-concluido';
              if(a.status === 'CANCELADO') classeCor = 'badge-cancelado';

              const div = document.createElement('div');
              div.className = 'admin-card-item';
              div.innerHTML = `
                <div>
                    <span class="badge ${classeCor}">${a.status || 'AGENDADO'}</span>
                    <div style="font-weight:600; margin-top:4px;">${formatarData(a.dataHoraInicio)}</div>
                    <div style="font-size:12px; color:var(--text-sec);">${a.cliente.nome} com ${a.barbeiro.nome}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:700; color:var(--text-main);">${formatarMoeda(a.valorCobrado)}</div>
                    <div style="font-size:11px; color:var(--text-sec);">${a.servico.nome}</div>
                </div>`;
              lista.appendChild(div);
            });
        }

        const ctx = document.getElementById('myChart');
        if(ctx) {
             const contador = {};
             agendamentos.forEach(a => {
                 const n = a.servico ? a.servico.nome : 'Outros';
                 contador[n] = (contador[n] || 0) + 1;
             });
             if(window.myAdminChart instanceof Chart) window.myAdminChart.destroy();
             window.myAdminChart = new Chart(ctx, {
                 type: 'doughnut',
                 data: {
                     labels: Object.keys(contador),
                     datasets: [{ label: 'Serviços', data: Object.values(contador), backgroundColor: ['#4F46E5', '#10B981', '#F59E0B'] }]
                 },
                 options: { maintainAspectRatio: false, cutout: '70%' }
             });
        }
    } catch(e) { console.error(e); }
    finally { hideLoading(); }
}

async function addBarbeiro() {
    const nome = document.getElementById('newBarbNome').value;
    const email = document.getElementById('newBarbEmail').value;
    const especialidade = document.getElementById('newBarbEsp').value;
    try {
        await fetchAdmin('/barbeiros', {
            method: 'POST',
            body: JSON.stringify({nome, email, especialidade})
        });
        Swal.fire('Sucesso', 'Barbeiro criado', 'success');
        carregarListaBarbeirosAdmin();
    } catch(e) {}
}

async function deletarBarbeiro(id) {
    if(await confirmar()) {
        await fetchAdmin(`/barbeiros/${id}`, { method: 'DELETE' });
        carregarListaBarbeirosAdmin();
    }
}

async function carregarListaBarbeirosAdmin() {
    const res = await fetch(`${API_URL}/barbeiros`);
    const dados = await res.json();
    renderLista(dados, 'admin-barbers-list', 'deletarBarbeiro');
}

async function addServico() {
    const nome = document.getElementById('newServNome').value;
    const preco = document.getElementById('newServPreco').value;
    const tempo = document.getElementById('newServTempo').value;
    try {
        await fetchAdmin('/servicos', {
            method: 'POST',
            body: JSON.stringify({nome, preco, duracaoEmMinutos: tempo})
        });
        Swal.fire('Sucesso', 'Serviço criado', 'success');
        carregarListaServicosAdmin();
    } catch(e) {}
}

async function deletarServico(id) {
    if(await confirmar()) {
        await fetchAdmin(`/servicos/${id}`, { method: 'DELETE' });
        carregarListaServicosAdmin();
    }
}

async function carregarListaServicosAdmin() {
    const res = await fetch(`${API_URL}/servicos`);
    const dados = await res.json();
    renderLista(dados, 'admin-services-list', 'deletarServico');
}

function renderLista(dados, elementId, deleteFunc) {
    const lista = document.getElementById(elementId);
    lista.innerHTML = '';
    if(dados.length === 0) {
        lista.innerHTML = renderEmptyState('Nenhum registro encontrado.');
        return;
    }
    dados.forEach(item => {
        const div = document.createElement('div');
        div.className = 'admin-card-item';
        div.innerHTML = `<span>${item.nome}</span> <button style="color:#EF4444;border:none;background:none;cursor:pointer" onclick="${deleteFunc}(${item.id})"><span class="material-icons-round">delete_outline</span></button>`;
        lista.appendChild(div);
    });
}

async function confirmar() {
    const r = await Swal.fire({title:'Tem certeza?', icon:'warning', showCancelButton:true});
    return r.isConfirmed;
}

function mostrarAbaAdmin(aba) {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.style.display = 'none');
    document.getElementById(`tab-${aba}`).style.display = 'block';
    if(aba === 'equipe') carregarListaBarbeirosAdmin();
    if(aba === 'servicos') carregarListaServicosAdmin();
}

// --- 8. MEUS AGENDAMENTOS (CLIENTE) ---
async function abrirMeusAgendamentos() {
    if (!state.clienteId) return;

    // 1. Busca os dados
    showLoading();
    try {
        const res = await fetch(`${API_URL}/agendamentos/cliente/${state.clienteId}`);
        const lista = await res.json();

        // 2. Monta o HTML da lista
        let htmlContent = `<div style="text-align:left; max-height:300px; overflow-y:auto;">`;

        if (lista.length === 0) {
            htmlContent += renderEmptyState('Você ainda não tem agendamentos.');
        } else {
            lista.forEach(a => {
                const dataFormatada = formatarData(a.dataHoraInicio);
                const podeCancelar = a.status !== 'CANCELADO' && a.status !== 'CONCLUIDO';

                // Define cor do status
                let corStatus = '#3730A3'; // Azul (Agendado)
                let bgStatus = '#E0E7FF';
                if(a.status === 'CANCELADO') { corStatus = '#991B1B'; bgStatus = '#FEE2E2'; }
                if(a.status === 'CONCLUIDO') { corStatus = '#065F46'; bgStatus = '#D1FAE5'; }

                htmlContent += `
                <div style="background: #F9FAFB; padding: 12px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #E5E7EB;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="background:${bgStatus}; color:${corStatus}; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700;">${a.status}</span>
                        <span style="font-size:11px; color:#666;">ID: ${a.id}</span>
                    </div>
                    <div style="font-weight:600; color:#111827; margin-bottom:4px;">${dataFormatada}</div>
                    <div style="font-size:12px; color:#4B5563;">${a.servico.nome} com ${a.barbeiro.nome}</div>

                    ${podeCancelar ?
                        `<button onclick="cancelarAgendamento(${a.id})" style="width:100%; margin-top:10px; background:white; border:1px solid #EF4444; color:#EF4444; padding:6px; border-radius:6px; cursor:pointer; font-size:12px;">Cancelar Horário</button>`
                        : ''}
                </div>`;
            });
        }
        htmlContent += `</div>`;

        hideLoading();

        // 3. Mostra o Modal
        Swal.fire({
            title: 'Meus Agendamentos',
            html: htmlContent,
            showCloseButton: true,
            showConfirmButton: false,
            width: '400px'
        });

    } catch (e) {
        hideLoading();
        Swal.fire('Erro', 'Não foi possível carregar seus agendamentos.', 'error');
    }
}

async function cancelarAgendamento(id) {
    Swal.close();
    const confirmacao = await Swal.fire({
        title: 'Cancelar?',
        text: "Deseja liberar este horário?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Sim, cancelar'
    });

    if (confirmacao.isConfirmed) {
        showLoading();
        try {
            const res = await fetch(`${API_URL}/agendamentos/${id}`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                hideLoading();
                await Swal.fire('Cancelado!', 'O agendamento foi cancelado.', 'success');
                abrirMeusAgendamentos();
                carregarHorarios();
            } else {
                throw new Error();
            }
        } catch (e) {
            hideLoading();
            Swal.fire('Erro', 'Não foi possível cancelar.', 'error');
        }
    } else {
        abrirMeusAgendamentos();
    }
}