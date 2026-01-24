// ==================================================
// LÓGICA DE AGENDAMENTO (CLIENTE)
// ==================================================

// Certifique-se que js/utils.js está carregado antes deste arquivo para pegar a API_URL

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosIniciaisBooking();

    // Listener para quando o usuário troca a data no input
    const datePicker = document.getElementById('date-picker');
    if(datePicker) {
        datePicker.addEventListener('change', (e) => {
            state.data = e.target.value;
            carregarHorarios(); // Recarrega os horários disponíveis
        });
    }
});

async function carregarDadosIniciaisBooking() {
    // 1. Define data de hoje no input
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('date-picker').value = hoje;
    state.data = hoje;

    const listB = document.getElementById('list-barbers');
    const listS = document.getElementById('list-services');

    try {
        // 2. Busca Barbeiros e Serviços ao mesmo tempo
        const [resB, resS] = await Promise.all([
            fetch(`${API_URL}/barbeiros`),
            fetch(`${API_URL}/servicos`)
        ]);

        const barbeiros = await resB.json();
        const servicos = await resS.json();

        // 3. Renderiza a lista de Barbeiros (Bolinhas)
        listB.innerHTML = barbeiros.map(b => `
            <div class="barber-item" onclick="selecionarBarbeiro(this, ${b.id})">
                <div class="barber-avatar">${b.nome.charAt(0).toUpperCase()}</div>
                <span class="barber-name">${b.nome.split(' ')[0]}</span>
            </div>
        `).join('');

        // 4. Renderiza a lista de Serviços (Cards)
        listS.innerHTML = servicos.map(s => `
            <div class="service-item-modern" onclick="selecionarServico(this, ${s.id}, ${s.preco})">
                <div class="service-info">
                    <h4>${s.nome}</h4>
                    <p>${s.duracaoEmMinutos} min</p>
                </div>
                <div class="service-price-tag">${formatarMoeda(s.preco)}</div>
            </div>
        `).join('');

    } catch(e) {
        console.error(e);
        listB.innerHTML = '<p style="color:red; padding:10px;">Erro ao conectar com o servidor.</p>';
        listS.innerHTML = '<p style="color:#666; padding:10px;">Verifique se o backend está rodando.</p>';
    }
}

// --- Funções de Seleção Visual ---

function selecionarBarbeiro(el, id) {
    // Remove classe 'selected' de todos e adiciona no clicado
    document.querySelectorAll('.barber-item').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');

    // Salva no estado global
    state.barbeiroId = id;

    // Busca horários para esse barbeiro nessa data
    carregarHorarios();
}

function selecionarServico(el, id, preco) {
    document.querySelectorAll('.service-item-modern').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');

    state.servicoId = id;
    state.preco = preco;

    // Mostra o Footer com o preço total
    document.getElementById('booking-footer').style.display = 'flex';
    document.getElementById('total-price').innerText = formatarMoeda(preco);
}

// --- Busca de Horários (Inteligente) ---

async function carregarHorarios() {
    // Só busca se tiver barbeiro e data selecionados
    if(!state.barbeiroId || !state.data) return;

    const grid = document.getElementById('grid-times');
    grid.innerHTML = '<p style="grid-column:span 4; text-align:center; color:#999; font-size:13px;">Verificando agenda...</p>';

    try {
        // Chama o endpoint: GET /agendamentos/barbeiro/{id}?data={aaaa-mm-dd}
        const res = await fetch(`${API_URL}/agendamentos/barbeiro/${state.barbeiroId}?data=${state.data}`);
        const agendamentosExistentes = await res.json();

        // Extrai apenas as horas dos agendamentos (ex: "14:00")
        const horasOcupadas = agendamentosExistentes.map(a => a.dataHoraInicio.split('T')[1].substring(0, 5));

        grid.innerHTML = '';

        // Gera horários das 09:00 às 19:00
        for(let i=9; i<=19; i++) {
            const hora = i.toString().padStart(2, '0') + ":00";
            const div = document.createElement('div');

            // Se a hora estiver na lista de ocupados, desabilita
            const busy = horasOcupadas.includes(hora);

            div.className = `time-chip ${busy ? 'disabled' : ''}`;
            div.innerText = hora;

            if(!busy) {
                div.onclick = () => {
                    document.querySelectorAll('.time-chip').forEach(t => t.classList.remove('selected'));
                    div.classList.add('selected');
                    state.hora = hora; // Salva a hora escolhida
                };
            }
            grid.appendChild(div);
        }
    } catch(e) {
        grid.innerHTML = '<p style="color:red; text-align:center; grid-column:span 4;">Erro ao buscar agenda.</p>';
    }
}

// --- Finalização do Agendamento ---

async function confirmarAgendamento() {
    // Validação básica frontend
    if(!state.barbeiroId || !state.servicoId || !state.hora) {
        return Swal.fire('Falta pouco!', 'Selecione data, profissional, serviço e um horário livre.', 'warning');
    }

    // Pede o nome do cliente
    const {value: nome} = await Swal.fire({
        title: 'Finalizar Agendamento',
        input: 'text',
        inputPlaceholder: 'Digite seu nome completo',
        showCancelButton: true,
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Confirmar'
    });

    if(!nome) return;

    showLoading(); // Mostra loader

    try {
        // 1. CRIAR O CLIENTE (AUTOMÁTICO)
        // Usamos um email dinâmico para garantir que o cadastro passe (evita erro de duplicidade)
        // Usamos um telefone padrão válido para passar na validação @Valid do Java
        const novoCliente = {
            nome: nome,
            email: `cliente_${Date.now()}@barber.com`,
            telefone: '11999999999'
        };

        const resCliente = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(novoCliente)
        });

        if(!resCliente.ok) throw new Error('Erro ao cadastrar cliente');
        const clienteSalvo = await resCliente.json();

        // 2. CRIAR O AGENDAMENTO
        const novoAgendamento = {
            clienteId: clienteSalvo.id,
            barbeiroId: state.barbeiroId,
            servicoId: state.servicoId,
            dataHoraInicio: `${state.data}T${state.hora}:00` // Formato ISO: 2023-10-25T14:00:00
        };

        const resAgendamento = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(novoAgendamento)
        });

        if(resAgendamento.status === 201) {
            Swal.fire({
                icon: 'success',
                title: 'Agendado com Sucesso!',
                text: `Te esperamos dia ${state.data.split('-').reverse().join('/')} às ${state.hora}.`,
                confirmButtonColor: '#4F46E5'
            }).then(() => {
                window.location.href = "index.html"; // Volta pra home
            });
        } else {
            throw new Error('Erro ao salvar agendamento');
        }

    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível agendar. Tente outro horário.', 'error');
    } finally {
        hideLoading(); // Esconde loader
    }
}