// ============================================================
// QUINFA — script.js
// Menu mobile + seleção de tamanho + carrinho funcional + contato
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'quinfa_carrinho';
  let carrinho = carregarCarrinho();

  configurarMenuMobile();
  criarEstruturaCarrinho();
  configurarSelecaoDeTamanho();
  configurarBotoesAdicionar();
  configurarAberturaCarrinho();
  configurarFormularioContato();
  renderizarCarrinho();

  // ---------------- Menu mobile ----------------
  function configurarMenuMobile() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (!navToggle || !navLinks) return;

    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('aberto');
      navToggle.classList.toggle('ativo');
    });

    navLinks.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('aberto');
        navToggle.classList.remove('ativo');
      })
    );
  }

  // ---------------- Persistência do carrinho ----------------
  function carregarCarrinho() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      return salvo ? JSON.parse(salvo) : [];
    } catch (e) {
      return [];
    }
  }

  function salvarCarrinho() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    } catch (e) { /* ignora erro de storage indisponível */ }
  }

  // ---------------- Seleção de tamanho nos cards ----------------
  function configurarSelecaoDeTamanho() {
    document.querySelectorAll('.card').forEach(card => {
      const chips = card.querySelectorAll('.size-chip:not(.unavailable)');

      // Se o produto só tem uma opção (ex: "Único"), já marca como selecionada
      if (chips.length === 1) {
        chips[0].classList.add('selected');
        card.dataset.tamanhoSelecionado = chips[0].textContent.trim();
      }

      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          chips.forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          card.dataset.tamanhoSelecionado = chip.textContent.trim();
        });
      });
    });
  }

  // ---------------- Adicionar à sacola ----------------
  function configurarBotoesAdicionar() {
    document.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.card');
        const nome = card.querySelector('h3').textContent.trim();
        const preco = parsePreco(card.querySelector('.price').textContent.trim());
        const tamanho = card.dataset.tamanhoSelecionado;

        if (!tamanho) {
          mostrarAviso(card, 'Escolha um tamanho antes de adicionar.');
          return;
        }

        const chave = nome + '|' + tamanho;
        const itemExistente = carrinho.find(i => i.chave === chave);

        if (itemExistente) {
          itemExistente.qtd += 1;
        } else {
          carrinho.push({ chave, nome, tamanho, preco, qtd: 1 });
        }

        salvarCarrinho();
        renderizarCarrinho();
        abrirCarrinho();
        feedbackBotao(btn);
      });
    });
  }

  function parsePreco(texto) {
    // "R$ 159" ou "R$ 89.99" -> 159 / 89.99
    const limpo = texto.replace('R$', '').trim().replace(',', '.');
    return parseFloat(limpo) || 0;
  }

  function mostrarAviso(card, mensagem) {
    let aviso = card.querySelector('.aviso-tamanho');
    if (!aviso) {
      aviso = document.createElement('p');
      aviso.className = 'aviso-tamanho';
      card.querySelector('.card-body').insertBefore(aviso, card.querySelector('.price'));
    }
    aviso.textContent = mensagem;
    clearTimeout(aviso._timeout);
    aviso._timeout = setTimeout(() => aviso.remove(), 2500);
  }

  function feedbackBotao(btn) {
    const textoOriginal = btn.textContent;
    btn.textContent = 'Adicionado ✓';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }, 900);
  }

  // ---------------- Estrutura do carrinho (badge + drawer) ----------------
  // Os estilos dessa estrutura ficam em styles.css (seção "Carrinho")
  function criarEstruturaCarrinho() {
    const sacolaBtn = document.querySelector('.icon-btn[aria-label="Sacola"]');
    if (sacolaBtn && !sacolaBtn.querySelector('.badge-carrinho')) {
      sacolaBtn.style.position = 'relative';
      const badge = document.createElement('span');
      badge.className = 'badge-carrinho';
      sacolaBtn.appendChild(badge);
    }

    if (!document.getElementById('carrinhoDrawer')) {
      const drawer = document.createElement('aside');
      drawer.id = 'carrinhoDrawer';
      drawer.innerHTML = `
        <div class="carrinho-overlay" id="carrinhoOverlay"></div>
        <div class="carrinho-painel">
          <div class="carrinho-cabecalho">
            <h3>Sua sacola</h3>
            <button id="fecharCarrinho" aria-label="Fechar">&times;</button>
          </div>
          <div class="carrinho-itens" id="carrinhoItens"></div>
          <div class="carrinho-rodape">
            <div class="carrinho-total">
              <span>Total</span>
              <strong id="carrinhoTotal">R$ 0,00</strong>
            </div>
            <button class="btn form-submit" id="finalizarPedido">Finalizar pedido</button>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);

      document.getElementById('carrinhoOverlay').addEventListener('click', fecharCarrinho);
      document.getElementById('fecharCarrinho').addEventListener('click', fecharCarrinho);
      document.getElementById('finalizarPedido').addEventListener('click', finalizarPedido);
    }
  }

  // ---------------- Renderização do carrinho ----------------
  function renderizarCarrinho() {
    const lista = document.getElementById('carrinhoItens');
    const totalEl = document.getElementById('carrinhoTotal');
    const badge = document.querySelector('.badge-carrinho');

    const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
    if (badge) {
      badge.textContent = qtdTotal;
      badge.classList.toggle('visivel', qtdTotal > 0);
    }
    if (!lista) return;

    if (carrinho.length === 0) {
      lista.innerHTML = '<p class="carrinho-vazio">Sua sacola está vazia.</p>';
      totalEl.textContent = formatarMoeda(0);
      return;
    }

    lista.innerHTML = carrinho.map(item => `
      <div class="carrinho-item" data-chave="${item.chave}">
        <div class="carrinho-item-info">
          <h4>${item.nome}</h4>
          <span>Tamanho: ${item.tamanho} · ${formatarMoeda(item.preco)}</span>
          <div class="carrinho-qtd">
            <button class="qtd-menos" aria-label="Diminuir">−</button>
            <span>${item.qtd}</span>
            <button class="qtd-mais" aria-label="Aumentar">+</button>
          </div>
        </div>
        <button class="carrinho-remover">Remover</button>
      </div>
    `).join('');

    const total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
    totalEl.textContent = formatarMoeda(total);

    lista.querySelectorAll('.carrinho-item').forEach(el => {
      const chave = el.dataset.chave;
      el.querySelector('.qtd-mais').addEventListener('click', () => alterarQtd(chave, 1));
      el.querySelector('.qtd-menos').addEventListener('click', () => alterarQtd(chave, -1));
      el.querySelector('.carrinho-remover').addEventListener('click', () => removerItem(chave));
    });
  }

  function alterarQtd(chave, delta) {
    const item = carrinho.find(i => i.chave === chave);
    if (!item) return;
    item.qtd += delta;
    if (item.qtd <= 0) carrinho = carrinho.filter(i => i.chave !== chave);
    salvarCarrinho();
    renderizarCarrinho();
  }

  function removerItem(chave) {
    carrinho = carrinho.filter(i => i.chave !== chave);
    salvarCarrinho();
    renderizarCarrinho();
  }

  function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ---------------- Abrir / fechar drawer ----------------
  function configurarAberturaCarrinho() {
    const sacolaBtn = document.querySelector('.icon-btn[aria-label="Sacola"]');
    if (sacolaBtn) sacolaBtn.addEventListener('click', abrirCarrinho);
  }
  function abrirCarrinho() {
    document.getElementById('carrinhoDrawer').classList.add('aberto');
  }
  function fecharCarrinho() {
    document.getElementById('carrinhoDrawer').classList.remove('aberto');
  }

  function finalizarPedido() {
    if (carrinho.length === 0) {
      alert('Sua sacola está vazia.');
      return;
    }
    alert('Pedido finalizado com sucesso! Entraremos em contato para confirmação.');
    carrinho = [];
    salvarCarrinho();
    renderizarCarrinho();
    fecharCarrinho();
  }

  // ---------------- Formulário de contato ----------------
  function configurarFormularioContato() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let feedback = document.getElementById('contactFeedback');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.id = 'contactFeedback';
      form.appendChild(feedback);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = form.nome.value.trim();
      const email = form.email.value.trim();
      const mensagem = form.mensagem.value.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!nome || !emailOk || !mensagem) {
        feedback.style.color = '#e5484d';
        feedback.textContent = 'Por favor, preencha todos os campos corretamente.';
        return;
      }

      feedback.style.color = '#16a34a';
      feedback.textContent = `Obrigado, ${nome}! Recebemos sua mensagem e retornaremos em breve.`;
      form.reset();
    });
  }
});