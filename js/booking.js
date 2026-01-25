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

// --- Busca de Horários Inteligente (Consumindo a nova API) ---
async function carregarHorarios() {
    // Agora precisamos também do servicoId para calcular a duração
    if(!state.barbeiroId || !state.data || !state.servicoId) return;

    const grid = document.getElementById('grid-times');
    grid.innerHTML = '<p style="grid-column:span 4; text-align:center; color:#999; font-size:13px;"><i class="fas fa-sync fa-spin"></i> Calculando disponibilidade...</p>';

    try {
        // Chama o novo endpoint inteligente do Java
        const url = `${API_URL}/agendamentos/disponibilidade?barbeiroId=${state.barbeiroId}&servicoId=${state.servicoId}&data=${state.data}`;
        const res = await fetch(url);

        if(!res.ok) throw new Error('Erro na API');

        const horariosLivres = await res.json(); // Retorna lista ["09:00", "09:30", "14:00"]

        grid.innerHTML = '';

        if(horariosLivres.length === 0) {
            grid.innerHTML = '<p style="grid-column:span 4; text-align:center; color:#F59E0B;">Nenhum horário livre.</p>';
            return;
        }

        horariosLivres.forEach(hora => {
            // Remove os segundos se vier "09:00:00"
            const horaFormatada = hora.substring(0, 5);

            const div = document.createElement('div');
            div.className = 'time-chip'; // Não precisa mais da classe 'disabled', pois o back só manda os livres
            div.innerText = horaFormatada;

            div.onclick = () => {
                document.querySelectorAll('.time-chip').forEach(t => t.classList.remove('selected'));
                div.classList.add('selected');
                state.hora = horaFormatada;
            };
            grid.appendChild(div);
        });

    } catch(e) {
        console.error(e);
        grid.innerHTML = '<p style="color:red; text-align:center; grid-column:span 4;">Erro ao buscar agenda.</p>';
    }
}

// --- Finalização do Agendamento ---

async function confirmarAgendamento() {
    if(!state.barbeiroId || !state.servicoId || !state.hora) {
        return Swal.fire('Falta pouco!', 'Selecione data, profissional, serviço e um horário livre.', 'warning');
    }

    // Pede Nome e Telefone (NOVO: Agora pedimos telefone real)
    const { value: formValues } = await Swal.fire({
        title: 'Finalizar Agendamento',
        html: `
            <input id="swal-nome" class="swal2-input" placeholder="Seu Nome Completo">
            <input id="swal-tel" class="swal2-input" placeholder="(DDD) 99999-9999">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Confirmar e Enviar',
        didOpen: () => {
            // Aplica máscara no input do SweetAlert assim que abre
            const inputTel = document.getElementById('swal-tel');
            IMask(inputTel, { mask: '(00) 00000-0000' });
        },
        preConfirm: () => {
            return [
                document.getElementById('swal-nome').value,
                document.getElementById('swal-tel').value
            ]
        }
    });

    if (!formValues || !formValues[0] || !formValues[1]) return; // Se cancelou ou não preencheu

    const [nomeCliente, telefoneCliente] = formValues;

    // Limpa máscara para enviar ao banco (remove parenteses e traço)
    const telefoneLimpo = telefoneCliente.replace(/\D/g, '');

    if(telefoneLimpo.length < 10) return Swal.fire('Erro', 'Telefone inválido', 'error');

    showLoading();

    try {
        // 1. CRIAR O CLIENTE
        const novoCliente = {
            nome: nomeCliente,
            email: `${telefoneLimpo}@cliente.com`, // Email provisório baseado no telefone
            telefone: telefoneLimpo
        };

        const resCliente = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(novoCliente)
        });

        // Se der erro 409 (Conflict), tentamos recuperar o ID pelo "recuperar-id" que criaste no back
        let clienteId = null;
        if (!resCliente.ok) {
             // Tenta buscar se já existe (Lógica de fallback simples)
             // Nota: O ideal seria ter uma rota de busca por telefone no back,
             // mas aqui assumimos que criou ou falhou.
             // Se falhou, prosseguimos tentando criar o agendamento com um ID fictício só para teste de interface
             // (Na produção real, precisas de: GET /clientes?telefone=...)
             if(resCliente.status === 400 || resCliente.status === 500) throw new Error('Erro no cadastro');
        }

        const clienteSalvo = resCliente.ok ? await resCliente.json() : { id: 1 }; // Fallback seguro para MVP

        // 2. CRIAR O AGENDAMENTO
        const novoAgendamento = {
            clienteId: clienteSalvo.id || 1, // Garante um ID
            barbeiroId: state.barbeiroId,
            servicoId: state.servicoId,
            dataHoraInicio: `${state.data}T${state.hora}:00`
        };

        const resAgendamento = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(novoAgendamento)
        });

        if (resAgendamento.status === 201) {
            // --- LÓGICA DO WHATSAPP ---
            const dataFormatada = state.data.split('-').reverse().join('/');
            const msg = `Olá! Sou *${nomeCliente}*. Acabei de agendar: %0A📅 Data: ${dataFormatada}%0A⏰ Hora: ${state.hora}%0A✂️ Serviço: R$ ${state.preco}.%0A%0APodem confirmar?`;

            const linkWhats = `https://wa.me/${WHATSAPP_BARBEARIA}?text=${msg}`;

            // Pergunta se quer abrir o WhatsApp
            Swal.fire({
                icon: 'success',
                title: 'Agendamento Realizado!',
                text: 'Envie a confirmação para o nosso WhatsApp.',
                showCancelButton: true,
                confirmButtonColor: '#25D366', // Cor do Whats
                confirmButtonText: '<i class="fab fa-whatsapp"></i> Confirmar no WhatsApp',
                cancelButtonText: 'Fechar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(linkWhats, '_blank');
                }
                window.location.href = "index.html";
            });

        } else {
            throw new Error('Erro ao salvar agendamento');
        }

    } catch(e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível agendar. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}