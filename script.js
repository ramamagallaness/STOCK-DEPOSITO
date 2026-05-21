let productos = [];
let movimientos = [];
let idxEditando = null;
let filtroStockBajoActivo = false;

// ── CARGAR DATOS DEL SERVIDOR ─────────────────────────────────────────
async function cargarDesdeServidor() {
  try {
    const res = await fetch('/api/stock');
    const data = await res.json();

    productos = data.productos || [];
    movimientos = data.movimientos || [];

    cargarSelect(document.getElementById('buscador-movimiento')?.value || '');
    renderTabla(document.getElementById('buscador')?.value || '');
    renderMovimientos();

  } catch (e) {
    console.error('Error cargando datos:', e);
    mostrarMsg('Error cargando datos del servidor.', false);
  }
}

// ── SELECT DE PRODUCTOS ───────────────────────────────────────────────
function cargarSelect(filtro = '') {
  const sel = document.getElementById('sel-sku');
  if (!sel) return;

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

    sel.innerHTML += `<option value="${p.idx}">${p.sku}${nombreTexto} [${ubicacion}]</option>`;
  });
}

function filtrarSelectMovimiento() {
  const texto = document.getElementById('buscador-movimiento').value;
  cargarSelect(texto);
}

// ── MOVER STOCK ───────────────────────────────────────────────────────
async function mover(signo) {
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

  try {
    const res = await fetch('/api/movimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idx, lugar, signo, cantidad: cantVal })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMsg(data.error || 'Error al registrar movimiento.', false);
      return;
    }

    const sku = productos[idx]?.sku || 'producto';

    mostrarMsg(
      `${signo > 0 ? 'INGRESO' : 'EGRESO'}: ${cantVal} unidades de ${sku} en ${lugar}.`,
      true
    );

    await cargarDesdeServidor();

  } catch (e) {
    console.error(e);
    mostrarMsg('Error de conexión con el servidor.', false);
  }
}

// ── MODAL EDITAR UBICACIÓN ────────────────────────────────────────────
function abrirModal(idx) {
  idxEditando = idx;

  const p = productos[idx];

  if (!p) return;

  document.getElementById('modal-sku-label').textContent = p.sku;
  document.getElementById('modal-rack').value = p.rack === '-' ? '' : p.rack;
  document.getElementById('modal-pos').value = p.pos === '-' ? '' : p.pos;

  document.getElementById('modal-overlay').classList.add('activo');
}

function cerrarModal() {
  idxEditando = null;
  document.getElementById('modal-overlay').classList.remove('activo');
}

async function guardarUbicacion() {
  if (idxEditando === null) return;

  const rack = document.getElementById('modal-rack').value.trim() || '-';
  const pos = document.getElementById('modal-pos').value.trim() || '-';

  try {
    const res = await fetch(`/api/producto/${idxEditando}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rack, pos })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMsg(data.error || 'Error al guardar ubicación.', false);
      return;
    }

    cerrarModal();
    mostrarMsg('Ubicación actualizada correctamente.', true);
    await cargarDesdeServidor();

  } catch (e) {
    console.error(e);
    mostrarMsg('Error al guardar.', false);
  }
}

// ── MODAL NUEVO PRODUCTO ──────────────────────────────────────────────
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

async function guardarNuevoProducto() {
  const sku = document.getElementById('nuevo-sku').value.trim().toUpperCase();
  const rack = document.getElementById('nuevo-rack').value.trim() || '-';
  const pos = document.getElementById('nuevo-pos').value.trim() || '-';
  const deposito = parseInt(document.getElementById('nuevo-deposito').value) || 0;
  const picking = parseInt(document.getElementById('nuevo-picking').value) || 0;

  if (!sku) {
    mostrarMsgNuevo('El SKU es obligatorio.', false);
    return;
  }

  try {
    const res = await fetch('/api/producto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, rack, pos, deposito, picking })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMsgNuevo(data.error || 'Error al guardar producto.', false);
      return;
    }

    cerrarModalNuevo();
    mostrarMsg(`Producto "${sku}" agregado correctamente.`, true);
    await cargarDesdeServidor();

  } catch (e) {
    console.error(e);
    mostrarMsgNuevo('Error al guardar.', false);
  }
}

async function eliminarProducto(idx) {
  const p = productos[idx];

  if (!p) return;

  if (!confirm(`¿Eliminar "${p.sku}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await fetch(`/api/producto/${idx}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMsg(data.error || 'Error al eliminar producto.', false);
      return;
    }

    mostrarMsg('Producto eliminado.', true);
    await cargarDesdeServidor();

  } catch (e) {
    console.error(e);
    mostrarMsg('Error al eliminar.', false);
  }
}

// ── IMPORTAR CSV DESDE GOOGLE SHEETS ─────────────────────────────────

// Detecta si el archivo viene separado por coma, punto y coma o tabulación
function detectarSeparador(texto) {
  const primerasLineas = texto.split(/\r?\n/).slice(0, 6).join('\n');

  const cantidadComas = (primerasLineas.match(/,/g) || []).length;
  const cantidadPuntoComa = (primerasLineas.match(/;/g) || []).length;
  const cantidadTabs = (primerasLineas.match(/\t/g) || []).length;

  if (cantidadPuntoComa >= cantidadComas && cantidadPuntoComa >= cantidadTabs) return ';';
  if (cantidadTabs >= cantidadComas && cantidadTabs >= cantidadPuntoComa) return '\t';

  return ',';
}

function parsearCSV(texto) {
  const separador = detectarSeparador(texto);

  console.log('Separador detectado:', separador === '\t' ? 'TAB' : separador);

  const filas = [];
  let fila = [];
  let valor = '';
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const siguiente = texto[i + 1];

    if (char === '"' && dentroComillas && siguiente === '"') {
      valor += '"';
      i++;
    } else if (char === '"') {
      dentroComillas = !dentroComillas;
    } else if (char === separador && !dentroComillas) {
      fila.push(valor);
      valor = '';
    } else if ((char === '\n' || char === '\r') && !dentroComillas) {
      if (valor || fila.length > 0) {
        fila.push(valor);
        filas.push(fila);
        fila = [];
        valor = '';
      }

      if (char === '\r' && siguiente === '\n') {
        i++;
      }
    } else {
      valor += char;
    }
  }

  if (valor || fila.length > 0) {
    fila.push(valor);
    filas.push(fila);
  }

  return filas;
}

function normalizarHeader(texto) {
  return String(texto || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizarNumero(valor) {
  if (valor === undefined || valor === null) return 0;

  const limpio = String(valor)
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');

  return Number(limpio) || 0;
}

function buscarIndice(headers, opciones) {
  for (const opcion of opciones) {
    const index = headers.indexOf(opcion);
    if (index !== -1) return index;
  }

  return -1;
}

async function importarCSV(event) {
  const archivo = event.target.files[0];

  if (!archivo) return;

  const lector = new FileReader();

  lector.onload = async function(e) {
    try {
      const contenido = e.target.result;

      const filasOriginales = parsearCSV(contenido);

      const filas = filasOriginales.filter(fila =>
        fila.some(celda => String(celda).trim() !== '')
      );

      console.log('Primeras filas leídas:', filas.slice(0, 5));

      if (filas.length < 2) {
        mostrarMsg('El CSV está vacío o no tiene productos.', false);
        event.target.value = '';
        return;
      }

      let indiceHeader = -1;
      let headers = [];

      // Busca automáticamente la fila donde aparezca SKU
      for (let i = 0; i < filas.length; i++) {
        const posiblesHeaders = filas[i].map(normalizarHeader);

        if (posiblesHeaders.includes('sku')) {
          indiceHeader = i;
          headers = posiblesHeaders;
          break;
        }
      }

      console.log('Fila de encabezados detectada:', indiceHeader);
      console.log('Headers detectados:', headers);

      if (indiceHeader === -1) {
        mostrarMsg('No encontré la columna SKU. Revisá que el archivo sea CSV y que la fila tenga SKU.', false);
        event.target.value = '';
        return;
      }

      const idxSKU = buscarIndice(headers, ['sku']);
      const idxNombre = buscarIndice(headers, ['nombre', 'producto', 'descripcion', 'detalle']);
      const idxRack = buscarIndice(headers, ['rack']);
      const idxPos = buscarIndice(headers, ['posicion', 'pos', 'ubicacion']);
      const idxDeposito = buscarIndice(headers, ['deposito', 'stockdeposito', 'dep']);
      const idxPicking = buscarIndice(headers, ['picking', 'stockpicking', 'pick']);

      const nuevosProductos = filas.slice(indiceHeader + 1)
        .map(fila => {
          const sku = String(fila[idxSKU] || '').trim().toUpperCase();

          if (!sku) return null;

          return {
            sku,
            nombre: idxNombre !== -1 ? String(fila[idxNombre] || '').trim() : '',
            rack: idxRack !== -1 ? String(fila[idxRack] || '-').trim() || '-' : '-',
            pos: idxPos !== -1 ? String(fila[idxPos] || '-').trim() || '-' : '-',
            deposito: idxDeposito !== -1 ? normalizarNumero(fila[idxDeposito]) : 0,
            picking: idxPicking !== -1 ? normalizarNumero(fila[idxPicking]) : 0
          };
        })
        .filter(Boolean);

      console.log('Productos detectados:', nuevosProductos.slice(0, 5));

      if (nuevosProductos.length === 0) {
        mostrarMsg('Encontré SKU, pero no encontré productos válidos debajo.', false);
        event.target.value = '';
        return;
      }

      const confirmar = confirm(
        `Se van a importar ${nuevosProductos.length} productos.\n\nEsto va a reemplazar la lista actual de productos.\n\n¿Querés continuar?`
      );

      if (!confirmar) {
        event.target.value = '';
        return;
      }

      const res = await fetch('/api/importar-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: nuevosProductos })
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMsg(data.error || 'Error al importar CSV.', false);
        event.target.value = '';
        return;
      }

      mostrarMsg(`Se importaron ${nuevosProductos.length} productos correctamente.`, true);

      await cargarDesdeServidor();

      event.target.value = '';

    } catch (error) {
      console.error(error);
      mostrarMsg('Error al leer el CSV.', false);
      event.target.value = '';
    }
  };

  lector.readAsText(archivo, 'UTF-8');
}

// ── MENSAJES ──────────────────────────────────────────────────────────
function mostrarMsg(texto, ok) {
  const msg = document.getElementById('msg');

  if (!msg) return;

  msg.textContent = texto;
  msg.className = 'msg ' + (ok ? 'ok' : 'error');

  setTimeout(() => {
    msg.className = 'msg';
  }, 3000);
}

function mostrarMsgNuevo(texto, ok) {
  const msg = document.getElementById('msg-nuevo');

  if (!msg) return;

  msg.textContent = texto;
  msg.className = 'msg ' + (ok ? 'ok' : 'error');

  setTimeout(() => {
    msg.className = 'msg';
  }, 3000);
}

// ── TABLA ─────────────────────────────────────────────────────────────
function renderTabla(filtro = '') {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;

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

    const claseFila = total === 0
      ? 'fila-sin-stock'
      : total < 10
        ? 'fila-stock-bajo'
        : '';

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

// ── MOVIMIENTOS ───────────────────────────────────────────────────────
function renderMovimientos() {
  const lista = document.getElementById('lista-mov');
  if (!lista) return;

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

// ── INIT ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const modalEditar = document.getElementById('modal-overlay');
  const modalNuevo = document.getElementById('modal-nuevo-overlay');

  if (modalEditar) {
    modalEditar.addEventListener('click', e => {
      if (e.target === modalEditar) cerrarModal();
    });
  }

  if (modalNuevo) {
    modalNuevo.addEventListener('click', e => {
      if (e.target === modalNuevo) cerrarModalNuevo();
    });
  }

  cargarDesdeServidor();

  setInterval(cargarDesdeServidor, 10000);
});