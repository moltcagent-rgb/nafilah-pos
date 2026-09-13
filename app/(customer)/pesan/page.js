'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah } from '@/lib/format';
import { STATUS } from '@/lib/statusConfig';
import { rememberMyOrder } from '@/lib/myOrders';
import { Plus, Minus, ShoppingBag, X, Search, ImageOff, ClipboardList } from 'lucide-react';
import Spinner from '@/components/Spinner';

export default function PesanPage() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({}); // { menuItemId: qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState('pickup'); // 'pickup' | 'delivery'
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await api.listMenuItems();
        if (mounted) setMenuItems(data || []);
      } catch (err) {
        console.error(err);
      }
      if (mounted) setLoading(false);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category || 'Lainnya'));
    return ['Semua', ...Array.from(set)];
  }, [menuItems]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter(
      (m) =>
        m.is_available &&
        (activeCategory === 'Semua' || m.category === activeCategory) &&
        (q === '' || m.name.toLowerCase().includes(q))
    );
  }, [menuItems, activeCategory, query]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menuItems.find((m) => m.id === id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean);
  }, [cart, menuItems]);

  const cartTotal = cartLines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  function addToCart(id) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  function decFromCart(id) {
    setCart((c) => {
      const next = { ...c };
      const qty = (next[id] || 0) - 1;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const canSubmit =
    cartLines.length > 0 &&
    customerName.trim() !== '' &&
    (orderType === 'pickup' || address.trim() !== '');

  async function submitOrder() {
    if (!canSubmit) return;
    setSubmitting(true);

    const items = cartLines.map((l) => ({
      menu_item_id: l.id,
      name: l.name,
      price: l.price,
      qty: l.qty,
      subtotal: l.price * l.qty,
    }));

    try {
      const order = await api.createOrder({
        customer_name: customerName.trim(),
        phone: phone.trim() || null,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? address.trim() : null,
        items,
        total: cartTotal,
        status: STATUS.MENUNGGU,
      });
      rememberMyOrder(order.id);
      router.push(`/lacak/${order.id}`);
    } catch (err) {
      alert('Gagal membuat pesanan: ' + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Pesan Online</h1>
            <p className="text-sm text-stone-400 mt-0.5">Ambil di toko atau diantar ke rumah</p>
          </div>
          <a
            href="/pesanan-saya"
            className="shrink-0 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center"
            aria-label="Pesanan Saya"
          >
            <ClipboardList size={18} className="text-stone-500" />
          </a>
        </div>

        <div className="relative mt-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu..."
            className="w-full bg-stone-100 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-500 text-stone-900 shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 pt-2 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2">
            <Spinner label="Memuat menu..." />
          </div>
        )}
        {!loading && visibleItems.length === 0 && (
          <p className="col-span-2 text-center text-stone-400 text-sm py-10">
            Menu tidak ditemukan.
          </p>
        )}
        {visibleItems.map((item, idx) => {
          const qty = cart[item.id] || 0;
          return (
            <div
              key={item.id}
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              className="bg-white rounded-3xl overflow-hidden flex flex-col shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
            >
              <div className="w-full aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageOff size={26} className="text-stone-300" />
                )}
              </div>
              <div className="p-3.5 flex flex-col flex-1">
                <span className="inline-block self-start text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 rounded-full px-2 py-0.5 mb-2">
                  {item.category}
                </span>
                <p className="font-bold text-sm text-stone-900 leading-snug mb-3">{item.name}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-extrabold text-stone-900 font-mono">
                    {formatRupiah(item.price)}
                  </span>
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item.id)}
                      className="w-9 h-9 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center active:scale-90 transition-transform shadow-sm"
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-stone-900 rounded-full pl-1 pr-1 py-1">
                      <button
                        onClick={() => decFromCart(item.id)}
                        className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                        aria-label={`Kurangi ${item.name}`}
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center font-mono text-white">
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(item.id)}
                        className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                        aria-label={`Tambah ${item.name}`}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-5 right-5 max-w-md mx-auto bg-stone-900 text-white rounded-full py-4 px-5 flex items-center justify-between shadow-ticket z-40 animate-slide-up active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2.5 text-sm font-bold">
            <span className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center">
              <ShoppingBag size={14} strokeWidth={2.5} />
            </span>
            {cartCount} item
          </span>
          <span className="font-extrabold font-mono text-primary-400">
            {formatRupiah(cartTotal)}
          </span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-xl text-stone-900">Pesanan Anda</h2>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-stone-800">{l.name}</p>
                    <p className="text-xs text-stone-400 font-mono">
                      {formatRupiah(l.price)} x {l.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-stone-900 rounded-full pl-1 pr-1 py-1">
                    <button
                      onClick={() => decFromCart(l.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="text-sm w-4 text-center font-mono text-white">{l.qty}</span>
                    <button
                      onClick={() => addToCart(l.id)}
                      className="w-7 h-7 rounded-full bg-primary-500 text-stone-900 flex items-center justify-center"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOrderType('pickup')}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold border transition-colors ${
                  orderType === 'pickup'
                    ? 'bg-primary-500 border-primary-500 text-stone-900'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                Ambil di Toko
              </button>
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`flex-1 rounded-2xl py-3 text-sm font-bold border transition-colors ${
                  orderType === 'delivery'
                    ? 'bg-primary-500 border-primary-500 text-stone-900'
                    : 'bg-white border-stone-200 text-stone-500'
                }`}
              >
                Diantar
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Nama Anda"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <input
                type="tel"
                placeholder="No. HP / WhatsApp (opsional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {orderType === 'delivery' && (
                <div>
                  <textarea
                    placeholder="Alamat lengkap (blok/no. rumah di dalam perumahan)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-stone-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                  <p className="text-[11px] text-stone-400 mt-1.5 px-1">
                    Pengiriman saat ini hanya untuk area dalam perumahan.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-5">
              <span className="text-stone-500 text-sm font-semibold">Total</span>
              <span className="font-extrabold text-2xl text-stone-900 font-mono">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting || !canSubmit}
              className="w-full bg-primary-500 text-stone-900 rounded-2xl py-4 font-extrabold text-sm disabled:opacity-60 btn-shine"
            >
              {submitting ? 'Mengirim Pesanan...' : 'Pesan Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
