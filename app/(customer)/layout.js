// Layout untuk halaman pelanggan publik (Pesan, Lacak Pesanan, Pesanan Saya).
// Sengaja polos — tidak ada BottomNav staff, tidak ada notifikasi
// suara/sirene (itu semua cuma untuk staff, lihat app/(staff)/layout.js).
export default function CustomerLayout({ children }) {
  return <div className="pb-10">{children}</div>;
}
