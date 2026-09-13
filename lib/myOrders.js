// Pelanggan tidak perlu bikin akun — riwayat pesanan mereka sendiri cukup
// diingat lewat localStorage di browser/HP masing-masing. Cukup untuk skala
// 1 toko di 1 perumahan; kalau nanti butuh diakses lintas device, baru perlu
// login sungguhan.
const KEY = 'nafilah_pos_my_orders';
const MAX_REMEMBERED = 20;

export function rememberMyOrder(id) {
  if (typeof window === 'undefined') return;
  const ids = getMyOrderIds().filter((existing) => existing !== id);
  ids.unshift(id);
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX_REMEMBERED)));
}

export function getMyOrderIds() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
