'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah, formatClock } from '@/lib/format';
import { STATUS_CONFIG } from '@/lib/statusConfig';
import { getMyOrderIds } from '@/lib/myOrders';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import Spinner from '@/components/Spinner';

export default function PesananSayaPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const ids = getMyOrderIds();
      if (ids.length === 0) {
        if (mounted) {
          setOrders([]);
          setLoading(false);
        }
        return;
      }
      try {
        const results = await Promise.all(
          ids.map((id) => api.getOrder(id).catch(() => null))
        );
        if (mounted) setOrders(results.filter(Boolean));
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

  return (
    <div className="px-5 pt-5 pb-10">
      <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Pesanan Saya</h1>
      <p className="text-sm text-stone-400 mt-0.5 mb-5">
        Riwayat pesanan dari HP/browser ini
      </p>

      {loading && <Spinner label="Memuat riwayat..." />}

      {!loading && orders.length === 0 && (
        <div className="text-center py-14">
          <ShoppingBag size={32} className="text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm mb-4">Belum ada pesanan dari device ini.</p>
          <a
            href="/pesan"
            className="inline-block bg-primary-500 text-stone-900 rounded-2xl px-5 py-2.5 font-bold text-sm"
          >
            Mulai Pesan
          </a>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const config = STATUS_CONFIG[order.status];
          return (
            <a
              key={order.id}
              href={`/lacak/${order.id}`}
              className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-extrabold font-mono text-stone-900">
                    #{order.order_number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}
                  >
                    {config.shortLabel}
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  {formatClock(order.created_at)} · {formatRupiah(order.total)}
                </p>
              </div>
              <ChevronRight size={18} className="text-stone-300 shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
