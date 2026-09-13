'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah, formatClock } from '@/lib/format';
import { STATUS, STATUS_CONFIG } from '@/lib/statusConfig';
import { rememberMyOrder } from '@/lib/myOrders';
import { CheckCircle2, Circle, MapPin, Store, XCircle } from 'lucide-react';
import Spinner from '@/components/Spinner';

// Urutan langkah yang ditampilkan ke pelanggan (beda dari alur staff —
// di sini cuma buat ditonton, bukan buat diklik/diproses).
const STEPS = [STATUS.MENUNGGU, STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

export default function LacakPesananPage({ params }) {
  const { id } = params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await api.getOrder(id);
        if (mounted) {
          setOrder(data);
          rememberMyOrder(id);
        }
      } catch (err) {
        if (mounted) setNotFound(true);
      }
      if (mounted) setLoading(false);
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="px-5 pt-10">
        <Spinner label="Memuat pesanan..." />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-stone-400 text-sm">Pesanan tidak ditemukan.</p>
        <a href="/pesan" className="inline-block mt-4 text-primary-700 font-bold text-sm">
          Kembali ke halaman pesan
        </a>
      </div>
    );
  }

  const isCancelled = order.status === STATUS.BATAL;
  const currentStepIndex = STEPS.indexOf(order.status);

  return (
    <div className="px-5 pt-5 pb-10">
      <div className="text-center mb-6">
        <p className="text-xs text-stone-400 font-bold tracking-widest uppercase">
          Nomor Pesanan
        </p>
        <p className="text-4xl font-extrabold text-stone-900 font-mono mt-1">
          #{order.order_number}
        </p>
        <p className="text-xs text-stone-400 mt-1">{formatClock(order.created_at)}</p>
      </div>

      {isCancelled ? (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex items-center gap-3 mb-6">
          <XCircle size={22} className="text-red-500 shrink-0" />
          <div>
            <p className="font-bold text-red-700 text-sm">Pesanan Dibatalkan</p>
            <p className="text-xs text-red-500 mt-0.5">
              Hubungi toko kalau ini bukan permintaan Anda.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 mb-6">
          {STEPS.map((step, idx) => {
            const config = STATUS_CONFIG[step];
            const done = idx <= currentStepIndex;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {done ? (
                    <CheckCircle2 size={22} className="text-primary-500" strokeWidth={2.5} />
                  ) : (
                    <Circle size={22} className="text-stone-200" />
                  )}
                  {!isLast && (
                    <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-primary-300' : 'bg-stone-100'}`} />
                  )}
                </div>
                <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                  <p
                    className={`text-sm font-bold ${done ? 'text-stone-900' : 'text-stone-300'}`}
                  >
                    {config.label}
                  </p>
                  {idx === currentStepIndex && !isLast && (
                    <p className="text-xs text-primary-600 font-semibold mt-0.5">Sedang berjalan</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 mb-6">
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-stone-700">
          {order.order_type === 'delivery' ? (
            <>
              <MapPin size={16} className="text-primary-600" /> Diantar
            </>
          ) : (
            <>
              <Store size={16} className="text-primary-600" /> Ambil di Toko
            </>
          )}
        </div>
        {order.customer_name && (
          <p className="text-sm text-stone-600 mb-1">
            <span className="text-stone-400">Nama:</span> {order.customer_name}
          </p>
        )}
        {order.order_type === 'delivery' && order.delivery_address && (
          <p className="text-sm text-stone-600">
            <span className="text-stone-400">Alamat:</span> {order.delivery_address}
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl p-5 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
        <p className="text-sm font-bold text-stone-700 mb-3">Detail Pesanan</p>
        <div className="space-y-1.5 mb-3">
          {order.items.map((it, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-stone-600">
                {it.name} x{it.qty}
              </span>
              <span className="text-stone-700 font-mono">{formatRupiah(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-stone-300 pt-3 flex justify-between font-extrabold text-stone-900">
          <span>Total</span>
          <span className="font-mono">{formatRupiah(order.total)}</span>
        </div>
      </div>

      <a
        href="/pesan"
        className="block text-center mt-6 text-sm font-bold text-primary-700"
      >
        Pesan Lagi
      </a>
    </div>
  );
}
