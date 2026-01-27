// ==================================================
// 1. CONFIGURAÇÕES & ESTADO
// ==================================================
// Certifique-se de que js/utils.js carregou antes para ter API_URL

// Estado Local do Agendamento
const state = {
    data: new Date().toISOString().split('T')[0],
    barbeiroId: null,
    barbeiroTel: null, // <--- NOVO CAMPO
    servicoId: null,
    hora: null,
    preco: 0,
    duracaoServico: 30
};

// ==================================================
// 2. INICIALIZAÇÃO
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarData();
    carregarRecursos();

    // Listener para Data
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            state.data = e.target.value;
            atualizarHorariosDisponiveis();
        });
    }
});

function inicializarData() {
    // Define min="hoje" para não agendar no passado
    const hoje = new Date().toISOString().split('T')[0];
    const inputDate = document.getElementById('date-picker');
    if (inputDate) {
        inputDate.value = hoje;
        inputDate.min = hoje;
        state.data = hoje;
    }
}

// ==================================================
// 3. CARREGAMENTO DE DADOS (API)
// ==================================================
async function carregarRecursos() {
    const listBarbeiros = document.getElementById('list-barbers');
    const listServicos = document.getElementById('list-services');

    // 1. Limpa visualmente e garante que o Loading Overlay apareça
    listBarbeiros.innerHTML = '';
    listServicos.innerHTML = '';
    showLoading(); // Função do utils.js

    try {
        // 2. Busca Barbeiros e Serviços em paralelo (Mais rápido)
        const [resBarbeiros, resServicos] = await Promise.all([
            fetch(`${API_URL}/barbeiros`),
            fetch(`${API_URL}/servicos`)
        ]);

        const barbeiros = await resBarbeiros.json();
        const servicos = await resServicos.json();

        // 3. Renderiza Barbeiros (Com validação de lista vazia)
        if (barbeiros.length === 0) {
            listBarbeiros.innerHTML = '<p class="placeholder-text">Nenhum profissional disponível.</p>';
        } else {
            listBarbeiros.innerHTML = barbeiros.map(b => `
                <div class="barber-item" onclick="selecionarBarbeiro(this, ${b.id}, '${b.telefone || ''}')">
                    <div class="barber-avatar">${b.nome.charAt(0).toUpperCase()}</div>
                    <span class="barber-name">${b.nome.split(' ')[0]}</span>
                </div>
            `).join('');
        }

        // 4. Renderiza Serviços (Com validação de lista vazia)
        if (servicos.length === 0) {
            listServicos.innerHTML = '<p class="placeholder-text">Nenhum serviço disponível.</p>';
        } else {
            listServicos.innerHTML = servicos.map(s => `
                <div class="service-item-modern" onclick="selecionarServico(this, ${s.id}, ${s.preco}, ${s.duracaoEmMinutos})">
                    <div class="service-info">
                        <h4>${s.nome}</h4>
                        <p>${s.duracaoEmMinutos} min</p>
                    </div>
                    <div class="service-price-tag">${formatarMoeda(s.preco)}</div>
                </div>
            `).join('');
        }

    } catch (e) {
        console.error("Erro ao carregar:", e);

        // Mensagens visuais no lugar das listas
        listBarbeiros.innerHTML = '<p style="color:#EF4444; font-size:13px; padding:10px;">Falha ao carregar profissionais.</p>';
        listServicos.innerHTML = '<p style="color:#EF4444; font-size:13px; padding:10px;">Falha ao carregar serviços.</p>';

        // Alerta flutuante para o usuário saber que deu erro
        Swal.fire({
            icon: 'error',
            title: 'Erro de Conexão',
            text: 'Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente em instantes.',
            confirmButtonColor: '#4F46E5'
        });

    } finally {
        // --- CORREÇÃO CRÍTICA ---
        // Isso remove a tela de "Carregando..." independente se deu certo ou erro.
        hideLoading();
    }
}

// ==================================================
// 4. INTERAÇÃO & SELEÇÃO
// ==================================================

function selecionarBarbeiro(element, id, telefone) {
    // Visual
    document.querySelectorAll('.barber-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // Estado
    state.barbeiroId = id;
    state.barbeiroTel = telefone; // <--- SALVA O TELEFONE DO BARBEIRO

    // Feedback
    atualizarHorariosDisponiveis();
}

function selecionarServico(element, id, preco, duracao) {
    // Visual
    document.querySelectorAll('.service-item-modern').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // Estado
    state.servicoId = id;
    state.preco = preco;
    state.duracaoServico = duracao;

    // Atualiza Footer e Horários
    mostrarFooter(preco);
    atualizarHorariosDisponiveis();
}

function mostrarFooter(valor) {
    const footer = document.getElementById('booking-footer');
    const totalEl = document.getElementById('total-price');

    if (footer && totalEl) {
        footer.classList.remove('hidden'); // Classe CSS que controla visibilidade
        footer.style.display = 'flex'; // Fallback
        totalEl.innerText = formatarMoeda(valor);
    }
}

// ==================================================
// 5. LÓGICA DE HORÁRIOS (Backend Inteligente)
// ==================================================
async function atualizarHorariosDisponiveis() {
    const grid = document.getElementById('grid-times');

    // Só busca se tiver Barbeiro e Serviço selecionados (pois a duração importa)
    if (!state.barbeiroId || !state.servicoId) {
        grid.innerHTML = '<p class="grid-placeholder">Selecione profissional e serviço para ver os horários.</p>';
        return;
    }

    grid.innerHTML = '<p class="grid-placeholder"><i class="fas fa-circle-notch fa-spin"></i> Verificando disponibilidade...</p>';

    try {
        // Chama API de disponibilidade real
        // O Backend calcula bloqueios, outros agendamentos e horários passados
        const url = `${API_URL}/agendamentos/disponibilidade?barbeiroId=${state.barbeiroId}&data=${state.data}&servicoId=${state.servicoId}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error('Falha na API');

        const horariosLivres = await res.json(); // Ex: ["09:00", "10:30"]

        grid.innerHTML = '';

        if (horariosLivres.length === 0) {
            grid.innerHTML = '<p class="grid-placeholder" style="color:#F59E0B;">Sem horários livres para esta data.</p>';
            return;
        }

        horariosLivres.forEach(hora => {
            const horaSimples = hora.substring(0, 5); // Remove segundos
            const chip = document.createElement('div');
            chip.className = 'time-chip';
            chip.innerText = horaSimples;

            chip.onclick = () => {
                document.querySelectorAll('.time-chip').forEach(t => t.classList.remove('selected'));
                chip.classList.add('selected');
                state.hora = horaSimples;
            };

            grid.appendChild(chip);
        });

    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="grid-placeholder" style="color:#EF4444;">Erro ao buscar horários.</p>';
    }
}

async function confirmarAgendamento() {
    // 1. Validações Locais
    if (!state.barbeiroId || !state.servicoId || !state.hora) {
        return Swal.fire({
            icon: 'warning',
            title: 'Falta pouco!',
            text: 'Por favor, selecione data, profissional, serviço e horário.',
            confirmButtonColor: '#6366F1'
        });
    }

    // 2. Coleta de Dados do Cliente
    const { value: form } = await Swal.fire({
        title: 'Finalizar Agendamento',
        html: `
            <div style="text-align:left;">
                <label style="font-size:12px; color:#666;">Seu Nome</label>
                <input id="swal-nome" class="swal2-input" placeholder="Ex: João Silva" style="margin-top:5px;">

                <label style="font-size:12px; color:#666; margin-top:15px; display:block;">Seu WhatsApp</label>
                <input id="swal-tel" class="swal2-input" placeholder="(00) 00000-0000" style="margin-top:5px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        confirmButtonColor: '#10B981',
        cancelButtonText: 'Voltar',
        didOpen: () => {
            const inputTel = document.getElementById('swal-tel');
            if(typeof IMask !== 'undefined') IMask(inputTel, { mask: '(00) 00000-0000' });
        },
        preConfirm: () => {
            const nome = document.getElementById('swal-nome').value;
            const tel = document.getElementById('swal-tel').value;
            if (!nome || tel.length < 14) {
                Swal.showValidationMessage('Preencha nome e telefone corretamente');
            }
            return { nome, tel };
        }
    });

    if (!form) return; // Cancelou

    // 3. Processamento
    showLoading();

    try {
        const telefoneLimpo = form.tel.replace(/\D/g, '');

        // Passo A: Upsert Cliente
        const resCliente = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: form.nome,
                telefone: telefoneLimpo,
                email: null
            })
        });

        if (!resCliente.ok) throw new Error('Erro ao salvar cliente');
        const clienteSalvo = await resCliente.json();

        // Passo B: Criar Agendamento
        const payloadAgendamento = {
            clienteId: clienteSalvo.id,
            barbeiroId: state.barbeiroId,
            servicoId: state.servicoId,
            dataHoraInicio: `${state.data}T${state.hora}:00`
        };

        const resAgendamento = await fetch(`${API_URL}/agendamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadAgendamento)
        });

        if (resAgendamento.status === 201) {
            // SUCESSO!

            // --- LÓGICA DE WHATSAPP ATUALIZADA ---
            const dataFormatada = state.data.split('-').reverse().join('/');
            const msgZap = `Olá! Sou *${form.nome}*. Agendei para dia ${dataFormatada} às ${state.hora}. Poderia confirmar?`;

            // Verifica se temos o telefone do barbeiro no state (salvo no selecionarBarbeiro)
            // Se não tiver, usa o geral da barbearia (WHATSAPP_BARBEARIA do utils.js)
            let numeroDestino = WHATSAPP_BARBEARIA;

            if (state.barbeiroTel) {
                // Garante formato internacional (55 + numero limpo)
                numeroDestino = "55" + state.barbeiroTel.replace(/\D/g, '');
            }

            const linkZap = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(msgZap)}`;

            Swal.fire({
                icon: 'success',
                title: 'Agendamento Confirmado!',
                text: 'Seu horário foi reservado com sucesso.',
                showCancelButton: true,
                confirmButtonText: '<i class="fab fa-whatsapp"></i> Avisar Profissional',
                confirmButtonColor: '#25D366',
                cancelButtonText: 'Fechar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(linkZap, '_blank');
                }
                window.location.href = "index.html";
            });

        } else {
            const erroTxt = await resAgendamento.text();
            throw new Error(erroTxt || 'Erro ao criar agendamento');
        }

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Ops!',
            text: 'Esse horário acabou de ser ocupado. Tente outro.',
            confirmButtonColor: '#EF4444'
        }).then(() => {
            atualizarHorariosDisponiveis();
        });
    } finally {
        hideLoading();
    }
}

// 7. HELPERS
// ==================================================
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Wrapper para Loading (Compatibilidade com utils.js)
function showLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) {
        loader.classList.remove('hidden');
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('loading-overlay');
    if(loader) {
        loader.classList.add('hidden');
        loader.style.display = 'none';
    }
}