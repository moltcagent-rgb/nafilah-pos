# Nafilah POS

Aplikasi kasir + pemesanan online untuk kedai Nafilah. Sekarang ada **2 sisi**:

- **Staff** — Kasir, Antrian, Menu, Laporan (dikunci PIN, cuma buat internal)
- **Pelanggan** — halaman pemesanan publik mirip Grab Food, khusus lingkup perumahan (bisa disebar linknya ke pelanggan)

Berbasis web (Next.js), database **Turso** (SQLite di cloud, diakses lewat HTTP).

## Struktur URL

| URL | Untuk siapa | Isi |
|---|---|---|
| `/pesan` | **Pelanggan** | Browse menu, order (ambil di toko / diantar) |
| `/lacak/[id]` | **Pelanggan** | Lacak status pesanan tertentu secara live |
| `/pesanan-saya` | **Pelanggan** | Riwayat pesanan dari HP/browser yang sama |
| `/staff/login` | Staff | Masuk pakai PIN |
| `/` | Staff (terkunci) | Kasir — buat pesanan manual untuk pelanggan yang datang langsung |
| `/antrian` | Staff (terkunci) | Kelola status semua pesanan (masuk → diproses → siap → selesai) |
| `/menu` | Staff (terkunci) | CRUD menu, harga, foto |
| `/laporan` | Staff (terkunci) | Rekap omset |

**Link yang disebar ke pelanggan cukup `/pesan`** — misal
`https://nafilah-pos.vercel.app/pesan`. Halaman `/`, `/antrian`, `/menu`,
`/laporan` otomatis terkunci PIN, jadi aman kalau pelanggan iseng coba buka
alamat lain.

## Alur pesanan pelanggan

```
Pelanggan buka /pesan → pilih menu → checkout
   (isi nama, no HP, pilih Ambil di Toko / Diantar + alamat)
        │
        ▼  otomatis masuk ke antrian staff, status: Menunggu Bayar
Pelanggan diarahkan ke /lacak/[id] — bisa pantau live tanpa perlu refresh
        │
        ▼
Staff proses di halaman Antrian seperti biasa (Diproses → Siap → Selesai)
        │
        ▼
Pelanggan lihat status "Selesai" di halaman lacak, atau dihubungi lewat
no HP yang tadi diisi untuk koordinasi pengantaran/pengambilan
```

Alur pesanan **staff** (input manual di Kasir untuk pelanggan yang datang
langsung ke toko) tetap sama seperti sebelumnya.

## Keamanan — WAJIB dibaca sebelum sebar link ke pelanggan

Karena sekarang linknya bakal dipegang orang luar, halaman staff dikunci PIN
lewat `middleware.js` + cookie. **Supaya proteksi ini aktif, wajib set
environment variable `STAFF_PIN`** — kalau kosong, halaman staff TIDAK
terkunci sama sekali (dianggap mode development).

- Lokal: isi `STAFF_PIN=...` di `.env.local`
- Vercel: tambahkan `STAFF_PIN` di **Settings → Environment Variables**

PIN yang sama dipakai semua staff (tidak ada akun per-orang) — cukup untuk
skala 1 toko. Ganti PIN kapan saja lewat env var, staff lama otomatis perlu
login ulang.

## Setup database Turso (kolom baru)

Kalau database Turso Anda sudah pernah di-setup sebelumnya (sebelum fitur
pemesanan pelanggan ini), tambahkan kolom baru secara manual:

```bash
turso db shell nafilah-pos "ALTER TABLE orders ADD COLUMN phone TEXT;"
turso db shell nafilah-pos "ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'pickup';"
turso db shell nafilah-pos "ALTER TABLE orders ADD COLUMN delivery_address TEXT;"
```

(Kalau ini instalasi baru dari nol, cukup `turso db shell nafilah-pos < turso/schema.sql` seperti biasa — kolom-kolom ini sudah termasuk di skema.)

## Jalankan di komputer

```bash
npm install
cp .env.local.example .env.local
```

Isi `.env.local`:
```
TURSO_DATABASE_URL=libsql://nama-database-anda.turso.io
TURSO_AUTH_TOKEN=isi-token-dari-turso
STAFF_PIN=1234
```

```bash
npm run dev
```

- Buka `http://localhost:3000/pesan` untuk coba sisi pelanggan.
- Buka `http://localhost:3000/` untuk sisi staff — akan diarahkan ke
  `/staff/login`, masukkan PIN yang tadi diisi di `.env.local`.

## Deploy ke Vercel

Sama seperti sebelumnya (push ke GitHub → import di Vercel), tambahkan
environment variables:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `STAFF_PIN`

Setelah deploy:
1. Coba akses `/` dari browser mode Incognito → harus otomatis diarahkan ke `/staff/login`. Kalau tidak, cek lagi `STAFF_PIN` sudah ke-set di Vercel.
2. Login pakai PIN, cek semua halaman staff normal.
3. Buka `/pesan` di Incognito lain (mensimulasikan pelanggan) → pastikan bisa order tanpa diminta PIN.

## Arsitektur

```
Browser Pelanggan (/pesan, /lacak, /pesanan-saya)
   │  fetch() — tanpa perlu login
   ▼
Browser Staff (/, /antrian, /menu, /laporan)
   │  fetch() — perlu cookie staff_auth (dari PIN)
   ▼
middleware.js — cek cookie sebelum lolos ke halaman/API staff
   │
   ▼
Next.js API routes (app/api/menu, app/api/orders, app/api/staff)
   │  @libsql/client (HTTP)
   ▼
Turso (SQLite di cloud)
```

- `middleware.js` — pintu gerbang: cek PIN untuk halaman & API staff, biarkan lewat untuk halaman & API pelanggan.
- `lib/staffAuth.js` — hash PIN jadi token cookie (PIN asli tidak pernah disimpan di cookie).
- `lib/db.js` — koneksi Turso + semua query SQL.
- `lib/apiClient.js` — helper `fetch()` dipakai semua halaman (staff & pelanggan).
- `lib/myOrders.js` — riwayat pesanan pelanggan disimpan di localStorage HP masing-masing (tanpa perlu akun/login pelanggan).

### Struktur folder halaman

```
app/
  layout.js                    → shell global (logo, font) — dipakai semua halaman
  (staff)/                     → grup route staff (folder ini TIDAK muncul di URL)
    layout.js                    → tambahan BottomNav + notifikasi suara + tombol logout
    page.js                       → Kasir  →  URL: /
    antrian/page.js                → URL: /antrian
    menu/page.js                    → URL: /menu
    laporan/page.js                  → URL: /laporan
  (customer)/                  → grup route pelanggan (folder ini juga tidak muncul di URL)
    layout.js                    → shell polos, tanpa BottomNav staff
    pesan/page.js                  → URL: /pesan
    lacak/[id]/page.js              → URL: /lacak/xxxxx
    pesanan-saya/page.js             → URL: /pesanan-saya
  staff/login/page.js           → URL: /staff/login (di luar grup, harus bisa diakses sebelum login)
  api/
    menu/, orders/                → endpoint dipakai staff & pelanggan (dibedakan lewat middleware)
    staff/login/, staff/logout/     → verifikasi PIN
middleware.js                    → penjaga akses (di root project, sejajar folder app/)
```

## Rencana pengembangan lanjutan (kalau nanti ajak UMKM lain)

Struktur saat ini sengaja dipisah rapi antara "sisi pelanggan" dan "sisi
staff" supaya nanti gampang dikembangkan jadi multi-penjual:
- Tambah tabel `vendors` (nama toko, PIN staff masing-masing, dll)
- Tambah kolom `vendor_id` di `menu_items` dan `orders`
- Halaman `/pesan` jadi menampilkan pilihan toko dulu sebelum menu
- Tiap toko login staff dengan PIN masing-masing, cuma lihat pesanan tokonya sendiri

Belum diimplementasikan sekarang (sesuai keputusan: fokus toko Nafilah dulu),
tapi arsitektur `middleware.js` + pemisahan grup route ini dirancang supaya
perluasan itu tidak perlu bongkar ulang dari nol.

## Ide pengembangan lain

- **Cetak struk ke printer thermal** — integrasi Web Bluetooth.
- **WhatsApp notifikasi ke pelanggan** — kirim update status lewat WA API pihak ketiga (Fonnte, dll), pakai nomor HP yang sudah tersimpan di setiap pesanan.
- **Ongkir otomatis** — saat ini pengiriman diasumsikan gratis/flat dalam 1 perumahan; kalau butuh hitung ongkir, bisa ditambah field harga kirim.
