const PRODUCTOS_INICIALES = [
  { sku: "BATIDORA-TURBO-220V",   nombre: "", rack: "A", pos: "25",          deposito: 84,  picking: 4  },
  { sku: "BATIDORA-TURBO-220V",   nombre: "", rack: "C", pos: "12",          deposito: 60,  picking: 0  },
  { sku: "BOMBA-ELECTRICA-DISP",  nombre: "", rack: "A", pos: "6",           deposito: 129, picking: 3  },
  { sku: "TAZA-AUTOMATICA-BROWN", nombre: "", rack: "-", pos: "-",           deposito: 0,   picking: 6  },
  { sku: "TAZA-AUTOMATICA-GREY",  nombre: "", rack: "-", pos: "-",           deposito: 0,   picking: 90 },
  { sku: "MESA-RATONA-WHITE",     nombre: "", rack: "C", pos: "13-14-15-16", deposito: 48,  picking: 0  },
  { sku: "MESA-RATONA-BROWN",     nombre: "", rack: "C", pos: "8",           deposito: 4,   picking: 0  },
  { sku: "MESA-RATONA-MARBLE",    nombre: "", rack: "C", pos: "10",          deposito: 7,   picking: 0  },
  { sku: "BOTELLA-AGUA-PINK",     nombre: "", rack: "B", pos: "12",          deposito: 60,  picking: 4  },
  { sku: "BOTELLA-AGUA-YELLOW",   nombre: "", rack: "B", pos: "12",          deposito: 73,  picking: 2  },
  { sku: "BOT-WATER-FOOD-PINK",   nombre: "", rack: "A", pos: "12",          deposito: 40,  picking: 4  },
  { sku: "BOT-WATER-FOOD-YELLOW", nombre: "", rack: "A", pos: "12",          deposito: 40,  picking: 4  },
];

function cargarDatos() {
  const guardado = localStorage.getItem('stock_productos');
  return guardado ? JSON.parse(guardado) : JSON.parse(JSON.stringify(PRODUCTOS_INICIALES));
}

function cargarMovimientos() {
  const guardado = localStorage.getItem('stock_movimientos');
  return guardado ? JSON.parse(guardado) : [];
}

function guardarDatos() {
  localStorage.setItem('stock_productos', JSON.stringify(productos));
  localStorage.setItem('stock_movimientos', JSON.stringify(movimientos));
}

let productos = cargarDatos();
let movimientos = cargarMovimientos();
let idxEditando = null;
let filtroStockBajoActivo = false;

function cargarSelect(filtro = '') {
  const sel = document.getElementById('sel-sku');
  const term = filtro.toLowerCase().trim();

  sel.innerHTML = '<option value="">— Seleccioná un SKU —</option>';

  const listaFiltrada = productos
    .map((p, i) => ({ ...p, idx: i }))
    .filter(p => {
      const sku = String(p.sku || '').toLowerCase();
      const nombre = String(p.nombre || '').toLowerCase();
      const rack = String(p.rack || '').toLowerCase();
      const pos = String(p.pos || '').toLowerCase();

      return (
        sku.includes(term) ||
        nombre.includes(term) ||
        rack.includes(term) ||
        pos.includes(term)
      );
    });

  if (listaFiltrada.length === 0) {
    sel.innerHTML += '<option value="">Sin resultados</option>';
    return;
  }

  listaFiltrada.forEach(p => {
    const nombreTexto = p.nombre ? ` — ${p.nombre}` : '';
    const ubicacion = p.rack !== '-'
      ? `Rack ${p.rack} — Pos. ${p.pos}`
      : 'Sin ubicación';

    sel.innerHTML += `
      <option value="${p.idx}">
        ${p.sku}${nombreTexto} [${ubicacion}]
      </option>
    `;
  });
}

function filtrarSelectMovimiento() {
  const texto = document.getElementById('buscador-movimiento').value;
  cargarSelect(texto);
}

function mover(signo) {
  const idx = parseInt(document.getElementById('sel-sku').value);
  const cantVal = parseInt(document.getElementById('cant-input').value);
  const lugar = document.querySelector('input[name="lugar"]:checked').value;

  if (isNaN(idx)) {
    mostrarMsg('Seleccioná un producto.', false);
    return;
  }

  if (!cantVal || cantVal < 1) {
    mostrarMsg('Ingresá una cantidad válida.', false);
    return;
  }

  const p = productos[idx];
  const campo = lugar === 'deposito' ? 'deposito' : 'picking';
  const nuevoValor = p[campo] + (signo * cantVal);

  if (nuevoValor < 0) {
    mostrarMsg(`Stock insuficiente en ${lugar}. Hay ${p[campo]} unidades.`, false);
    return;
  }

  p[campo] = nuevoValor;

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const fecha = ahora.toLocaleDateString('es-AR');

  movimientos.unshift({
    sku: p.sku,
    lugar,
    accion: signo > 0 ? 'INGRESO' : 'EGRESO',
    cantidad: cantVal,
    signo,
    hora: `${fecha} ${hora}`
  });

  guardarDatos();

  mostrarMsg(
    `${signo > 0 ? 'INGRESO' : 'EGRESO'}: ${cantVal} unidades de ${p.sku} en ${lugar}.`,
    true
  );

  renderTabla();
  renderMovimientos();
  cargarSelect(document.getElementById('buscador-movimiento')?.value || '');
}

function mostrarMsg(texto, ok) {
  const msg = document.getElementById('msg');
  msg.textContent = texto;
  msg.className = 'msg ' + (ok ? 'ok' : 'error');

  setTimeout(() => {
    msg.className = 'msg';
  }, 3000);
}

function mostrarMsgNuevo(texto, ok) {
  const msg = document.getElementById('msg-nuevo');
  msg.textContent = texto;
  msg.className = 'msg ' + (ok ? 'ok' : 'error');

  setTimeout(() => {
    msg.className = 'msg';
  }, 3000);
}

function abrirModal(idx) {
  idxEditando = idx;
  const p = productos[idx];

  document.getElementById('modal-sku-label').textContent = p.sku;
  document.getElementById('modal-rack').value = p.rack === '-' ? '' : p.rack;
  document.getElementById('modal-pos').value = p.pos === '-' ? '' : p.pos;

  document.getElementById('modal-overlay').classList.add('activo');
}

function cerrarModal() {
  idxEditando = null;
  document.getElementById('modal-overlay').classList.remove('activo');
}

function guardarUbicacion() {
  if (idxEditando === null) return;

  const rack = document.getElementById('modal-rack').value.trim() || '-';
  const pos = document.getElementById('modal-pos').value.trim() || '-';

  productos[idxEditando].rack = rack;
  productos[idxEditando].pos = pos;

  guardarDatos();
  cargarSelect(document.getElementById('buscador-movimiento')?.value || '');
  renderTabla();
  cerrarModal();

  mostrarMsg('Ubicación actualizada correctamente.', true);
}

function abrirModalNuevo() {
  document.getElementById('nuevo-sku').value = '';
  document.getElementById('nuevo-rack').value = '';
  document.getElementById('nuevo-pos').value = '';
  document.getElementById('nuevo-deposito').value = '0';
  document.getElementById('nuevo-picking').value = '0';
  document.getElementById('msg-nuevo').className = 'msg';

  document.getElementById('modal-nuevo-overlay').classList.add('activo');

  setTimeout(() => {
    document.getElementById('nuevo-sku').focus();
  }, 100);
}

function cerrarModalNuevo() {
  document.getElementById('modal-nuevo-overlay').classList.remove('activo');
}

function guardarNuevoProducto() {
  const sku = document.getElementById('nuevo-sku').value.trim().toUpperCase();
  const rack = document.getElementById('nuevo-rack').value.trim() || '-';
  const pos = document.getElementById('nuevo-pos').value.trim() || '-';
  const deposito = parseInt(document.getElementById('nuevo-deposito').value) || 0;
  const picking = parseInt(document.getElementById('nuevo-picking').value) || 0;

  if (!sku) {
    mostrarMsgNuevo('El SKU es obligatorio.', false);
    return;
  }

  productos.push({
    sku,
    nombre: "",
    rack,
    pos,
    deposito,
    picking
  });

  guardarDatos();
  cargarSelect();
  renderTabla();
  cerrarModalNuevo();

  mostrarMsg(`Producto "${sku}" agregado correctamente.`, true);
}

function eliminarProducto(idx) {
  const p = productos[idx];

  if (!confirm(`¿Eliminar "${p.sku}"? Esta acción no se puede deshacer.`)) return;

  productos.splice(idx, 1);

  guardarDatos();
  cargarSelect();
  renderTabla();

  mostrarMsg('Producto eliminado.', true);
}

function renderTabla(filtro = '') {
  const tbody = document.getElementById('tbody');
  const term = filtro.toLowerCase().trim();

  const lista = productos
    .map((p, i) => ({ ...p, idx: i }))
    .filter(p => {
      const total = Number(p.deposito) + Number(p.picking);

      if (filtroStockBajoActivo) {
        return total < 10;
      }

      const sku = String(p.sku || '').toLowerCase();
      const nombre = String(p.nombre || '').toLowerCase();
      const rack = String(p.rack || '').toLowerCase();
      const pos = String(p.pos || '').toLowerCase();

      return (
        sku.includes(term) ||
        nombre.includes(term) ||
        rack.includes(term) ||
        pos.includes(term)
      );
    });

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:#666;padding:28px;font-size:13px;">
          Sin resultados
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const total = Number(p.deposito) + Number(p.picking);

    const claseTotal = total <= 5
      ? 'cant cant-total cant-baja'
      : 'cant cant-total';

    let claseFila = '';

    if (total === 0) {
      claseFila = 'fila-sin-stock';
    } else if (total < 10) {
      claseFila = 'fila-stock-bajo';
    }

    return `
      <tr class="${claseFila}">
        <td class="sku">${p.sku}</td>
        <td><span class="badge">${p.rack}</span></td>
        <td style="color:#7A7469;font-size:13px;">${p.pos}</td>
        <td class="cant cant-depo">${p.deposito}</td>
        <td class="cant cant-pick">${p.picking}</td>
        <td class="${claseTotal}">${total}</td>
        <td>
          <button class="btn-editar" onclick="abrirModal(${p.idx})">✏️ Editar</button>
          <button class="btn-eliminar" onclick="eliminarProducto(${p.idx})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrar() {
  filtroStockBajoActivo = false;
  renderTabla(document.getElementById('buscador').value);
}

function verStockBajo() {
  filtroStockBajoActivo = true;
  document.getElementById('buscador').value = '';
  renderTabla();
}

function verTodos() {
  filtroStockBajoActivo = false;
  document.getElementById('buscador').value = '';
  renderTabla();
}

function renderMovimientos() {
  const lista = document.getElementById('lista-mov');

  if (movimientos.length === 0) {
    lista.innerHTML = '<span class="sin-mov">Sin movimientos aún.</span>';
    return;
  }

  lista.innerHTML = movimientos.slice(0, 50).map(m => {
    const cls = m.signo > 0 ? 'mov-pos' : 'mov-neg';
    const signo = m.signo > 0 ? '+' : '−';

    return `
      <div class="mov-item">
        <span class="mov-info"><b>${m.sku}</b> — ${m.lugar}</span>
        <span class="mov-signo ${cls}">${signo}${m.cantidad}</span>
        <span class="mov-hora">${m.hora}</span>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const modalEditar = document.getElementById('modal-overlay');
  const modalNuevo = document.getElementById('modal-nuevo-overlay');

  if (modalEditar) {
    modalEditar.addEventListener('click', function(e) {
      if (e.target === this) cerrarModal();
    });
  }

  if (modalNuevo) {
    modalNuevo.addEventListener('click', function(e) {
      if (e.target === this) cerrarModalNuevo();
    });
  }

  cargarSelect();
  renderTabla();
  renderMovimientos();
});