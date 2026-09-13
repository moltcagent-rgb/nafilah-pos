'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/apiClient';

// Tombol kecil buat staff keluar dari sesi (hapus cookie PIN). Ditaruh di
// pojok kiri atas supaya tidak bentrok dengan tombol notifikasi suara
// (OrderNotifier) yang ada di pojok kanan atas.
export default function StaffLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    if (!confirm('Keluar dari sesi staff?')) return;
    try {
      await api.staffLogout();
    } catch (err) {
      console.error(err);
    }
    router.push('/staff/login');
    router.refresh();
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 flex justify-start">
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Keluar dari sesi staff"
          className="pointer-events-auto w-10 h-10 rounded-full bg-white text-stone-400 flex items-center justify-center shadow-md"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
