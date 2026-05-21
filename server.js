const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'stock-data.json');

// ── DATOS INICIALES ──────────────────────────────────────────────────
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

// ── BASE DE DATOS EN JSON ────────────────────────────────────────────
function leerDB() {
  if (!fs.existsSync(DB_FILE)) {
    const inicial = { productos: PRODUCTOS_INICIALES, movimientos: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(inicial, null, 2));
    return inicial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function guardarDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));

// ── RUTAS API ────────────────────────────────────────────────────────

app.get('/api/stock', (req, res) => {
  const db = leerDB();
  res.json(db);
});

// Importar productos desde CSV
app.post('/api/importar-csv', (req, res) => {
  const { productos } = req.body;

  if (!Array.isArray(productos)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }

  const productosLimpios = productos
    .map(p => ({
      sku: String(p.sku || '').trim().toUpperCase(),
      nombre: String(p.nombre || '').trim(),
      rack: String(p.rack || '-').trim() || '-',
      pos: String(p.pos || '-').trim() || '-',
      deposito: Number(p.deposito) || 0,
      picking: Number(p.picking) || 0
    }))
    .filter(p => p.sku);

  if (productosLimpios.length === 0) {
    return res.status(400).json({ error: 'No hay productos válidos para importar.' });
  }

  const db = leerDB();

  db.productos = productosLimpios;

  guardarDB(db);

  res.json({
    ok: true,
    total: productosLimpios.length
  });
});

// Registrar movimiento
app.post('/api/movimiento', (req, res) => {
  const { idx, lugar, signo, cantidad } = req.body;
  const db = leerDB();

  if (idx === undefined || idx < 0 || idx >= db.productos.length) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  const p = db.productos[idx];
  const campo = lugar === 'deposito' ? 'deposito' : 'picking';
  const nuevoValor = p[campo] + (signo * cantidad);

  if (nuevoValor < 0) {
    return res.status(400).json({ error: `Stock insuficiente en ${lugar}. Hay ${p[campo]} unidades.` });
  }

  p[campo] = nuevoValor;

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-AR');

  db.movimientos.unshift({
    sku: p.sku,
    lugar,
    accion: signo > 0 ? 'INGRESO' : 'EGRESO',
    cantidad,
    signo,
    hora: `${fecha} ${hora}`
  });

  // Guardar solo los últimos 200 movimientos
  db.movimientos = db.movimientos.slice(0, 200);

  guardarDB(db);
  res.json({ ok: true, producto: p });
});

// Agregar producto nuevo
app.post('/api/producto', (req, res) => {
  const { sku, rack, pos, deposito, picking } = req.body;
  const db = leerDB();

  if (!sku) return res.status(400).json({ error: 'SKU obligatorio' });

  db.productos.push({ sku: sku.toUpperCase(), nombre: '', rack: rack || '-', pos: pos || '-', deposito: deposito || 0, picking: picking || 0 });
  guardarDB(db);
  res.json({ ok: true });
});

// Editar ubicación
app.put('/api/producto/:idx', (req, res) => {
  const idx = parseInt(req.params.idx);
  const { rack, pos } = req.body;
  const db = leerDB();

  if (idx < 0 || idx >= db.productos.length) return res.status(400).json({ error: 'Producto inválido' });

  db.productos[idx].rack = rack || '-';
  db.productos[idx].pos = pos || '-';
  guardarDB(db);
  res.json({ ok: true });
});

// Eliminar producto
app.delete('/api/producto/:idx', (req, res) => {
  const idx = parseInt(req.params.idx);
  const db = leerDB();

  if (idx < 0 || idx >= db.productos.length) return res.status(400).json({ error: 'Producto inválido' });

  db.productos.splice(idx, 1);
  guardarDB(db);
  res.json({ ok: true });
});

// Importar productos desde CSV
app.post('/api/importar-csv', (req, res) => {
  const { productos } = req.body;

  if (!Array.isArray(productos)) {
    return res.status(400).json({ error: 'Formato inválido.' });
  }

  const productosLimpios = productos
    .map(p => ({
      sku: String(p.sku || '').trim().toUpperCase(),
      nombre: String(p.nombre || '').trim(),
      rack: String(p.rack || '-').trim() || '-',
      pos: String(p.pos || '-').trim() || '-',
      deposito: Number(p.deposito) || 0,
      picking: Number(p.picking) || 0
    }))
    .filter(p => p.sku);

  if (productosLimpios.length === 0) {
    return res.status(400).json({ error: 'No hay productos válidos para importar.' });
  }

  const db = leerDB();

  db.productos = productosLimpios;

  guardarDB(db);

  res.json({
    ok: true,
    total: productosLimpios.length
  });
});
// ── ARRANCAR SERVIDOR ────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let ipLocal = 'tu-ip-local';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ipLocal = net.address;
      }
    }
  }

  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 En la red local:  http://${ipLocal}:${PORT}`);
  console.log(`\nDejá esta ventana abierta mientras usás el sistema.\n`);
});