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

     // Controle de Acesso (RBAC) - Esconde menus se não for Dono
     if (state.perfil !== 'Dono') {
         document.querySelectorAll('.sidebar-nav a').forEach(link => {
             const texto = link.innerText;
             if (texto.includes('Config') || texto.includes('Equipe') || texto.includes('Serviços') || texto.includes('Clientes')) {
                 link.style.display = 'none';
                 // Esconde também o elemento pai (LI) se existir, para não ficar buraco
                 if(link.parentElement.tagName === 'LI') link.parentElement.style.display = 'none';
             }
         });
     }

     // --- FIX: Força o clique do botão Menu (Hambúrguer) no Celular ---
     const btnMenu = document.querySelector('.hamburger-btn');
     if (btnMenu) {
         // Remove clones antigos para garantir limpeza
         const novoBtn = btnMenu.cloneNode(true);
         btnMenu.parentNode.replaceChild(novoBtn, btnMenu);

         // Adiciona ouvinte robusto
         novoBtn.addEventListener('click', (e) => {
             e.preventDefault();
             e.stopPropagation(); // Impede que o clique "atravesse"
             toggleSidebar();
         });
     }

     // Carrega tema e inicia na Dashboard
     carregarConfiguracoesSalvas();
     carregarAdminData('dashboard');
 });

 function logout() {
     localStorage.clear();
     window.location.href = "login.html";
 }

 function toggleSidebar() {
     const sidebar = document.querySelector('.admin-sidebar');
     const overlay = document.querySelector('.sidebar-overlay');

     if(sidebar) sidebar.classList.toggle('show');
     if(overlay) overlay.classList.toggle('show');
 }

 // Função movida do HTML para cá (Clean Code)
 function copiarLinkAgendamento() {
     const link = window.location.origin + "/agendamento.html";
     navigator.clipboard.writeText(link);
     Swal.fire({
         toast: true,
         position: 'top-end',
         icon: 'success',
         title: 'Link copiado!',
         showConfirmButton: false,
         timer: 2000
     });
 }

 // ==================================================
 // 3. NAVEGAÇÃO E REQUISIÇÕES
 // ==================================================
 async function carregarAdminData(aba) {
     // 1. UI: Atualiza Menu Ativo
     document.querySelectorAll('.sidebar-nav a').forEach(el => el.classList.remove('active'));

     // Seletor inteligente para encontrar o link clicado
     const linkAtivo = document.querySelector(`.sidebar-nav a[onclick*="'${aba}'"]`) ||
                       document.querySelector(`.sidebar-nav a[onclick*='"${aba}"']`);
     if (linkAtivo) linkAtivo.classList.add('active');

     // 2. UI: Alterna Containers
     const container = document.getElementById('admin-content');
     const configSection = document.getElementById('config');

     if (aba === 'config') {
         if(container) container.style.display = 'none';
         if(configSection) configSection.style.display = 'block';
         return;
     }

     if(container) container.style.display = 'block';
     if(configSection) configSection.style.display = 'none';

     container.innerHTML = `
         <div class="loading-state">
             <i class="fas fa-circle-notch fa-spin"></i> Carregando dados...
         </div>`;

     // 3. Define Endpoint
     let endpoint = '';
     switch (aba) {
         case 'dashboard':
         case 'agenda':
             endpoint = state.perfil === 'Dono' ? '/agendamentos/admin/todos' : '/agendamentos/meus';
             break;
         case 'servicos': endpoint = '/servicos'; break;
         case 'equipe':   endpoint = '/barbeiros'; break;
         case 'clientes': endpoint = '/clientes'; break;
         default:         endpoint = '/agendamentos/meus';
     }

     // 4. Busca Dados
     try {
         const resposta = await apiFetch(endpoint);

         // FIX CRÍTICO: Suporte a Paginação (Page) vs Lista (List)
         // Se for Page, os dados estão em .content. Se for List, é o próprio objeto.
         state.cacheData = resposta.content ? resposta.content : resposta;

         // Garante que é um array para não quebrar o .map
         if (!Array.isArray(state.cacheData)) state.cacheData = [];

         // 5. Renderiza Tela
         if (aba === 'dashboard') {
             state.perfil === 'Dono' ? renderDashboardDono(container) : renderAgenda(container);
         }
         else if (aba === 'agenda') renderAgenda(container);
         else if (aba === 'servicos') renderListaGerencia(container, 'servicos');
         else if (aba === 'equipe') renderListaGerencia(container, 'barbeiros');
         else if (aba === 'clientes') renderListaClientes(container);

     } catch (error) {
         console.error(error);
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
 // 4. API FETCH (CAMADA DE REDE)
 // ==================================================
 async function apiFetch(endpoint, method = 'GET', body = null) {
     const options = {
         method: method,
         headers: { 'Content-Type': 'application/json', 'Authorization': state.token }
     };
     if (body) options.body = JSON.stringify(body);

     const res = await fetch(`${API_URL}${endpoint}`, options);

     // Tratamento de Sessão
     if (res.status === 401 || res.status === 403) {
         logout();
         throw new Error('Sessão expirada');
     }

     if (!res.ok) {
         const textoErro = await res.text();
         throw new Error(textoErro || 'Erro na requisição');
     }

     // Se for DELETE ou PUT sem conteúdo (204 No Content), retorna null
     if (res.status === 204) return null;

     // Tenta ler o JSON com segurança
     const texto = await res.text();
     return texto ? JSON.parse(texto) : null;
 }

 // ==================================================
 // 5. RENDERIZAÇÃO (VIEWS)
 // ==================================================

 // --- DASHBOARD ---
 function renderDashboardDono(container) {
     // Carrega financeiro em background
     apiFetch('/agendamentos/admin/financeiro').then(fin => {
         renderizarGrafico(fin);
         document.getElementById('dash-faturamento').innerText = formatarMoeda(fin.faturamentoTotal);
         document.getElementById('dash-lucro').innerText = formatarMoeda(fin.lucroCasa);
         document.getElementById('dash-comissao').innerText = formatarMoeda(fin.repasseBarbeiros);
     }).catch(() => {});

     const hojeStr = new Date().toISOString().split('T')[0];
     const agendamentosHoje = state.cacheData.filter(a => a.dataHoraInicio && a.dataHoraInicio.startsWith(hojeStr));

     container.innerHTML = `
         <div class="stats-grid">
             <div class="stat-card" style="border-left: 5px solid #4F46E5;">
                 <div class="stat-icon" style="background:#EEF2FF; color:#4F46E5;"><i class="fas fa-wallet"></i></div>
                 <div><h3 style="color:#64748B; font-size:12px;">Total Bruto</h3><span id="dash-faturamento" style="font-size:20px; font-weight:bold;">...</span></div>
             </div>
             <div class="stat-card" style="border-left: 5px solid #10B981;">
                 <div class="stat-icon" style="background:#D1FAE5; color:#059669;"><i class="fas fa-building"></i></div>
                 <div><h3 style="color:#64748B; font-size:12px;">Lucro Casa</h3><span id="dash-lucro" style="font-size:20px; font-weight:bold;">...</span></div>
             </div>
             <div class="stat-card" style="border-left: 5px solid #F59E0B;">
                 <div class="stat-icon" style="background:#FEF3C7; color:#D97706;"><i class="fas fa-users"></i></div>
                 <div><h3 style="color:#64748B; font-size:12px;">Comissões</h3><span id="dash-comissao" style="font-size:20px; font-weight:bold;">...</span></div>
             </div>
         </div>

         <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
              <div class="admin-card-container" style="height:300px; display:flex; justify-content:center; align-items:center;">
                 <canvas id="financeChart"></canvas>
             </div>
              <div class="admin-card-container" style="overflow-y:auto; height:300px;">
                 <h3 style="margin-bottom:15px; font-size:16px;">Hoje (${agendamentosHoje.length})</h3>
                 <table class="data-table">
                     <thead><tr><th>Hora</th><th>Cliente</th><th>Valor</th></tr></thead>
                     <tbody>
                         ${agendamentosHoje.length ? agendamentosHoje.map(a => `
                             <tr>
                                 <td>${a.dataHoraInicio.split('T')[1].substring(0,5)}</td>
                                 <td>${a.cliente?.nome || 'Anônimo'}</td>
                                 <td>${formatarMoeda(a.valorCobrado)}</td>
                             </tr>
                         `).join('') : '<tr><td colspan="3" style="text-align:center;">Sem agenda hoje.</td></tr>'}
                     </tbody>
                 </table>
             </div>
         </div>
     `;
 }

 // --- AGENDA ---
 function renderAgenda(container) {
     const dados = state.cacheData.sort((a, b) => new Date(b.dataHoraInicio) - new Date(a.dataHoraInicio));
     const btnBloqueio = state.perfil !== 'Dono' ? `<button onclick="abrirModalBloqueio()" class="btn-primary btn-sm" style="background:#64748B;"><i class="fas fa-ban"></i> Bloquear</button>` : '';

     let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2 class="page-title">Agenda</h2>${btnBloqueio}</div>`;

     if (dados.length === 0) html += '<p style="text-align:center; color:#94A3B8;">Nenhum agendamento encontrado.</p>';
     else {
         html += '<div style="display:flex; flex-direction:column; gap:10px;">';
         html += dados.map(a => {
             const isConcluido = a.status === 'CONCLUIDO';
             const botoes = !isConcluido && a.status !== 'CANCELADO' ? `
                 <div style="display:flex; gap:10px;">
                     <button onclick="deletarAgendamento(${a.id})" style="color:#EF4444; border:none; background:none; cursor:pointer;" title="Cancelar"><i class="fas fa-times"></i></button>
                     <button onclick="concluirAtendimento(${a.id})" class="badge badge-confirmado" style="border:none; cursor:pointer;" title="Concluir"><i class="fas fa-check"></i></button>
                 </div>` : `<span class="badge badge-${statusClass(a.status)}">${a.status}</span>`;

             return `
             <div style="background:white; padding:15px; border-radius:8px; border-left:4px solid ${isConcluido ? '#10B981' : '#4F46E5'}; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                 <div>
                     <strong>${formatarData(a.dataHoraInicio)}</strong> <span style="color:#64748B;">— ${a.cliente?.nome}</span> <br>
                     <small style="color:#64748B;">${a.servico?.nome} ${state.perfil === 'Dono' ? ' • ' + a.barbeiroNome : ''}</small>
                 </div>
                 ${botoes}
             </div>`;
         }).join('');
         html += '</div>';
     }
     container.innerHTML = html;
 }

 // --- GERENCIAMENTO (SERVIÇOS / EQUIPE) ---
 function renderListaGerencia(container, tipo) {
     const dados = state.cacheData;
     const titulo = tipo === 'servicos' ? 'Serviços' : 'Equipe';

     let html = `
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
             <h2 class="page-title">Gerenciar ${titulo}</h2>
             <button onclick="adicionarItem('${tipo}')" class="btn-primary btn-sm"><i class="fas fa-plus"></i> Novo</button>
         </div>`;

     if (dados.length === 0) html += '<p style="text-align:center; color:#94A3B8;">Lista vazia.</p>';
     else {
         html += '<div style="display:grid; gap:10px;">';
         html += dados.map(item => `
             <div style="background:white; padding:15px; border-radius:8px; border:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                 <div>
                     <strong>${item.nome}</strong> <br>
                     <small style="color:#64748B;">${item.email || formatarMoeda(item.preco)} ${item.telefone ? '• '+item.telefone : ''}</small>
                 </div>
                 <button onclick="deletarItem('${tipo}', ${item.id})" style="color:#EF4444; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
             </div>
         `).join('');
         html += '</div>';
     }
     container.innerHTML = html;
 }

 // --- CLIENTES ---
 function renderListaClientes(container) {
     const dados = state.cacheData;
     let html = `
         <h2 class="page-title" style="margin-bottom:20px;">Base de Clientes (${dados.length})</h2>
         <div class="admin-card-container">
             <table class="data-table">
                 <thead><tr><th>Nome</th><th>Telefone</th><th>Contato</th></tr></thead>
                 <tbody>`;

     html += dados.map(c => `
         <tr>
             <td>${c.nome}</td>
             <td>${c.telefone || '-'}</td>
             <td>
                 ${c.telefone ?
                 `<a href="https://wa.me/55${limparTelefone(c.telefone)}" target="_blank" style="color:#25D366; font-weight:600; text-decoration:none;">
                     <i class="fab fa-whatsapp"></i> Chamar
                  </a>` : '-'}
             </td>
         </tr>
     `).join('');

     html += '</tbody></table></div>';
     container.innerHTML = html;
 }

 // ==================================================
 // 6. AÇÕES CRUD
 // ==================================================

 async function adicionarItem(tipo) {
     if (tipo === 'servicos') {
         const { value: form } = await Swal.fire({
             title: 'Novo Serviço',
             html: `
                 <input id="swal-nome" class="swal2-input" placeholder="Nome (Ex: Corte)">
                 <input id="swal-preco" type="number" class="swal2-input" placeholder="Preço (Ex: 35.00)">
                 <input id="swal-tempo" type="number" class="swal2-input" placeholder="Duração (min)">
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
                 nome: form[0],
                 preco: parseFloat(form[1]),
                 duracaoEmMinutos: parseInt(form[2] || 30)
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
                 <label style="margin-top:10px; font-size:12px;">Comissão (%)</label>
                 <input id="swal-com" type="number" class="swal2-input" value="50">
             `,
             focusConfirm: false, showCancelButton: true, confirmButtonText: 'Cadastrar',
             didOpen: () => {
                 const el = document.getElementById('swal-tel');
                 if(typeof IMask !== 'undefined') IMask(el, {mask: '(00) 00000-0000'});
             },
             preConfirm: () => [
                 document.getElementById('swal-nome').value,
                 document.getElementById('swal-email').value,
                 document.getElementById('swal-tel').value.replace(/\D/g, ''), // Limpa zap
                 document.getElementById('swal-pass').value,
                 document.getElementById('swal-com').value
             ]
         });

         if (form && form[0] && form[1]) {
             await apiFetch('/barbeiros', 'POST', {
                 nome: form[0],
                 email: form[1],
                 telefone: form[2],
                 senha: form[3],
                 especialidade: 'Barbeiro',
                 comissaoPorcentagem: parseFloat(form[4])
             });
             carregarAdminData('equipe');
         }
     }
 }

 async function deletarItem(tipo, id) {
     if ((await Swal.fire({ title: 'Tem certeza?', text: "Irreversível.", icon: 'warning', showCancelButton: true })).isConfirmed) {
         await apiFetch(`/${tipo}/${id}`, 'DELETE');
         carregarAdminData(tipo === 'servicos' ? 'servicos' : 'equipe');
     }
 }

 async function deletarAgendamento(id) {
     if ((await Swal.fire({ title: 'Cancelar?', icon: 'warning', showCancelButton: true })).isConfirmed) {
         await apiFetch(`/agendamentos/${id}/barbeiro`, 'DELETE');
         carregarAdminData('agenda');
     }
 }

 async function concluirAtendimento(id) {
     if ((await Swal.fire({ title: 'Concluir?', text: 'Confirma o pagamento?', icon: 'question', showCancelButton: true })).isConfirmed) {
         await apiFetch(`/agendamentos/${id}/concluir`, 'PUT');
         carregarAdminData('agenda');
     }
 }

 async function abrirModalBloqueio() {
     const hoje = new Date().toISOString().split('T')[0];
     const { value: form } = await Swal.fire({
         title: 'Bloquear Horário',
         html: `
             <input id="bq-data" type="date" class="swal2-input" value="${hoje}">
             <div style="display:flex; gap:10px">
                 <input id="bq-ini" type="time" class="swal2-input" value="12:00">
                 <input id="bq-fim" type="time" class="swal2-input" value="13:00">
             </div>
             <input id="bq-mot" class="swal2-input" placeholder="Motivo (ex: Almoço)">
         `,
         focusConfirm: false, showCancelButton: true, confirmButtonText: 'Bloquear',
         preConfirm: () => ({
             d: document.getElementById('bq-data').value,
             i: document.getElementById('bq-ini').value,
             f: document.getElementById('bq-fim').value,
             m: document.getElementById('bq-mot').value
         })
     });

     if (form) {
         await apiFetch('/bloqueios', 'POST', {
             inicio: `${form.d}T${form.i}:00`,
             fim: `${form.d}T${form.f}:00`,
             motivo: form.m
             // ID do barbeiro vai pelo Token
         });
         carregarAdminData('agenda');
     }
 }

 // ==================================================
 // 7. HELPERS (UTILITÁRIOS VISUAIS)
 // ==================================================
 function renderizarGrafico(d) {
     const ctx = document.getElementById('financeChart');
     if (!ctx) return;
     if (window.meuGrafico) window.meuGrafico.destroy();
     window.meuGrafico = new Chart(ctx, {
         type: 'doughnut',
         data: { labels: ['Lucro da Casa', 'Comissão Barbeiros'], datasets: [{ data: [d.lucroCasa, d.repasseBarbeiros], backgroundColor: ['#10B981', '#F59E0B'] }] },
         options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
     });
 }

 function carregarConfiguracoesSalvas() {
     const tema = JSON.parse(localStorage.getItem('site_config') || '{}');
     if (tema.cor) document.documentElement.style.setProperty('--primary', tema.cor);
     if (tema.cor && document.getElementById('conf-color')) document.getElementById('conf-color').value = tema.cor;
     if (tema.nome) document.getElementById('conf-name').value = tema.nome;
     if (tema.bg) document.getElementById('conf-bg').value = tema.bg;
     previewBg(tema.bg);
 }

 function salvarPersonalizacao() {
     localStorage.setItem('site_config', JSON.stringify({
         cor: document.getElementById('conf-color').value,
         nome: document.getElementById('conf-name').value,
         bg: document.getElementById('conf-bg').value
     }));
     Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Salvo!', showConfirmButton: false, timer: 1500 });
 }

 function previewBg(u) { if(u && document.getElementById('bg-preview')) document.getElementById('bg-preview').style.backgroundImage = `url('${u}')`; }
 function formatarMoeda(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
 function formatarData(d) { if(!d) return '-'; const x = new Date(d); return x.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) + ' ' + x.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); }
 function statusClass(s) { return (s||'').toLowerCase().includes('can') ? 'cancelado' : (s||'').toLowerCase().includes('con') ? 'concluido' : 'agendado'; }
 function limparTelefone(t) { return (t||'').replace(/\D/g, ''); }