import BottomNav from '@/components/BottomNav';
import OrderNotifier from '@/components/OrderNotifier';
import StaffLogoutButton from '@/components/StaffLogoutButton';

// Layout khusus halaman staff (Kasir, Antrian, Menu, Laporan). BottomNav dan
// notifikasi suara/sirene cuma dipasang di sini — supaya pelanggan yang buka
// halaman pemesanan publik (grup (customer)) TIDAK melihat menu navigasi
// staff atau kebisingan notifikasi tiap ada pesanan masuk.
// Akses ke halaman-halaman ini sendiri dijaga oleh middleware.js (PIN staff).
export default function StaffLayout({ children }) {
  return (
    <div className="pb-24">
      {children}
      <StaffLogoutButton />
      <OrderNotifier />
      <BottomNav />
    </div>
  );
}
