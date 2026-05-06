require('./setting')
const express = require('express');
const axios = require('axios');
const { v4: uuid } = require('uuid');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

const VPEDIA_API_KEY = global.apikey;
const VPEDIA_BASE_URL = "https://khafatopup.my.id/h2h";
const feenya = global.feenya || 250;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://khafa:khafa120@cluster0.fbdbmwx.mongodb.net/?appName=Cluster0';

mongoose.connect(mongoURI).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.use(session({
  secret: process.env.SESSION_SECRET || 'malzz-pedia-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoURI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// === SCHEMAS ===
const productSchema = new mongoose.Schema({
  nama: { type: String, required: true },
  deks: String,
  fulldesk: String,
  imageurl: String,
  linkorder: String,
  tanggal: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

const transactionSchema = new mongoose.Schema({
  nominalDeposit: { type: Number, default: 0 },
  saldoDiterima: { type: Number, default: 0 },
  idDeposit: { type: String, required: true },
  statusDeposit: { type: String, default: 'menunggu_pembayaran' },
  hargaProduk: { type: Number, default: 0 },
  idOrder: String,
  statusOrder: { type: String, default: 'pending' },
  tujuan: { type: String, required: true },
  untung: { type: Number, default: 0 },
  internalTrxId: { type: String, required: true, unique: true },
  productCode: { type: String, required: true },
  tanggal: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// === MIDDLEWARE ===
function isLoggedIn(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}

// === ADMIN CREDENTIALS (env based) ===
const ADMIN_USER = process.env.ADMIN_USERNAME || 'kinzxxoffc';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'kinzxxoffc';

// === PAGES ===
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', isLoggedIn, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/mutasi', isLoggedIn, (req, res) => res.sendFile(path.join(__dirname, 'public', 'mutasi.html')));
app.get('/products', (req, res) => res.sendFile(path.join(__dirname, 'public', 'produk.html')));
app.get('/topup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'topup.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment.html')));
app.get('/panduan', (req, res) => res.sendFile(path.join(__dirname, 'public', 'panduan.html')));
app.get('/status', (req, res) => res.sendFile(path.join(__dirname, 'public', 'status.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// === AUTH ===
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = { username };
    return res.json({ success: true, message: 'Login berhasil' });
  }
  res.status(401).json({ success: false, message: 'Username/password salah' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true, message: 'Logout berhasil' }));
});

// === ADMIN API ===
app.get('/api/mutasi', isLoggedIn, async (req, res) => {
  try {
    const history = await Transaction.find({}).sort({ tanggal: -1 });
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil mutasi.' });
  }
});

// === PRODUK ===
app.post('/produk', isLoggedIn, async (req, res) => {
  try {
    const produk = new Product(req.body);
    const saved = await produk.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/produk', async (req, res) => {
  try {
    const data = await Product.find().sort({ tanggal: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/produk/:id', isLoggedIn, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === VPEDIA API ===
const vpediaAPI = axios.create({
  baseURL: VPEDIA_BASE_URL,
  headers: { 'X-APIKEY': VPEDIA_API_KEY }
});

app.get('/api/layanan', async (req, res) => {
  try {
    const response = await vpediaAPI.get('/layanan/price-list');
    if (response.data && response.data.success) {
      const layanan = response.data.data.map(item => {
        const originalPrice = parseFloat(item.price);
        const markup = Math.round(originalPrice * 1.014) + 200 + feenya;
        return { ...item, price: markup.toString() };
      });
      res.json({ success: true, data: layanan });
    } else {
      res.status(500).json({ success: false, message: 'Gagal mengambil layanan.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.post('/api/buat-transaksi', async (req, res) => {
  const { code, tujuan, price } = req.body;
  if (!code || !tujuan || !price) return res.status(400).json({ success: false, message: 'Parameter tidak lengkap.' });
  try {
    const internalTrxId = uuid();
    const depositResponse = await vpediaAPI.get(`/deposit/create?nominal=${price}`);
    if (depositResponse.data && depositResponse.data.success) {
      const depositData = depositResponse.data.data;
      const newTrx = new Transaction({ internalTrxId, idDeposit: depositData.id, tujuan, productCode: code });
      await newTrx.save();
      res.json({ success: true, internalTrxId, paymentDetails: depositData });
    } else {
      res.status(500).json({ success: false, message: depositResponse.data.message || 'Gagal membuat deposit.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/cek-status-deposit', async (req, res) => {
  const { trxId } = req.query;
  if (!trxId) return res.status(400).json({ success: false, message: 'ID tidak ditemukan.' });
  try {
    const dbTrx = await Transaction.findOne({ internalTrxId: trxId });
    if (!dbTrx) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    if (dbTrx.statusDeposit === 'success') return res.json({ depositStatus: 'success', orderId: dbTrx.idOrder });

    const statusRes = await vpediaAPI.get(`/deposit/status?id=${dbTrx.idDeposit}`);
    const depositStatus = statusRes.data?.data?.status || 'pending';
    dbTrx.statusDeposit = depositStatus;

    if (statusRes.data.success && depositStatus === 'success') {
      dbTrx.nominalDeposit = statusRes.data.data.nominal;
      dbTrx.saldoDiterima = statusRes.data.data.get_balance;
      const orderRes = await vpediaAPI.get(`/order/create?code=${dbTrx.productCode}&tujuan=${dbTrx.tujuan}`);
      if (orderRes.data && orderRes.data.success) {
        dbTrx.idOrder = orderRes.data.data.id;
        dbTrx.statusOrder = orderRes.data.data.status;
        res.json({ depositStatus: 'success', orderId: dbTrx.idOrder });
      } else {
        dbTrx.statusOrder = 'gagal_buat_order';
        res.json({ depositStatus: 'success', orderStatus: 'failed_creation', message: orderRes.data.message });
      }
    } else {
      res.json({ depositStatus });
    }
    await dbTrx.save();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/cek-status-order', async (req, res) => {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ success: false, message: 'ID Order tidak ada.' });
  try {
    const statusRes = await vpediaAPI.get(`/order/check?id=${orderId}`);
    const responseData = statusRes.data;
    if ((responseData.success || responseData.status === true) && responseData.data) {
      const orderData = responseData.data;
      const dbTrx = await Transaction.findOne({ idOrder: orderId });
      if (dbTrx) {
        const isFinalized = dbTrx.hargaProduk > 0;
        dbTrx.statusOrder = orderData.status;
        if (!isFinalized && (orderData.status === 'success' || orderData.status === 'failed')) {
          dbTrx.hargaProduk = parseFloat(orderData.price);
          if (dbTrx.saldoDiterima > 0) dbTrx.untung = dbTrx.saldoDiterima - dbTrx.hargaProduk;
        }
        await dbTrx.save();
      }
    }
    res.json(responseData);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server jalan di http://localhost:${PORT}`));
