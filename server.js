const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');

let config;
try {
  config = require('./config.json');
} catch {
  console.error('ERROR: config.json no encontrado. Copia config.example.json a config.json y configura tus credenciales.');
  process.exit(1);
}

const app = express();
const JWT_SECRET = config.jwtSecret;
if (!JWT_SECRET || JWT_SECRET === 'cambia-esto-por-algo-secreto-paolitas-2026') {
  console.error('ERROR: Debes cambiar jwtSecret en config.json por un valor secreto único.');
  process.exit(1);
}
const upload = multer({ dest: '/tmp/uploads/' });

app.use(express.json({ limit: '10mb' }));

let pool;

async function initDB() {
  pool = mysql.createPool({ ...config.db, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

  const conn = await pool.getConnection();
  await conn.execute(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner','vendedora') DEFAULT 'vendedora',
    avatar VARCHAR(10) DEFAULT '',
    color VARCHAR(20) DEFAULT '#6366f1',
    can_dashboard TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    barcode VARCHAR(50) DEFAULT '',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    unit VARCHAR(10) DEFAULT 'pza',
    active TINYINT(1) DEFAULT 1,
    INDEX idx_barcode (barcode),
    INDEX idx_category (category)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(20) PRIMARY KEY,
    date DATETIME NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    cash_received DECIMAL(12,2) DEFAULT 0,
    cash_amount DECIMAL(12,2) DEFAULT 0,
    qr_amount DECIMAL(12,2) DEFAULT 0,
    change_amount DECIMAL(12,2) DEFAULT 0,
    user_id VARCHAR(50) NOT NULL,
    attended_by VARCHAR(100) NOT NULL,
    order_id VARCHAR(20) DEFAULT NULL,
    INDEX idx_date (date),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(20) NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL,
    INDEX idx_tx (transaction_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(20) PRIMARY KEY,
    date DATETIME NOT NULL,
    category VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    INDEX idx_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(20) PRIMARY KEY,
    date DATETIME NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_phone VARCHAR(30) DEFAULT '',
    client_zone VARCHAR(100) DEFAULT '',
    client_addr VARCHAR(255) DEFAULT '',
    notes TEXT DEFAULT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    delivery_type VARCHAR(20) DEFAULT 'delivery',
    transport_type VARCHAR(20) DEFAULT 'incluido',
    transport_cost DECIMAL(10,2) DEFAULT 0,
    driver_id VARCHAR(10) DEFAULT NULL,
    status ENUM('pendiente','preparando','en_camino','entregado','cancelado') DEFAULT 'pendiente',
    user_id VARCHAR(50) NOT NULL,
    attended_by VARCHAR(100) NOT NULL,
    INDEX idx_status (status),
    INDEX idx_date (date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    plate VARCHAR(20) DEFAULT ''
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS counters (
    \`key\` VARCHAR(30) PRIMARY KEY,
    value INT NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await seed(conn);
  conn.release();
}

async function seed(conn) {
  const [rows] = await conn.execute('SELECT COUNT(*) as c FROM users');
  if (rows[0].c > 0) return;

  const salt = await bcrypt.genSalt(10);
  const hashPaola = await bcrypt.hash('paola123', salt);
  const hashEspe = await bcrypt.hash('esperanza123', salt);
  await conn.execute('INSERT INTO users (id,name,password_hash,role,avatar,color,can_dashboard) VALUES (?,?,?,?,?,?,?)', ['paola','Sra. Paola',hashPaola,'owner','P','#ec4899',1]);
  await conn.execute('INSERT INTO users (id,name,password_hash,role,avatar,color,can_dashboard) VALUES (?,?,?,?,?,?,?)', ['esperancita','Esperancita',hashEspe,'vendedora','E','#f59e0b',0]);

  const drivers = [['d1','Jonhy Mamani','59178001001','3456-ABC'],['d2','Gerson Colque','59178001002','7891-DEF'],['d3','Rolando Quispe','59178001003','2345-GHI'],['d4','Felix Callisaya','59178001004','6789-JKL']];
  for (const d of drivers) await conn.execute('INSERT IGNORE INTO drivers (id,name,phone,plate) VALUES (?,?,?,?)', d);

  const products = [
    ['Coca-Cola 600ml','Bebidas','7501055300120',8,5,48,'pza'],
    ['Pepsi 2L','Bebidas','7501055300236',15,9,36,'pza'],
    ['Agua Mineral 1.5L','Bebidas','7501055300342',6,3,72,'pza'],
    ['Jugo de Naranja 1L','Bebidas','7501055300458',12,7,24,'pza'],
    ['Cerveza Paceña 355ml','Bebidas','7501055300564',10,6,60,'pza'],
    ['Red Bull 250ml','Bebidas','9002490100070',20,13,18,'pza'],
    ['Te Helado 500ml','Bebidas','7501055300786',7,4,42,'pza'],
    ['Leche Entera 1L','Lacteos','7501055300892',10,6,56,'pza'],
    ['Leche Deslactosada 1L','Lacteos','7501055300908',12,8,38,'pza'],
    ['Yogurt Natural 1kg','Lacteos','7501055301011',16,10,30,'pza'],
    ['Queso Panela 400g','Lacteos','7501055301127',28,18,15,'pza'],
    ['Crema Acida 200ml','Lacteos','7501055301233',8,5,28,'pza'],
    ['Helado Vainilla 1L','Lacteos','7501055301349',24,15,12,'pza'],
    ['Pan Blanco 680g','Panaderia','7501055301455',16,9,22,'pza'],
    ['Pan Integral 680g','Panaderia','7501055301561',18,11,18,'pza'],
    ['Pan Dulce Surtido','Panaderia','7501055301677',3,1.5,80,'pza'],
    ['Galletas de Chocolate','Panaderia','7501055301783',9,5,45,'pza'],
    ['Tortillas de Maiz 1kg','Panaderia','7501055301899',10,6,50,'kg'],
    ['Pechuga de Pavo 250g','Carnes','7501055302002',25,16,14,'pza'],
    ['Jamon 250g','Carnes','7501055302118',22,14,20,'pza'],
    ['Salchicha 500g','Carnes','7501055302224',20,12,25,'pza'],
    ['Tocino 250g','Carnes','7501055302330',27,17,10,'pza'],
    ['Queso Manchego 200g','Carnes','7501055302446',32,20,8,'pza'],
    ['Papas Fritas 150g','Snacks','2840003010605',10,6,55,'pza'],
    ['Cacahuates Salados 200g','Snacks','7501055302668',8,4,40,'pza'],
    ['Doritos Nacho 150g','Snacks','2840003010711',12,7,35,'pza'],
    ['Galletas Saladas 200g','Snacks','7501055302880',7,4,48,'pza'],
    ['Frutos Secos Mix 200g','Snacks','7501055302996',18,11,22,'pza'],
    ['Barra de Chocolate','Snacks','7622210590314',7,3.5,60,'pza'],
    ['Arroz 1kg','Abarrotes','7501055303108',12,8,40,'kg'],
    ['Frijoles Negros 1kg','Abarrotes','7501055303214',14,9,35,'kg'],
    ['Aceite Vegetal 1L','Abarrotes','7501055303320',16,10,30,'pza'],
    ['Azucar 1kg','Abarrotes','7501055303436',14,9,45,'kg'],
    ['Sal 1kg','Abarrotes','7501055303542',5,2.5,55,'kg'],
    ['Pasta Espagueti 500g','Abarrotes','7501055303658',6,3.5,50,'pza'],
    ['Salsa de Tomate 400g','Abarrotes','7501055303764',8,4.5,38,'pza'],
    ['Cafe Instantaneo 95g','Abarrotes','7501055303870',20,13,20,'pza'],
    ['Detergente Polvo 1kg','Limpieza','7501055303986',18,11,25,'pza'],
    ['Jabon Liquido 750ml','Limpieza','7501055304099',16,10,28,'pza'],
    ['Papel Higienico 4 rollos','Limpieza','7501055304105',14,8,35,'pza']
  ];
  for (const p of products) await conn.execute('INSERT INTO products (name,category,barcode,price,cost,stock,unit) VALUES (?,?,?,?,?,?,?)', p);

  await conn.execute("INSERT IGNORE INTO counters (`key`,value) VALUES ('ticket',1001)");
  await conn.execute("INSERT IGNORE INTO counters (`key`,value) VALUES ('order',5001)");
  await conn.execute("INSERT IGNORE INTO counters (`key`,value) VALUES ('expense',1000)");
  console.log('Base de datos inicializada con datos de ejemplo');
}

function r2(n) { return Math.round(n * 100) / 100; }

async function nextId(key) {
  const [rows] = await pool.execute('SELECT value FROM counters WHERE `key` = ?', [key]);
  const val = rows.length ? rows[0].value : 1;
  await pool.execute('UPDATE counters SET value = value + 1 WHERE `key` = ?', [key]);
  return val;
}

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalido' }); }
}

// ===== AUTH =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { id, password } = req.body;
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? AND active = 1', [id]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar, color: user.color, can_dashboard: !!user.can_dashboard } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== PRODUCTS =====
app.get('/api/products', auth, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM products WHERE active = 1 ORDER BY category, name');
  res.json(rows);
});

app.put('/api/products/:id', auth, async (req, res) => {
  const fields = []; const vals = [];
  for (const k of ['name','category','barcode','price','cost','stock','unit']) {
    if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(req.body[k]); }
  }
  if (!fields.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, vals);
  res.json({ ok: true });
});

app.post('/api/products', auth, async (req, res) => {
  const { name, category, barcode, price, cost, stock, unit } = req.body;
  const [r] = await pool.execute('INSERT INTO products (name,category,barcode,price,cost,stock,unit) VALUES (?,?,?,?,?,?,?)', [name, category, barcode||'', price, cost, stock||0, unit||'pza']);
  res.json({ id: r.insertId });
});

app.delete('/api/products/:id', auth, async (req, res) => {
  await pool.execute('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/products/:id/stock', auth, async (req, res) => {
  await pool.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [req.body.qty, req.params.id]);
  res.json({ ok: true });
});

// ===== TRANSACTIONS =====
app.post('/api/transactions', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { items, method, cash_received, cash_amount, qr_amount, attended_by, order_id } = req.body;
    const subtotal = r2(items.reduce((s, i) => s + i.price * i.qty, 0));
    const tax = r2(subtotal * 0.13);
    const total = r2(subtotal + tax);
    const change_amount = method === 'Efectivo' ? r2((cash_received || 0) - total) : 0;
    const id = 'T-' + await nextId('ticket');

    await conn.execute(`INSERT INTO transactions (id,date,subtotal,tax,total,method,cash_received,cash_amount,qr_amount,change_amount,user_id,attended_by,order_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, new Date(), subtotal, tax, total, method, cash_received||total, cash_amount||0, qr_amount||0, change_amount, req.user.id, attended_by||'', order_id||null]);

    for (const i of items) {
      await conn.execute('INSERT INTO transaction_items (transaction_id,product_id,product_name,price,cost,qty) VALUES (?,?,?,?,?,?)', [id, i.product_id, i.product_name, i.price, i.cost, i.qty]);
      await conn.execute('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [i.qty, i.product_id]);
    }
    await conn.commit();
    res.json({ id, subtotal, tax, total, change_amount });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.get('/api/transactions', auth, async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  let q = 'SELECT * FROM transactions WHERE 1=1'; const p = [];
  if (from) { q += ' AND date >= ?'; p.push(from); }
  if (to) { q += ' AND date <= ?'; p.push(to); }
  q += ' ORDER BY date DESC LIMIT ?'; p.push(Number(limit));
  const [rows] = await pool.execute(q, p);
  res.json(rows);
});

// ===== EXPENSES =====
app.get('/api/expenses', auth, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM expenses ORDER BY date DESC');
  res.json(rows);
});

app.post('/api/expenses', auth, async (req, res) => {
  const { category, description, amount, date } = req.body;
  const id = 'E-' + await nextId('expense');
  await pool.execute('INSERT INTO expenses (id,date,category,description,amount) VALUES (?,?,?,?,?)', [id, date||new Date(), category, description, amount]);
  res.json({ id });
});

app.put('/api/expenses/:id', auth, async (req, res) => {
  const fields = []; const vals = [];
  for (const k of ['category','description','amount','date']) {
    if (req.body[k] !== undefined) { fields.push(`${k} = ?`); vals.push(req.body[k]); }
  }
  if (!fields.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.execute(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, vals);
  res.json({ ok: true });
});

app.delete('/api/expenses/:id', auth, async (req, res) => {
  await pool.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ===== ORDERS =====
app.get('/api/orders', auth, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM orders ORDER BY date DESC');
  res.json(rows);
});

app.post('/api/orders', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { items, client_name, client_phone, client_zone, client_addr, notes, transport_type, transport_cost, driver_id, attended_by } = req.body;
    const subtotal = r2(items.reduce((s, i) => s + i.price * i.qty, 0));
    const tax = r2(subtotal * 0.13);
    const total = r2(subtotal + tax + (transport_type === 'incluido' ? (transport_cost||0) : 0));
    const id = 'PED-' + await nextId('order');

    await conn.execute(`INSERT INTO orders (id,date,client_name,client_phone,client_zone,client_addr,notes,subtotal,tax,total,delivery_type,transport_type,transport_cost,driver_id,status,user_id,attended_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, new Date(), client_name, client_phone||'', client_zone||'', client_addr||'', notes||'', subtotal, tax, total, 'delivery', transport_type, transport_cost||0, driver_id||null, 'pendiente', req.user.id, attended_by||'']);

    for (const i of items) {
      await conn.execute('INSERT INTO order_items (order_id,product_id,product_name,price,cost,qty) VALUES (?,?,?,?,?,?)', [id, i.product_id, i.product_name, i.price, i.cost, i.qty]);
      await conn.execute('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [i.qty, i.product_id]);
    }
    await conn.commit();
    res.json({ id, subtotal, tax, total });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.put('/api/orders/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const order = rows[0];

    await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    if (status === 'entregado') {
      const id = 'T-' + await nextId('ticket');
      await conn.execute(`INSERT INTO transactions (id,date,subtotal,tax,total,method,cash_received,cash_amount,qr_amount,change_amount,user_id,attended_by,order_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, new Date(), order.subtotal, order.tax, order.total, 'QR', order.total, 0, order.total, 0, order.user_id, order.attended_by, order.id]);

      const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const i of items) {
        await conn.execute('INSERT INTO transaction_items (transaction_id,product_id,product_name,price,cost,qty) VALUES (?,?,?,?,?,?)', [id, i.product_id, i.product_name, i.price, i.cost, i.qty]);
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

// ===== DRIVERS =====
app.get('/api/drivers', auth, async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM drivers');
  res.json(rows);
});

// ===== DASHBOARD =====
app.get('/api/dashboard', auth, async (req, res) => {
  const { from, to } = req.query;
  const startDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const endDate = to || new Date().toISOString();

  const [[txStats]] = await pool.execute('SELECT COUNT(*) as totalTx, COALESCE(SUM(total),0) as totalRevenue, COALESCE(SUM(tax),0) as totalTax, COALESCE(SUM(subtotal),0) as totalSubtotal FROM transactions WHERE date >= ? AND date <= ?', [startDate, endDate]);
  const [[expStats]] = await pool.execute('SELECT COALESCE(SUM(amount),0) as totalExpenses FROM expenses WHERE date >= ? AND date <= ?', [startDate, endDate]);

  const [items] = await pool.execute('SELECT ti.product_name, SUM(ti.qty) as qty, SUM(ti.price * ti.qty) as revenue FROM transaction_items ti JOIN transactions t ON ti.transaction_id = t.id WHERE t.date >= ? AND t.date <= ? GROUP BY ti.product_name ORDER BY revenue DESC LIMIT 10', [startDate, endDate]);

  const [byUser] = await pool.execute('SELECT user_id, attended_by as name, COUNT(*) as tx, SUM(total) as revenue FROM transactions WHERE date >= ? AND date <= ? GROUP BY user_id, attended_by', [startDate, endDate]);

  const [byMethod] = await pool.execute('SELECT method, SUM(total) as total FROM transactions WHERE date >= ? AND date <= ? GROUP BY method', [startDate, endDate]);

  const [lowStock] = await pool.execute('SELECT COUNT(*) as c FROM products WHERE stock <= 10 AND active = 1');

  const totalCOGS = r2(txStats.totalSubtotal - txStats.totalTax) * 0.45;
  const grossProfit = r2(txStats.totalRevenue - txStats.totalTax - totalCOGS);
  const netProfit = r2(grossProfit - expStats.totalExpenses);

  res.json({ ...txStats, ...expStats, totalCOGS, grossProfit, netProfit, lowStock: lowStock[0].c, byUser, topProducts: items, byMethod });
});

// ===== EXCEL =====
app.post('/api/import/products', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subio archivo' });
  try {
    const wb = XLSX.readFile(req.file.path);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    let imported = 0;
    for (const row of data) {
      const name = row['Producto'] || row['producto'] || row['Nombre'] || '';
      if (!name) continue;
      const barcode = String(row['Codigo de Barras'] || row['barcode'] || row['Barcode'] || '');
      const price = parseFloat(row['Precio'] || row['precio'] || row['Price'] || 0);
      const cost = parseFloat(row['Costo'] || row['costo'] || row['Cost'] || 0);
      const stock = parseInt(row['Stock'] || row['stock'] || 0);
      const category = row['Categoria'] || row['categoria'] || 'Abarrotes';
      const unit = row['Unidad'] || row['unidad'] || 'pza';
      if (!price) continue;
      if (barcode) {
        const [existing] = await pool.execute('SELECT id FROM products WHERE barcode = ? AND active = 1', [barcode]);
        if (existing.length) { await pool.execute('UPDATE products SET name=?,price=?,cost=?,stock=? WHERE id=?', [name, price, cost, stock, existing[0].id]); imported++; continue; }
      }
      await pool.execute('INSERT INTO products (name,category,barcode,price,cost,stock,unit) VALUES (?,?,?,?,?,?,?)', [name, category, barcode, price, cost, stock, unit]);
      imported++;
    }
    fs.unlinkSync(req.file.path);
    res.json({ imported });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/export/excel', auth, async (req, res) => {
  const wb = XLSX.utils.book_new();
  const [txs] = await pool.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 500');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txs.map(t => ({ Ticket:t.id, Fecha:t.date, Metodo:t.method, Subtotal:+t.subtotal, IVA:+t.tax, Total:+t.total, Atiende:t.attended_by }))), 'Ingresos');

  const [exps] = await pool.execute('SELECT * FROM expenses ORDER BY date DESC');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exps.map(e => ({ ID:e.id, Fecha:e.date, Categoria:e.category, Descripcion:e.description, Monto:+e.amount }))), 'Egresos');

  const [prods] = await pool.execute('SELECT * FROM products WHERE active = 1 ORDER BY category, name');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prods.map(p => ({ ID:p.id, Producto:p.name, Categoria:p.category, 'Codigo de Barras':p.barcode, Precio:+p.price, Costo:+p.cost, Stock:p.stock, Unidad:p.unit }))), 'Inventario');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Paolitas_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  res.send(buf);
});

// ===== STATIC =====
app.use(express.static(path.join(__dirname, 'public')));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initDB().then(() => {
  app.listen(config.port || 3000, () => console.log(`Paolitas POS en puerto ${config.port || 3000}`));
}).catch(err => { console.error('Error DB:', err); process.exit(1); });
