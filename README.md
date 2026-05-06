# Malzz Pedia — Top Up Game

Platform top up game dengan UI elegan dan sistem transaksi otomatis via VPedia API.

## Struktur File

```
malzz-pedia/
├── index.js          ← Server utama Express
├── setting.js        ← Konfigurasi global (API key, fee)
├── package.json      ← Dependencies
├── .env.example      ← Template environment variables
└── public/           ← Semua halaman HTML
    ├── style.css     ← CSS global (semua halaman)
    ├── index.html    ← Halaman beranda
    ├── topup.html    ← Halaman top up (pilih layanan)
    ├── payment.html  ← Halaman pembayaran
    ├── status.html   ← Cek status order
    ├── produk.html   ← Daftar produk publik
    ├── panduan.html  ← Panduan & FAQ
    ├── login.html    ← Login admin
    ├── admin.html    ← Panel admin (manajemen produk)
    └── mutasi.html   ← Riwayat transaksi admin
```

## Setup & Deploy

### 1. Install dependencies
```bash
npm install
```

### 2. Buat file .env
```bash
cp .env.example .env
# Edit .env dan isi semua nilai
```

### 3. Isi .env
```
MONGO_URI=mongodb+srv://...
VPEDIA_API_KEY=api_key_kamu
SESSION_SECRET=random_string_panjang
ADMIN_USERNAME=username_admin
ADMIN_PASSWORD=password_admin
FEE=0
```

### 4. Jalankan server
```bash
npm start        # Production
npm run dev      # Development (auto-restart)
```

## Halaman Publik

| URL          | Fungsi                      |
|--------------|-----------------------------|
| `/`          | Beranda dengan hero & produk |
| `/topup`     | Pilih layanan & top up      |
| `/payment`   | Detail pembayaran QRIS       |
| `/status`    | Cek status order             |
| `/products`  | Daftar semua produk          |
| `/panduan`   | Panduan & FAQ               |

## Halaman Admin

| URL       | Fungsi                           |
|-----------|----------------------------------|
| `/login`  | Login admin                      |
| `/admin`  | Manajemen produk (tambah/hapus)  |
| `/mutasi` | Riwayat & statistik transaksi    |

## Deploy ke Railway / Render / VPS

1. Push kode ke GitHub
2. Connect repo ke Railway/Render
3. Set environment variables sesuai `.env.example`
4. Deploy — selesai!

---

© 2025 Malzz Pedia
