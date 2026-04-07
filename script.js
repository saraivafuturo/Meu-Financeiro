const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const STORAGE_KEY = 'meu-financeiro-dashboard-v1';
const form = document.getElementById('entry-form');
const historicoEl = document.getElementById('historico');
const receitasEl = document.getElementById('receitas');
const despesasEl = document.getElementById('despesas');
const saldoEl = document.getElementById('saldo');
const progressEl = document.getElementById('progress');
const metaTextEl = document.getElementById('meta-text');
const chartEl = document.getElementById('categoria-chart');
const tabButtons = document.querySelectorAll('.tab-btn');

let scopeAtual = 'pessoal';
let state = loadState();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const descricao = document.getElementById('descricao').value.trim();
  const valor = Number(document.getElementById('valor').value);
  const tipo = document.getElementById('tipo').value;
  const categoria = document.getElementById('categoria').value;

  if (!descricao || Number.isNaN(valor) || valor <= 0) {
    return;
  }

  state[scopeAtual].push({
    id: crypto.randomUUID(),
    descricao,
    valor,
    tipo,
    categoria,
    data: new Date().toISOString()
  });

  saveState();
  render();
  form.reset();
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    scopeAtual = button.dataset.scope;

    tabButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');

    render();
  });
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      pessoal: [],
      trabalho: []
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      pessoal: parsed.pessoal || [],
      trabalho: parsed.trabalho || []
    };
  } catch {
    return {
      pessoal: [],
      trabalho: []
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const entries = state[scopeAtual];

  const receitas = entries
    .filter((entry) => entry.tipo === 'receita')
    .reduce((total, entry) => total + entry.valor, 0);

  const despesas = entries
    .filter((entry) => entry.tipo === 'despesa')
    .reduce((total, entry) => total + entry.valor, 0);

  const saldo = receitas - despesas;

  receitasEl.textContent = currencyFormatter.format(receitas);
  despesasEl.textContent = currencyFormatter.format(despesas);
  saldoEl.textContent = currencyFormatter.format(saldo);
  saldoEl.style.color = saldo >= 0 ? '#4ade80' : '#f87171';

  const meta = receitas * 0.2;
  const poupado = Math.max(saldo, 0);
  const progresso = meta > 0 ? Math.min((poupado / meta) * 100, 100) : 0;

  progressEl.style.width = `${progresso}%`;
  metaTextEl.textContent = meta > 0
    ? `${currencyFormatter.format(poupado)} de ${currencyFormatter.format(meta)} (${progresso.toFixed(0)}%)`
    : 'Defina receitas para calcular a meta.';

  renderHistory(entries);
  renderCategoryChart(entries);
}

function renderHistory(entries) {
  historicoEl.innerHTML = '';

  if (!entries.length) {
    historicoEl.innerHTML = '<li>Nenhuma movimentação cadastrada ainda.</li>';
    return;
  }

  [...entries]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .forEach((entry) => {
      const item = document.createElement('li');
      const valorClass = entry.tipo === 'receita' ? 'receita' : 'despesa';
      const prefix = entry.tipo === 'receita' ? '+' : '-';

      item.innerHTML = `
        <span>${entry.descricao} • ${entry.categoria}</span>
        <strong class="${valorClass}">${prefix} ${currencyFormatter.format(entry.valor)}</strong>
      `;

      historicoEl.appendChild(item);
    });
}

function renderCategoryChart(entries) {
  chartEl.innerHTML = '';

  const expenses = entries.filter((entry) => entry.tipo === 'despesa');
  if (!expenses.length) {
    chartEl.innerHTML = '<p>Adicione despesas para visualizar o gráfico por categoria.</p>';
    return;
  }

  const grouped = expenses.reduce((acc, entry) => {
    acc[entry.categoria] = (acc[entry.categoria] || 0) + entry.valor;
    return acc;
  }, {});

  const maxValue = Math.max(...Object.values(grouped));

  Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .forEach(([categoria, valor]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';

      row.innerHTML = `
        <span>${categoria}</span>
        <div class="bar" style="width: ${(valor / maxValue) * 100}%"></div>
        <strong>${currencyFormatter.format(valor)}</strong>
      `;

      chartEl.appendChild(row);
    });
}

render();
