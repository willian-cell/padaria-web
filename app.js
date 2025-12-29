// =============================
// CONFIG / API
// =============================
const LS_API_KEY = "PADARIA_API_BASE";
let API_BASE = localStorage.getItem(LS_API_KEY) || "";

// Elementos
const elApiBase = document.getElementById("apiBase");
const btnSaveApi = document.getElementById("btnSaveApi");

elApiBase.value = API_BASE;

btnSaveApi.addEventListener("click", () => {
  API_BASE = elApiBase.value.trim().replace(/\/$/, "");
  localStorage.setItem(LS_API_KEY, API_BASE);
  alert("API Base URL salva.");
  bootstrap();
});

function apiUrl(path){
  if(!API_BASE) throw new Error("Defina a API Base URL primeiro.");
  return `${API_BASE}${path}`;
}

async function apiGet(path){
  const r = await fetch(apiUrl(path));
  if(!r.ok) throw new Error(`GET ${path} falhou: ${r.status}`);
  return r.json();
}

async function apiPost(path, body){
  const r = await fetch(apiUrl(path), {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error(`POST ${path} falhou: ${r.status}`);
  return r.json();
}

// =============================
// STATE
// =============================
let produtos = [];
let movimentacoes = [];
let movimentosFiltrados = [];

// =============================
// UTIL
// =============================
function moeda(n){
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
}
function num(n){
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function isoFromDatetimeLocal(v){
  if(!v) return new Date().toISOString();
  // datetime-local vem sem timezone; vamos assumir local
  const d = new Date(v);
  return d.toISOString();
}
function dateOnlyISO(iso){
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function toDatetimeLocalValue(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}
function daysBetweenInclusive(d1, d2){
  const a = new Date(d1);
  const b = new Date(d2);
  a.setHours(0,0,0,0);
  b.setHours(0,0,0,0);
  const diff = Math.round((b - a) / 86400000);
  return diff + 1;
}
function monthsBetweenInclusive(d1, d2){
  const a = new Date(d1);
  const b = new Date(d2);
  const months = (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
  return months + 1;
}

// =============================
// ELEMENTOS: PRODUTOS
// =============================
const p_nome = document.getElementById("p_nome");
const p_categoria = document.getElementById("p_categoria");
const p_unidade = document.getElementById("p_unidade");
const p_custo = document.getElementById("p_custo");
const p_preco = document.getElementById("p_preco");
const p_min = document.getElementById("p_min");
const btnAddProduto = document.getElementById("btnAddProduto");
const btnReload = document.getElementById("btnReload");
const produtosBody = document.getElementById("produtosBody");

// MOV
const m_tipo = document.getElementById("m_tipo");
const m_produto = document.getElementById("m_produto");
const m_qtd = document.getElementById("m_qtd");
const m_valor = document.getElementById("m_valor");
const m_desc = document.getElementById("m_desc");
const m_origem = document.getElementById("m_origem");
const m_datahora = document.getElementById("m_datahora");
const m_obs = document.getElementById("m_obs");
const btnAddMov = document.getElementById("btnAddMov");
const btnAutoValor = document.getElementById("btnAutoValor");

// Filtros
const f_inicio = document.getElementById("f_inicio");
const f_fim = document.getElementById("f_fim");
const f_produto = document.getElementById("f_produto");
const f_tipo = document.getElementById("f_tipo");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");

// Tabela mov
const movBody = document.getElementById("movBody");

// KPI / Estoque
const kpis = document.getElementById("kpis");
const estoqueBody = document.getElementById("estoqueBody");

// Export
const btnExcel = document.getElementById("btnExcel");
const btnPDF = document.getElementById("btnPDF");

// =============================
// BOOTSTRAP
// =============================
async function bootstrap(){
  if(!API_BASE){
    // Não trava a UI, apenas informa
    console.warn("Sem API_BASE ainda.");
    return;
  }
  await loadAll();
  renderProdutos();
  renderProdutosSelect();
  setupDefaults();
  aplicarFiltros();
  renderEstoque();
}

async function loadAll(){
  produtos = await apiGet("/produtos");
  movimentacoes = await apiGet("/movimentacoes?_sort=data_hora&_order=desc");
}

function setupDefaults(){
  m_datahora.value = toDatetimeLocalValue();

  // se filtros vazios, coloca mês atual
  if(!f_inicio.value || !f_fim.value){
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
    f_inicio.value = dateOnlyISO(first.toISOString());
    f_fim.value = dateOnlyISO(last.toISOString());
  }
}

// =============================
// PRODUTOS CRUD (CREATE + LIST)
// =============================
btnAddProduto.addEventListener("click", async () => {
  try{
    const body = {
      nome: (p_nome.value || "").trim(),
      categoria: (p_categoria.value || "").trim(),
      unidade: p_unidade.value,
      custo_unit: num(p_custo.value),
      preco_venda: num(p_preco.value),
      estoque_min: num(p_min.value),
      ativo: true
    };

    if(!body.nome) return alert("Informe o nome do produto.");

    await apiPost("/produtos", body);
    await loadAll();
    renderProdutos();
    renderProdutosSelect();
    renderEstoque();

    p_nome.value = "";
    p_categoria.value = "";
    p_custo.value = "";
    p_preco.value = "";
    p_min.value = "";
    alert("Produto cadastrado.");
  }catch(e){
    console.error(e);
    alert(e.message);
  }
});

btnReload.addEventListener("click", async () => {
  try{
    await loadAll();
    renderProdutos();
    renderProdutosSelect();
    aplicarFiltros();
    renderEstoque();
  }catch(e){
    alert(e.message);
  }
});

function renderProdutos(){
  produtosBody.innerHTML = produtos
    .slice()
    .sort((a,b) => (a.nome || "").localeCompare(b.nome || ""))
    .map(p => `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.categoria || "")}</td>
        <td>${escapeHtml(p.unidade || "")}</td>
        <td>${moeda(p.custo_unit)}</td>
        <td>${moeda(p.preco_venda)}</td>
        <td>${num(p.estoque_min)}</td>
      </tr>
    `).join("");
}

function renderProdutosSelect(){
  const opts = produtos
    .slice()
    .sort((a,b) => (a.nome || "").localeCompare(b.nome || ""))
    .map(p => `<option value="${p.id}">${escapeHtml(p.nome)} (${escapeHtml(p.unidade)})</option>`)
    .join("");
  m_produto.innerHTML = opts || `<option value="">Sem produtos</option>`;
}

// =============================
// MOVIMENTAÇÕES (CREATE)
// =============================
btnAutoValor.addEventListener("click", () => {
  const pid = m_produto.value;
  const p = produtos.find(x => x.id === pid);
  if(!p) return;

  const tipo = m_tipo.value;
  if(tipo === "ENTRADA") m_valor.value = num(p.custo_unit);
  else if(tipo === "SAIDA") m_valor.value = num(p.preco_venda);
  else m_valor.value = num(p.custo_unit);
});

btnAddMov.addEventListener("click", async () => {
  try{
    const pid = m_produto.value;
    const p = produtos.find(x => x.id === pid);
    if(!p) return alert("Selecione um produto.");

    const qtd = num(m_qtd.value);
    if(qtd <= 0) return alert("Quantidade deve ser maior que zero.");

    const body = {
      tipo: m_tipo.value,
      data_hora: isoFromDatetimeLocal(m_datahora.value),
      produto_id: p.id,
      produto_nome_snapshot: p.nome,
      quantidade: qtd,
      valor_unit: num(m_valor.value),
      desconto: num(m_desc.value),
      origem: (m_origem.value || "").trim(),
      observacao: (m_obs.value || "").trim()
    };

    if(body.valor_unit <= 0) return alert("Valor unitário deve ser maior que zero.");

    // (opcional) valida saída > estoque
    if(body.tipo === "SAIDA" || body.tipo === "PERDA"){
      const est = calcularEstoqueAtual()[p.id] || 0;
      if(qtd > est){
        const ok = confirm(`Estoque atual de "${p.nome}" é ${est}. Deseja registrar mesmo assim?`);
        if(!ok) return;
      }
    }

    await apiPost("/movimentacoes", body);
    await loadAll();
    aplicarFiltros();
    renderEstoque();

    // reset parcial
    m_qtd.value = "";
    m_desc.value = "0";
    m_origem.value = "";
    m_obs.value = "";
    m_datahora.value = toDatetimeLocalValue();

    alert("Movimentação registrada.");
  }catch(e){
    console.error(e);
    alert(e.message);
  }
});

// =============================
// FILTROS + KPI + TABELA
// =============================
btnAplicarFiltros.addEventListener("click", aplicarFiltros);

function aplicarFiltros(){
  const inicio = f_inicio.value ? new Date(f_inicio.value + "T00:00:00") : null;
  const fim = f_fim.value ? new Date(f_fim.value + "T23:59:59") : null;
  const termo = (f_produto.value || "").trim().toLowerCase();
  const tipo = f_tipo.value;

  movimentosFiltrados = movimentacoes.filter(m => {
    const d = new Date(m.data_hora);

    if(inicio && d < inicio) return false;
    if(fim && d > fim) return false;
    if(tipo && m.tipo !== tipo) return false;

    const nome = (m.produto_nome_snapshot || "").toLowerCase();
    if(termo && !nome.includes(termo)) return false;

    return true;
  });

  renderMovTable();
  renderKPIs();
}

function totalMov(m){
  const t = num(m.quantidade) * num(m.valor_unit) - num(m.desconto);
  return t;
}

function renderMovTable(){
  movBody.innerHTML = movimentosFiltrados
    .slice()
    .sort((a,b) => new Date(b.data_hora) - new Date(a.data_hora))
    .map(m => `
      <tr>
        <td>${fmtDateTime(m.data_hora)}</td>
        <td>${escapeHtml(m.tipo)}</td>
        <td>${escapeHtml(m.produto_nome_snapshot || "")}</td>
        <td>${num(m.quantidade)}</td>
        <td>${moeda(m.valor_unit)}</td>
        <td>${moeda(m.desconto)}</td>
        <td>${moeda(totalMov(m))}</td>
        <td>${escapeHtml(m.origem || "")}</td>
      </tr>
    `).join("");
}

function renderKPIs(){
  const inicio = f_inicio.value || dateOnlyISO(new Date().toISOString());
  const fim = f_fim.value || dateOnlyISO(new Date().toISOString());

  const entradas = movimentosFiltrados.filter(x => x.tipo === "ENTRADA" || x.tipo === "AJUSTE");
  const saidas = movimentosFiltrados.filter(x => x.tipo === "SAIDA");
  const perdas = movimentosFiltrados.filter(x => x.tipo === "PERDA");

  const totalEntradas = entradas.reduce((s,m) => s + totalMov(m), 0);
  const totalSaidas = saidas.reduce((s,m) => s + totalMov(m), 0);
  const totalPerdas = perdas.reduce((s,m) => s + totalMov(m), 0);

  const dias = daysBetweenInclusive(inicio, fim);
  const meses = monthsBetweenInclusive(inicio, fim);

  const mediaDia = totalSaidas / Math.max(1, dias);
  const mediaMes = totalSaidas / Math.max(1, meses);

  const qtdMov = movimentosFiltrados.length;

  kpis.innerHTML = `
    <div class="kpi"><div class="t">Período</div><div class="v">${inicio} → ${fim}</div></div>
    <div class="kpi"><div class="t">Entradas (R$)</div><div class="v">${moeda(totalEntradas)}</div></div>
    <div class="kpi"><div class="t">Saídas (R$)</div><div class="v">${moeda(totalSaidas)}</div></div>
    <div class="kpi"><div class="t">Média/dia (R$)</div><div class="v">${moeda(mediaDia)}</div></div>
    <div class="kpi"><div class="t">Média/mês (R$)</div><div class="v">${moeda(mediaMes)}</div></div>
    <div class="kpi"><div class="t">Perdas (R$)</div><div class="v">${moeda(totalPerdas)}</div></div>
    <div class="kpi"><div class="t">Registros</div><div class="v">${qtdMov}</div></div>
  `;
}

// =============================
// ESTOQUE (CALCULADO)
// =============================
function calcularEstoqueAtual(){
  // Retorna dict { produto_id: estoque }
  const stock = {};
  for(const p of produtos) stock[p.id] = 0;

  for(const m of movimentacoes){
    const pid = m.produto_id;
    if(!(pid in stock)) stock[pid] = 0;

    const q = num(m.quantidade);
    if(m.tipo === "ENTRADA" || m.tipo === "AJUSTE") stock[pid] += q;
    if(m.tipo === "SAIDA" || m.tipo === "PERDA") stock[pid] -= q;
  }
  return stock;
}

function renderEstoque(){
  const stock = calcularEstoqueAtual();

  const rows = produtos
    .slice()
    .sort((a,b) => (a.nome||"").localeCompare(b.nome||""))
    .map(p => {
      const est = num(stock[p.id]);
      const min = num(p.estoque_min);
      const baixo = est <= min;
      const status = baixo ? "BAIXO" : "OK";
      return `
        <tr>
          <td>${escapeHtml(p.nome)}</td>
          <td>${escapeHtml(p.categoria || "")}</td>
          <td>${escapeHtml(p.unidade || "")}</td>
          <td>${est}</td>
          <td>${min}</td>
          <td>${baixo ? `<span style="color:#fca5a5;">${status}</span>` : `<span style="color:#86efac;">${status}</span>`}</td>
        </tr>
      `;
    });

  estoqueBody.innerHTML = rows.join("");
}

// =============================
// EXPORT EXCEL
// =============================
btnExcel.addEventListener("click", () => {
  try{
    const wb = XLSX.utils.book_new();

    // Aba 1: Movimentações filtradas
    const mov = movimentosFiltrados.map(m => ({
      data_hora: fmtDateTime(m.data_hora),
      tipo: m.tipo,
      produto: m.produto_nome_snapshot,
      quantidade: num(m.quantidade),
      valor_unit: num(m.valor_unit),
      desconto: num(m.desconto),
      total: totalMov(m),
      origem: m.origem || "",
      observacao: m.observacao || ""
    }));
    const ws1 = XLSX.utils.json_to_sheet(mov);
    XLSX.utils.book_append_sheet(wb, ws1, "Movimentacoes");

    // Aba 2: Estoque
    const stock = calcularEstoqueAtual();
    const est = produtos.map(p => ({
      produto: p.nome,
      categoria: p.categoria || "",
      unidade: p.unidade || "",
      estoque: num(stock[p.id]),
      estoque_min: num(p.estoque_min)
    }));
    const ws2 = XLSX.utils.json_to_sheet(est);
    XLSX.utils.book_append_sheet(wb, ws2, "Estoque");

    // Aba 3: Resumo
    const resumo = buildResumo();
    const ws3 = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, ws3, "Resumo");

    const nome = `padaria_${(f_inicio.value||"ini")}_a_${(f_fim.value||"fim")}.xlsx`;
    XLSX.writeFile(wb, nome);
  }catch(e){
    alert(e.message);
  }
});

function buildResumo(){
  // Gera um array com linhas de resumo (boa para Excel)
  const inicio = f_inicio.value || dateOnlyISO(new Date().toISOString());
  const fim = f_fim.value || dateOnlyISO(new Date().toISOString());

  const entradas = movimentosFiltrados.filter(x => x.tipo === "ENTRADA" || x.tipo === "AJUSTE");
  const saidas = movimentosFiltrados.filter(x => x.tipo === "SAIDA");
  const perdas = movimentosFiltrados.filter(x => x.tipo === "PERDA");

  const totalEntradas = entradas.reduce((s,m) => s + totalMov(m), 0);
  const totalSaidas = saidas.reduce((s,m) => s + totalMov(m), 0);
  const totalPerdas = perdas.reduce((s,m) => s + totalMov(m), 0);

  const dias = daysBetweenInclusive(inicio, fim);
  const meses = monthsBetweenInclusive(inicio, fim);

  return [
    { chave: "Periodo", valor: `${inicio} -> ${fim}` },
    { chave: "Entradas (R$)", valor: totalEntradas },
    { chave: "Saidas (R$)", valor: totalSaidas },
    { chave: "Perdas (R$)", valor: totalPerdas },
    { chave: "Media por dia (R$)", valor: totalSaidas / Math.max(1,dias) },
    { chave: "Media por mes (R$)", valor: totalSaidas / Math.max(1,meses) },
    { chave: "Registros", valor: movimentosFiltrados.length }
  ];
}

// =============================
// EXPORT PDF
// =============================
btnPDF.addEventListener("click", () => {
  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p","pt","a4");

    const inicio = f_inicio.value || "";
    const fim = f_fim.value || "";

    doc.setFontSize(14);
    doc.text("Relatório Contábil - Padaria", 40, 40);

    doc.setFontSize(10);
    doc.text(`Período: ${inicio} a ${fim}`, 40, 60);

    const resumo = buildResumo();
    let y = 85;
    doc.setFontSize(10);
    for(const r of resumo){
      doc.text(`${r.chave}: ${typeof r.valor === "number" ? moeda(r.valor) : String(r.valor)}`, 40, y);
      y += 14;
    }

    const head = [["Data/Hora","Tipo","Produto","Qtd","V.Unit","Desc","Total","Origem"]];
    const body = movimentosFiltrados
      .slice()
      .sort((a,b) => new Date(a.data_hora) - new Date(b.data_hora))
      .map(m => [
        fmtDateTime(m.data_hora),
        m.tipo,
        m.produto_nome_snapshot || "",
        String(num(m.quantidade)),
        moeda(m.valor_unit),
        moeda(m.desconto),
        moeda(totalMov(m)),
        m.origem || ""
      ]);

    doc.autoTable({
      startY: y + 10,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] } // azul escuro
    });

    const nome = `relatorio_padaria_${(inicio||"ini")}_a_${(fim||"fim")}.pdf`;
    doc.save(nome);
  }catch(e){
    alert(e.message);
  }
});

// =============================
// HELPERS
// =============================
function fmtDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleString("pt-BR");
}

function escapeHtml(str){
  return String(str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Inicia
bootstrap();
