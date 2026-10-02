const SUPABASE_URL = "https://qhqrnnkuhsaszonippnj.supabase.co";
const SUPABASE_KEY = "sb_publishable_aGjT0aecqNHf96Tm7QLMtw_qjCKs5n3";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let modoEvolucionFuerza = "dia";

Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels = {
  color: "#156082",
  font: { family: "Inter", size: 10, weight: "600" },
  anchor: "end", align: "end", offset: 2, clamp: true,
};

let fuerza = [];
let semanal = [];
let charts = {};
let seccionActual = "fuerza";

const COLORS = {
  primary: "#3A82C8", primaryLight: "#A6CAEC", primaryDark: "#156082",
  green: "#397940", orange: "#F26F2B", textDim: "#5A7A8F",
};
const PALETTE_DONUT = [COLORS.primary, COLORS.primaryLight, COLORS.primaryDark, COLORS.green, COLORS.orange];
const DIAS_ALERTA = 30;

document.getElementById("fechaActual1").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
document.getElementById("fechaActual2").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
document.getElementById("fechaActual3").textContent = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

// ============ HELPERS ============
function col(data, clave) {
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]);
  return keys.find(k => k.trim().toLowerCase() === clave.trim().toLowerCase());
}
function norm(v) { return v !== undefined && v !== null ? v.toString().trim() : ""; }
function num(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[^0-9.-]/g, "")) || 0;
}
function tooltipStyle() {
  return { backgroundColor: "#156082", titleColor: "#FFFFFF", bodyColor: "#FFFFFF", borderColor: "#3A82C8", borderWidth: 1, padding: 12, cornerRadius: 8 };
}

// ============ CARGA ============
async function cargarHoja(nombre) {
  const TAMANO = 1000;
  let todos = [], desde = 0, seguir = true;
  while (seguir) {
    const { data, error } = await supabaseClient
      .from("dashboard_data")
      .select("row_index, data")
      .eq("sheet_name", nombre)
      .order("row_index", { ascending: true })
      .range(desde, desde + TAMANO - 1);
    if (error) throw error;
    if (data.length === 0) seguir = false;
    else {
      todos = todos.concat(data);
      desde += TAMANO;
      if (data.length < TAMANO) seguir = false;
    }
  }
  return todos.map(r => r.data);
}

// ============ RENDERIZADORES ============
function renderBar(id, labels, data, color) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color || COLORS.primary, borderRadius: 6, borderSkipped: false, maxBarThickness: 80, categoryPercentage: 0.7, barPercentage: 0.9 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle(),
        datalabels: { anchor: "end", align: "top", formatter: (v) => Number(v).toLocaleString("es-PE") } },
      scales: {
        x: { ticks: { color: COLORS.textDim, font: { family: "Inter", size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(214, 228, 240, 0.5)" }, suggestedMax: Math.max(...data) * 1.15 }
      }
    }
  });
}
function renderHBar(id, labels, data, color) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  const wrap = ctx.parentElement;
  const muchas = labels.length > 12;
  if (muchas) {
    wrap.style.maxHeight = "500px"; wrap.style.overflowY = "auto";
    ctx.style.height = labels.length * 36 + "px"; ctx.style.maxHeight = "none";
  }
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color || COLORS.primary, borderRadius: 6, borderSkipped: false }] },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipStyle(),
        datalabels: { anchor: "end", align: "right", formatter: (v) => Number(v).toLocaleString("es-PE") } },
      scales: {
        x: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(214, 228, 240, 0.5)" } },
        y: { ticks: { color: COLORS.primaryDark, font: { family: "Inter", size: 10 } }, grid: { display: false } }
      }
    }
  });
}
function renderDoughnut(id, labels, data) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: PALETTE_DONUT.slice(0, labels.length), borderColor: "#FFFFFF", borderWidth: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      animation: { duration: 1000, easing: "easeOutQuart" },
      plugins: {
        legend: { position: "bottom", labels: { color: COLORS.textDim, font: { family: "Inter", size: 11 }, padding: 12, usePointStyle: true, boxWidth: 8 } },
        tooltip: tooltipStyle(),
        datalabels: { color: "#FFFFFF", anchor: "center", align: "center",
          formatter: (v, ctx) => { const t = ctx.dataset.data.reduce((a, b) => a + Number(b), 0); const p = t > 0 ? (Number(v) / t) * 100 : 0; return p >= 4 ? v : ""; } }
      }
    }
  });
}



function renderLine(id, labels, datasets) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: COLORS.textDim, font: { family: "Inter", size: 11 }, usePointStyle: true, boxWidth: 8 } },
        tooltip: tooltipStyle(), datalabels: {
          display: true, align: "top", anchor: "end", offset: 4,
          color: "#156082", font: { family: "Inter", size: 10, weight: "600" },
          formatter: (v) => Number(v).toLocaleString("es-PE")
        } },
      scales: {
        x: { ticks: { color: COLORS.textDim, font: { family: "Inter", size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(214, 228, 240, 0.5)" } }
      }
    }
  });
}

// ============ UI ============
function crearKPI(icono, clase, titulo, valor, sub) {
  return `<div class="kpi-card"><div class="kpi-icon-circle ${clase}"><i class="fas ${icono}"></i></div>
    <div class="kpi-content"><span class="kpi-title">${titulo}</span><span class="kpi-main">${valor}</span><span class="kpi-trend">${sub}</span></div></div>`;
}
function crearChart(id, icono, titulo, full = false) {
  return `<div class="chart-exec-card ${full ? "chart-full" : ""}"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><canvas id="${id}"></canvas></div>`;
}
function crearChartDonut(id, icono, titulo) {
  return `<div class="chart-exec-card"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><div class="chart-doughnut-wrapper"><canvas id="${id}"></canvas></div></div>`;
}
function crearChartTabla(icono, titulo, id) {
  return `<div class="chart-exec-card"><div class="chart-exec-header"><i class="fas ${icono} chart-icon"></i><h3>${titulo}</h3></div><div id="${id}" class="mini-table"></div></div>`;
}
function agruparYRender(data, id, columna, tipo, color) {
  if (!columna) return;
  const conteo = {};
  data.forEach(f => {
    const v = norm(f[columna]) || "Sin dato";
    conteo[v] = (conteo[v] || 0) + 1;
  });
  const entries = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0]);
  const valores = entries.map(e => e[1]);

  const ctx = document.getElementById(id);
  if (!ctx) return;

  // Si el chart ya existe → solo actualizar data y animar
  if (charts[id]) {
    charts[id].data.labels = labels;
    charts[id].data.datasets[0].data = valores;
    charts[id].update();
    return;
  }

  // Si no existe → crearlo
  if (tipo === "bar") renderBar(id, labels, valores, color);
  else if (tipo === "hbar") renderHBar(id, labels, valores, color);
  else renderDoughnut(id, labels, valores);
}
function llenarSelect(id, data, columna) {
  const select = document.getElementById(id);
  if (!select || !columna) return;

  const labelInicial = select.dataset.label || select.options[0]?.text || "Opción";
  select.dataset.label = labelInicial;

  const valorActual = select.value;

  const valores = [...new Set(data.map(f => norm(f[columna])).filter(v => v !== ""))];
  select.innerHTML = `<option value="">${labelInicial}</option>`;
  valores.sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    select.appendChild(opt);
  });

  if (valorActual && valores.includes(valorActual)) {
    select.value = valorActual;
  }
}
function marcarSegmentadorActivo(select) {
  if (!select) return;
  if (select.value) select.classList.add("activo");
  else select.classList.remove("activo");
}
function cambiarModoEvolucion(valor) {
  modoEvolucionFuerza = valor;
  document.activeElement?.blur();
  const scrollY = window.scrollY;
  renderEvolucionFuerza();
  requestAnimationFrame(() => { window.scrollTo({ top: scrollY, behavior: "instant" }); });
}

// ============ FUERZA LABORAL ============
function renderFuerza() {
  const data = fuerza;
  const cUbicacion = col(data, "Ubicación Trabajo") || col(data, "Ubicacion Trabajo");
  const cDias = col(data, "Dias Acumulado") || col(data, "Dias");
  const cRegimen = col(data, "Regimen");
  const cEmpresa = col(data, "Empresa");
  const cTipo = col(data, "Tipo Empleado");
  const cCond = col(data, "Condicion");
  const cCC = col(data, "Centro Costo");
  const cProc = col(data, "Procedencia");
  const cCargo = col(data, "Cargo/Puesto Inmac") || col(data, "Cargo/Puesto Volcan");

  // Destruir charts previos para que animen al recrear
  ["fEmpresa","fTipo","fCond","fRegimen","fCC","fProc","fCargo","fEvolucion"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  });

  let activos = 0, descanso = 0, totalDias = 0, alertas = 0;
  data.forEach(f => {
    const ubic = norm(f[cUbicacion]).toUpperCase();
    if (ubic === "DESCANSO") descanso++; else activos++;
    const d = num(f[cDias]);
    totalDias += d;
    if (d > DIAS_ALERTA) alertas++;
  });
  const promDias = data.length > 0 ? (totalDias / data.length).toFixed(1) : 0;

  document.getElementById("kpiFuerza").innerHTML = `
    ${crearKPI("fa-users", "", "Total Personal", data.length, "En obra")}
    ${crearKPI("fa-user-check", "icon-green", "Activos", activos, "Trabajando")}
    ${crearKPI("fa-user-clock", "icon-orange", "Descanso", descanso, "Fuera de obra")}
    ${crearKPI("fa-calendar-day", "icon-cyan", "Días Promedio", promDias, "Acumulado")}
    ${crearKPI("fa-exclamation-triangle", "icon-orange", "Alerta Permanencia", alertas, `> ${DIAS_ALERTA} días`)}
  `;

  document.getElementById("chartsFuerza").innerHTML = `
  <div style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
    ${crearChartDonut("fTipo", "fa-user-tag", "Personal por Tipo de Empleado")}
    ${crearChartDonut("fCond", "fa-user-cog", "Personal por Condición")}
    ${crearChartDonut("fRegimen", "fa-id-badge", "Personal por Régimen")}
  </div>
  ${crearChart("fEmpresa", "fa-building", "Personal por Empresa")}
  ${crearChartTabla("fa-table", "Resumen por Cargo", "tablaResumenFuerza")}
  ${crearChart("fCC", "fa-project-diagram", "Personal por Centro de Costo")}
  ${crearChart("fProc", "fa-map-marker-alt", "Personal por Procedencia")}
  ${crearChart("fCargo", "fa-briefcase", "Top 10 Personal por Cargo", true)}
  <div class="chart-exec-card chart-full">
    <div class="chart-exec-header">
      <i class="fas fa-calendar chart-icon"></i>
      <h3>Evolución de Ingresos por Fecha</h3>
      <select id="fEvolucionModo" class="filter-select" style="margin-left:auto; min-width:120px;" onchange="cambiarModoEvolucion(this.value)">
        <option value="dia">Por Día</option>
        <option value="mes">Por Mes</option>
      </select>
    </div>
    <canvas id="fEvolucion"></canvas>
  </div>
  `;

  // Charts principales dentro de RAF (para que animen)
  requestAnimationFrame(() => {
    agruparYRender(data, "fEmpresa", cEmpresa, "bar", COLORS.primary);
    agruparYRender(data, "fTipo", cTipo, "doughnut");
    agruparYRender(data, "fCond", cCond, "doughnut");
    agruparYRender(data, "fRegimen", cRegimen, "doughnut");
    agruparYRender(data, "fCC", cCC, "hbar", COLORS.primary);
    agruparYRender(data, "fProc", cProc, "hbar", COLORS.green);
  });

  // fCargo y fEvolucion van FUERA del RAF
  const porCargo = {};
  data.forEach(f => {
    const c = norm(f[cCargo]) || "Sin cargo";
    porCargo[c] = (porCargo[c] || 0) + 1;
  });
  const cargosArr = Object.entries(porCargo).sort((a, b) => b[1] - a[1]).slice(0, 10);
  renderHBar("fCargo", cargosArr.map(c => c[0].substring(0, 35)), cargosArr.map(c => c[1]), COLORS.orange);

  renderEvolucionFuerza();

  llenarSelect("filterRegimenF", data, cRegimen);
  llenarSelect("filterTipoF", data, cTipo);
  llenarSelect("filterEmpresaF", data, cEmpresa);
  llenarSelect("filterCondF", data, cCond);
  llenarSelect("filterCCF", data, cCC);

  ["filterRegimenF","filterTipoF","filterEmpresaF","filterCondF","filterCCF"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) {
      if (!sel.dataset.listener) {
        sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosFuerza(); });
        sel.dataset.listener = "1";
      }
      marcarSegmentadorActivo(sel);
    }
  });

  const conteoCargo = {};
  data.forEach(f => {
    const c = norm(f[cCargo]) || "Sin cargo";
    conteoCargo[c] = (conteoCargo[c] || 0) + 1;
  });
  const arrCargo = Object.entries(conteoCargo).sort((a, b) => b[1] - a[1]).slice(0, 8);
  let htmlResumen = "<table><thead><tr><th>Cargo</th><th>Personas</th><th>%</th></tr></thead><tbody>";
  arrCargo.forEach(([cargo, cant]) => {
    const pct = data.length > 0 ? ((cant / data.length) * 100).toFixed(1) : 0;
    htmlResumen += `<tr><td>${cargo.substring(0, 35)}</td><td>${cant}</td><td>${pct}%</td></tr>`;
  });
  htmlResumen += "</tbody></table>";
  document.getElementById("tablaResumenFuerza").innerHTML = htmlResumen;
}

function renderEvolucionFuerza() {
  const data = fuerza;
  const cFechaIng = col(data, "Fecha Ingreso");
  if (!cFechaIng) return;
  const modo = modoEvolucionFuerza;

  const porFecha = {};
  data.forEach(f => {
    const raw = norm(f[cFechaIng]);
    if (!raw) return;
    let fecha = null;
    if (raw.includes("/")) {
      const p = raw.split("/");
      let mes = parseInt(p[0]), dia = parseInt(p[1]), anio = p[2];
      if (anio.length === 2) anio = "20" + anio;
      fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    } else if (raw.includes("-")) {
      fecha = raw.split(" ")[0];
    } else if (!isNaN(Number(raw))) {
      const serial = Number(raw);
      const ms = (serial - 25569) * 86400 * 1000;
      const d = new Date(ms);
      fecha = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }
    if (!fecha) return;
    let key = fecha;
    if (modo === "mes") key = fecha.substring(0, 7);
    porFecha[key] = (porFecha[key] || 0) + 1;
  });

  const keys = Object.keys(porFecha).sort();
  const mesesAbrev = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"];
  const labels = keys.map(k => {
    if (modo === "mes") { const [anio, mes] = k.split("-"); return mesesAbrev[parseInt(mes) - 1] + " " + anio; }
    else { const [, mes, dia] = k.split("-"); return dia + " " + mesesAbrev[parseInt(mes) - 1]; }
  });
  const datos = keys.map(k => porFecha[k]);

  const ctx = document.getElementById("fEvolucion");
  if (!ctx) return;
  if (charts["fEvolucion"]) charts["fEvolucion"].destroy();
  charts["fEvolucion"] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Ingresos", data: datos, borderColor: COLORS.primary, backgroundColor: "rgba(58, 130, 200, 0.1)", borderWidth: 3, tension: 0.4, pointRadius: 5, fill: true }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      plugins: { legend: { display: false }, tooltip: tooltipStyle(),
        datalabels: { display: true, align: "top", anchor: "end", offset: 4, color: "#156082", font: { family: "Inter", size: 10, weight: "600" }, formatter: (v) => Number(v).toLocaleString("es-PE") } },
      scales: {
        x: { ticks: { color: COLORS.textDim, font: { family: "Inter", size: 10 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: COLORS.textDim }, grid: { color: "rgba(214, 228, 240, 0.5)" } }
      }
    }
  });
  const sel = document.getElementById("fEvolucionModo");
  if (sel) sel.value = modoEvolucionFuerza;
}

function aplicarFiltrosFuerza() {
  const regimen = document.getElementById("filterRegimenF").value;
  const tipo = document.getElementById("filterTipoF").value;
  const empresa = document.getElementById("filterEmpresaF").value;
  const cond = document.getElementById("filterCondF").value;
  const cc = document.getElementById("filterCCF").value;

  const cRegimen = col(fuerza, "Regimen");
  const cTipo = col(fuerza, "Tipo Empleado");
  const cEmpresa = col(fuerza, "Empresa");
  const cCond = col(fuerza, "Condicion");
  const cCC = col(fuerza, "Centro Costo");

  const filtrado = fuerza.filter(f => {
    if (regimen && norm(f[cRegimen]) !== regimen) return false;
    if (tipo && norm(f[cTipo]) !== tipo) return false;
    if (empresa && norm(f[cEmpresa]) !== empresa) return false;
    if (cond && norm(f[cCond]) !== cond) return false;
    if (cc && norm(f[cCC]) !== cc) return false;
    return true;
  });

  const backup = fuerza;
  fuerza = filtrado;
  renderFuerza();
  fuerza = backup;
}

// ============ REPORTE SEMANAL ============
function renderSemanal() {
  const data = semanal;
  const cSemana = col(data, "Semana");
  const cMes = col(data, "Mes");
  const cGenero = col(data, "Género");
  const cSituacion = col(data, "Situacion Semanal") || col(data, "Situación Semanal");
  const cEmpresa = col(data, "Tipo Empresa") || col(data, "Empresa");
  const cGerencia = col(data, "Gerencia");
  const cAutLiq = col(data, "AutLiq");

  const total = data.length;
  const generos = new Set(data.map(f => norm(f[cGenero])).filter(v => v));
  const gerencias = new Set(data.map(f => norm(f[cGerencia])).filter(v => v));
  const conAutLiq = data.filter(f => {
    const v = norm(f[cAutLiq]).toUpperCase();
    return v === "SI" || v === "SÍ" || v === "1";
  }).length;

  document.getElementById("kpiSemanal").innerHTML = `
    ${crearKPI("fa-users", "", "Total Registros", total, "Reporte semanal")}
    ${crearKPI("fa-calendar-week", "icon-cyan", "Semanas", new Set(data.map(f => norm(f[cSemana])).filter(v => v)).size, "Únicas")}
    ${crearKPI("fa-venus-mars", "icon-green", "Géneros", generos.size, "Distintos")}
    ${crearKPI("fa-sitemap", "icon-orange", "Gerencias", gerencias.size, "Áreas")}
    ${crearKPI("fa-file-signature", "icon-cyan", "Con AutLiq", conAutLiq, "Registros")}
  `;

  // Construir HTML de charts SOLO la primera vez
  if (!document.getElementById("sGenero")) {
    document.getElementById("chartsSemanal").innerHTML = `
      <div class="chart-exec-card chart-full">
        <div class="chart-exec-header">
          <i class="fas fa-calendar-week chart-icon"></i>
          <h3>Trabajadores por Semana</h3>
        </div>
        <canvas id="sSemana"></canvas>
      </div>
      ${crearChartDonut("sGenero", "fa-venus-mars", "Trabajadores por Género")}
      ${crearChartDonut("sSituacion", "fa-user-clock", "Trabajadores por Situación Semanal")}
      ${crearChartDonut("sEmpresa", "fa-building", "Trabajadores por Tipo de Empresa")}
      ${crearChartDonut("sAutLiq", "fa-file-signature", "Trabajadores con AutLiq")}
      <div style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        ${crearChartTabla("fa-table", "Resumen por Gerencia", "tablaResumenSemanal")}
        ${crearChart("sGerencia", "fa-sitemap", "Trabajadores por Gerencia")}
      </div>
    `;

    llenarSelect("filterSemanaS", semanal, cSemana);
    llenarSelect("filterMesS", semanal, cMes);
    llenarSelect("filterGeneroS", semanal, cGenero);
    llenarSelect("filterSituacionS", semanal, cSituacion);
    llenarSelect("filterGerenciaS", semanal, cGerencia);

    ["filterSemanaS","filterMesS","filterGeneroS","filterSituacionS","filterGerenciaS"].forEach(id => {
      const sel = document.getElementById(id);
      if (sel && !sel.dataset.listener) {
        sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosSemanal(); });
        sel.dataset.listener = "1";
      }
    });
  }

  // Actualizar SOLO data de los charts (sin destruir canvas → animación fluida)
  agruparYRender(data, "sGenero", cGenero, "doughnut");
  agruparYRender(data, "sSituacion", cSituacion, "doughnut");
  agruparYRender(data, "sEmpresa", cEmpresa, "doughnut");
  agruparYRender(data, "sGerencia", cGerencia, "hbar", COLORS.primaryDark);

  // AutLiq: si el chart ya existe, actualizar; si no, crear
  const porAutLiq = { SI: 0, NO: 0 };
  data.forEach(f => {
    const v = norm(f[cAutLiq]).toUpperCase();
    if (v === "SI" || v === "SÍ" || v === "1") porAutLiq.SI++;
    else porAutLiq.NO++;
  });
  if (charts["sAutLiq"]) {
    charts["sAutLiq"].data.labels = ["Sí", "No"];
    charts["sAutLiq"].data.datasets[0].data = [porAutLiq.SI, porAutLiq.NO];
    charts["sAutLiq"].update();
  } else {
    renderDoughnut("sAutLiq", ["Sí", "No"], [porAutLiq.SI, porAutLiq.NO]);
  }

  // Semana: si el chart ya existe, actualizar; si no, crear
  const porSemana = {};
  data.forEach(f => {
    const s = norm(f[cSemana]) || "Sin semana";
    porSemana[s] = (porSemana[s] || 0) + 1;
  });
  const semanasArr = Object.keys(porSemana).sort();
  const datosSemana = semanasArr.map(s => porSemana[s]);

  if (charts["sSemana"]) {
    charts["sSemana"].data.labels = semanasArr;
    charts["sSemana"].data.datasets[0].data = datosSemana;
    charts["sSemana"].update();
  } else {
    renderLine("sSemana", semanasArr, [{
      label: "Trabajadores",
      data: datosSemana,
      borderColor: COLORS.primary,
      backgroundColor: "rgba(58, 130, 200, 0.1)",
      borderWidth: 3, tension: 0.4, pointRadius: 5, fill: true
    }]);
  }

  // Tabla resumen por gerencia
  const conteoGer = {};
  data.forEach(f => {
    const g = norm(f[cGerencia]) || "Sin gerencia";
    conteoGer[g] = (conteoGer[g] || 0) + 1;
  });
  const arrGer = Object.entries(conteoGer).sort((a, b) => b[1] - a[1]).slice(0, 8);
  let htmlResumen = "<table><thead><tr><th>Gerencia</th><th>Personas</th><th>%</th></tr></thead><tbody>";
  arrGer.forEach(([g, cant]) => {
    const pct = data.length > 0 ? ((cant / data.length) * 100).toFixed(1) : 0;
    htmlResumen += `<tr><td>${g.substring(0, 35)}</td><td>${cant}</td><td>${pct}%</td></tr>`;
  });
  htmlResumen += "</tbody></table>";
  document.getElementById("tablaResumenSemanal").innerHTML = htmlResumen;

  ["filterSemanaS","filterMesS","filterGeneroS","filterSituacionS","filterGerenciaS"].forEach(id => {
    marcarSegmentadorActivo(document.getElementById(id));
  });
}

function aplicarFiltrosSemanal() {
  const semana = document.getElementById("filterSemanaS")?.value || "";
  const mes = document.getElementById("filterMesS")?.value || "";
  const genero = document.getElementById("filterGeneroS")?.value || "";
  const situacion = document.getElementById("filterSituacionS")?.value || "";
  const gerencia = document.getElementById("filterGerenciaS")?.value || "";

  const cSemana = col(semanal, "Semana");
  const cMes = col(semanal, "Mes");
  const cGenero = col(semanal, "Género");
  const cSituacion = col(semanal, "Situacion Semanal") || col(semanal, "Situación Semanal");
  const cGerencia = col(semanal, "Gerencia");

  const filtrado = semanal.filter(f => {
    if (semana && norm(f[cSemana]) !== semana) return false;
    if (mes && norm(f[cMes]) !== mes) return false;
    if (genero && norm(f[cGenero]) !== genero) return false;
    if (situacion && norm(f[cSituacion]) !== situacion) return false;
    if (gerencia && norm(f[cGerencia]) !== gerencia) return false;
    return true;
  });

  const backup = semanal;
  semanal = filtrado;
  renderSemanal();
  semanal = backup;
}

// ============ RESIDENCIA ============
function clasificarProcedencia(valor) {
  const v = norm(valor).toUpperCase();
  if (!v) return "Sin dato";
  // Extranjero: cualquier valor que no sea departamento peruano típico
  const peru = ["LIMA","JUNIN","PASCO","CAJAMARCA","HUANCAYO","LAMBAYEQUE","PIURA","UCAYALI","AREQUIPA","CUSCO","PUNO","TACNA","MOQUEGUA","ANCASH","HUANUCO","AYACUCHO","APURIMAC","AMAZONAS","LORETO","SAN MARTIN","TUMBES","LA LIBERTAD","ICA","MADRE DE DIOS","CALLAO"];
  const esPeru = peru.some(p => v.includes(p));
  if (!esPeru && v.length > 0) return "Extranjero";
  if (v === "LIMA") return "Local";
  return "Foráneo";
}
function clasificarRegimenObra(valor) {
  const v = norm(valor).toUpperCase();
  if (!v) return "Sin dato";
  if (v.includes("PROYECTO")) return "Proyecto";
  if (v.includes("OPERACION")) return "Operaciones";
  return v;
}

function renderResidencia() {
  const data = fuerza;
  const cStatus = col(data, "Status");
  const cObs = col(data, "Observaciones");
  const cEmpresa = col(data, "Empresa");
  const cProc = col(data, "Procedencia");
  const cNombre = col(data, "Apellidos y Nombres");

  let local = 0, foraneo = 0, extranjero = 0, proyecto = 0, operaciones = 0;
  data.forEach(f => {
    const st = norm(f[cStatus]).toUpperCase();
    if (st === "LOCAL") local++;
    else if (st === "FORÁNEO" || st === "FORANEO") foraneo++;
    else if (st === "EXTRANJERO") extranjero++;

    const ob = norm(f[cObs]).toUpperCase();
    if (ob === "PROYECTO" || ob === "PROYECTOS") proyecto++;
    else if (ob === "OPERACIONES" || ob === "OPERACIÓN" || ob === "OPERACION") operaciones++;
  });

  document.getElementById("kpiResidencia").innerHTML = `
    ${crearKPI("fa-house-user", "", "Total de Local", local, "Status Local")}
    ${crearKPI("fa-plane", "icon-cyan", "Foráneo", foraneo, "Status Foráneo")}
    ${crearKPI("fa-globe", "icon-green", "Extranjero", extranjero, "Status Extranjero")}
    ${crearKPI("fa-diagram-project", "icon-orange", "Proyectos", proyecto, "Observaciones")}
    ${crearKPI("fa-gears", "icon-cyan", "Operaciones", operaciones, "Observaciones")}
  `;

  // Solo construir el HTML de charts UNA vez
  if (!document.getElementById("rStatus")) {
    document.getElementById("chartsResidencia").innerHTML = `
      ${crearChartDonut("rStatus", "fa-toggle-on", "Personal por Status")}
      ${crearChartDonut("rObs", "fa-comment-dots", "Personal por Observaciones")}
      <div class="chart-exec-card chart-full-table">
        <div class="chart-exec-header"><i class="fas fa-list chart-icon"></i><h3>Detalle de Personal</h3></div>
        <div id="tablaDetalleResidencia"></div>
      </div>
    `;

    llenarSelect("filterStatusR", fuerza, cStatus);
    llenarSelect("filterObsR", fuerza, cObs);
    llenarSelect("filterEmpresaR", fuerza, cEmpresa);

    ["filterStatusR","filterObsR","filterEmpresaR"].forEach(id => {
      const sel = document.getElementById(id);
      if (sel && !sel.dataset.listener) {
        sel.addEventListener("change", () => { marcarSegmentadorActivo(sel); aplicarFiltrosResidencia(); });
        sel.dataset.listener = "1";
      }
    });
  }

  // Render charts con animación (canvas ya existe)
  requestAnimationFrame(() => {
    agruparYRender(data, "rStatus", cStatus, "doughnut");
    agruparYRender(data, "rObs", cObs, "doughnut");
  });

  // Tabla
  let html = `<table><thead><tr>
    <th>Nombre</th><th>Status</th><th>Observaciones</th><th>Empresa</th><th>Procedencia</th>
  </tr></thead><tbody>`;
  data.forEach(f => {
    html += `<tr>
      <td class="td-strong">${norm(f[cNombre]) || "-"}</td>
      <td>${norm(f[cStatus]) || "-"}</td>
      <td>${norm(f[cObs]) || "-"}</td>
      <td>${norm(f[cEmpresa]) || "-"}</td>
      <td>${norm(f[cProc]) || "-"}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("tablaDetalleResidencia").innerHTML = html;

  // Marcar activos los segmentadores
  ["filterStatusR","filterObsR","filterEmpresaR"].forEach(id => marcarSegmentadorActivo(document.getElementById(id)));
}

function aplicarFiltrosResidencia() {
  const status = document.getElementById("filterStatusR")?.value || "";
  const obs = document.getElementById("filterObsR")?.value || "";
  const empresa = document.getElementById("filterEmpresaR")?.value || "";

  const cStatus = col(fuerza, "Status");
  const cObs = col(fuerza, "Observaciones");
  const cEmpresa = col(fuerza, "Empresa");

  const filtrado = fuerza.filter(f => {
    if (status && norm(f[cStatus]) !== status) return false;
    if (obs && norm(f[cObs]) !== obs) return false;
    if (empresa && norm(f[cEmpresa]) !== empresa) return false;
    return true;
  });

  const backup = fuerza;
  fuerza = filtrado;
  renderResidencia();
  fuerza = backup;
}

// ============ NAVEGACIÓN ============
function cambiarSeccion(seccion) {
  seccionActual = seccion;
  document.querySelectorAll("#dashTabs .tab").forEach(t => t.classList.toggle("active", t.dataset.seccion === seccion));
  document.getElementById("fuerza").style.display = seccion === "fuerza" ? "block" : "none";
  document.getElementById("semanal").style.display = seccion === "semanal" ? "block" : "none";
  document.getElementById("residencia").style.display = seccion === "residencia" ? "block" : "none";
}

// ============ INIT ============
(async function init() {
  try {
    fuerza = await cargarHoja("FUERZA_LABORAL");
    semanal = await cargarHoja("REPORTE_SEMANAL");

    document.getElementById("loading").style.display = "none";
    document.getElementById("dashTabs").style.display = "flex";
    document.getElementById("fuerza").style.display = "block";

    if (fuerza.length > 0) {
      renderFuerza();
      renderResidencia();
    }
    if (semanal.length > 0) renderSemanal();

    document.getElementById("clearFuerza").addEventListener("click", () => {
      document.querySelectorAll("#fuerza .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#fuerza .filter-select").forEach(marcarSegmentadorActivo);
      renderFuerza();
    });
    document.getElementById("clearSemanal").addEventListener("click", () => {
      document.querySelectorAll("#semanal .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#semanal .filter-select").forEach(marcarSegmentadorActivo);
      renderSemanal();
    });
    document.getElementById("clearResidencia").addEventListener("click", () => {
      document.querySelectorAll("#residencia .filter-select").forEach(s => s.value = "");
      document.querySelectorAll("#residencia .filter-select").forEach(marcarSegmentadorActivo);
      renderResidencia();
    });

    document.querySelectorAll("#dashTabs .tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        cambiarSeccion(tab.dataset.seccion);
      });
    });
  } catch (err) {
    console.error(err);
    document.getElementById("loading").innerHTML = `<p style="color:#F26F2B;">Error al cargar: ${err.message}</p>`;
  }
})();