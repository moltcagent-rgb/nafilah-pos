'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';
import { formatRupiah, formatClock, formatDateShort } from '@/lib/format';
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from '@/lib/dateRange';
import { STATUS, STATUS_CONFIG } from '@/lib/statusConfig';
import { TrendingUp, ShoppingBag, Clock3, Ban, ListFilter, ChevronDown } from 'lucide-react';
import Spinner from '@/components/Spinner';

// Omset dihitung dari pesanan yang statusnya sudah lewat "menunggu bayar"
// (artinya sudah dikonfirmasi dibayar), dan bukan yang dibatalkan.
const PAID_STATUSES = [STATUS.DIPROSES, STATUS.SIAP, STATUS.SELESAI];

const PERIODS = [
  { key: 'hari', label: 'Hari Ini' },
  { key: 'minggu', label: 'Minggu Ini' },
  { key: 'bulan', label: 'Bulan Ini' },
  { key: 'custom', label: 'Kustom' },
];

// Opsi sortir untuk daftar Menu Terlaris (level agregat per nama menu).
const TOP_ITEM_SORTS = [
  { key: 'omset', label: 'Omset Tertinggi' },
  { key: 'jumlah', label: 'Jumlah Terjual' },
  { key: 'nama', label: 'Nama A-Z' },
];

// Opsi sortir untuk Detail Transaksi (level per baris item per pesanan) —
// ini yang memenuhi permintaan sortir per tanggal/hari, item, jumlah item,
// dan pengorder.
const TRANSACTION_SORTS = [
  { key: 'tanggal_desc', label: 'Tanggal Terbaru', by: 'tanggal', dir: -1 },
  { key: 'tanggal_asc', label: 'Tanggal Terlama', by: 'tanggal', dir: 1 },
  { key: 'pengorder_asc', label: 'Pengorder A-Z', by: 'pengorder', dir: 1 },
  { key: 'item_asc', label: 'Item A-Z', by: 'item', dir: 1 },
  { key: 'jumlah_desc', label: 'Jumlah Terbanyak', by: 'jumlah', dir: -1 },
  { key: 'total_desc', label: 'Total Terbesar', by: 'total', dir: -1 },
];

const PAGE_SIZE = 50;

function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LaporanPage() {
  const [period, setPeriod] = useState('hari');
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date()));
  const [customTo, setCustomTo] = useState(toInputDate(new Date()));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topItemSort, setTopItemSort] = useState('omset');
  const [transactionSort, setTransactionSort] = useState('tanggal_desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'hari') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'minggu') return { start: startOfWeek(now), end: endOfDay(now) };
    if (period === 'bulan') return { start: startOfMonth(now), end: endOfDay(now) };
    const start = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now);
    const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
    return { start, end };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setVisibleCount(PAGE_SIZE);

    async function load() {
      try {
        const data = await api.listOrders({
          from: range.start.toISOString(),
          to: range.end.toISOString(),
        });
        if (mounted) setOrders(data || []);
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
  }, [range]);

  const paidOrders = useMemo(
    () => orders.filter((o) => PAID_STATUSES.includes(o.status)),
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.BATAL).length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === STATUS.MENUNGGU).length,
    [orders]
  );

  const totalOmset = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalPesanan = paidOrders.length;
  const rataRata = totalPesanan > 0 ? Math.round(totalOmset / totalPesanan) : 0;

  const topItems = useMemo(() => {
    const map = new Map();
    paidOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const prev = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
        prev.qty += it.qty;
        prev.revenue += it.subtotal;
        map.set(it.name, prev);
      });
    });
    const arr = Array.from(map.values());
    if (topItemSort === 'jumlah') return arr.sort((a, b) => b.qty - a.qty);
    if (topItemSort === 'nama') return arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr.sort((a, b) => b.revenue - a.revenue);
  }, [paidOrders, topItemSort]);

  // Detail Transaksi: setiap pesanan dipecah jadi satu baris per item, supaya
  // bisa disortir per tanggal, per nama item, per jumlah item, atau per
  // nama pengorder — bukan cuma per pesanan.
  const transactionLines = useMemo(() => {
    const lines = [];
    orders.forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        lines.push({
          key: `${o.id}-${idx}`,
          order_number: o.order_number,
          created_at: o.created_at,
          customer_name: o.customer_name || 'Tanpa nama',
          item_name: it.name,
          qty: it.qty,
          subtotal: it.subtotal,
          status: o.status,
        });
      });
    });
    return lines;
  }, [orders]);

  const sortedLines = useMemo(() => {
    const sortConfig = TRANSACTION_SORTS.find((s) => s.key === transactionSort) || TRANSACTION_SORTS[0];
    const arr = [...transactionLines];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortConfig.by === 'tanggal') cmp = new Date(a.created_at) - new Date(b.created_at);
      else if (sortConfig.by === 'pengorder') cmp = a.customer_name.localeCompare(b.customer_name);
      else if (sortConfig.by === 'item') cmp = a.item_name.localeCompare(b.item_name);
      else if (sortConfig.by === 'jumlah') cmp = a.qty - b.qty;
      else if (sortConfig.by === 'total') cmp = a.subtotal - b.subtotal;
      return cmp * sortConfig.dir;
    });
    return arr;
  }, [transactionLines, transactionSort]);

  const visibleLines = sortedLines.slice(0, visibleCount);

  return (
    <div className="pb-8">
      <header className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Laporan Penjualan</h1>
        <p className="text-sm text-stone-400 mt-0.5">Omset dari pesanan yang sudah dibayar</p>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${
                period === p.key
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 mt-3">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 bg-stone-100 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        )}
      </header>

      <main className="px-5 pt-2 space-y-5">
        {loading ? (
          <Spinner label="Memuat laporan..." />
        ) : (
          <>
            <div className="bg-stone-900 rounded-[28px] p-6 text-white relative overflow-hidden animate-fade-in-up">
              <div className="w-11 h-11 rounded-2xl bg-primary-500 flex items-center justify-center mb-3">
                <TrendingUp size={20} className="text-stone-900" strokeWidth={2.5} />
              </div>
              <p className="text-xs text-white/60 font-semibold mb-1">Total Omset</p>
              <p className="text-4xl font-extrabold font-mono text-primary-400">
                {formatRupiah(totalOmset)}
              </p>
              <div className="flex justify-between mt-4 text-xs text-white/80 font-semibold">
                <span>{totalPesanan} pesanan</span>
                <span>Rata-rata {formatRupiah(rataRata)}/pesanan</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                  <Clock3 size={16} className="text-amber-600" />
                </div>
                <p className="text-xl font-extrabold text-stone-900 font-mono">{pendingCount}</p>
                <p className="text-[11px] text-stone-400 font-semibold">Menunggu Bayar</p>
              </div>
              <div className="bg-white rounded-3xl p-4 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-2">
                  <Ban size={16} className="text-red-500" />
                </div>
                <p className="text-xl font-extrabold text-stone-900 font-mono">{cancelledCount}</p>
                <p className="text-[11px] text-stone-400 font-semibold">Dibatalkan</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ShoppingBag size={13} /> Menu Terlaris
                </h2>
                <div className="relative">
                  <select
                    value={topItemSort}
                    onChange={(e) => setTopItemSort(e.target.value)}
                    className="appearance-none bg-stone-100 text-stone-600 text-[11px] font-bold pl-3 pr-7 py-1.5 rounded-full focus:outline-none"
                  >
                    {TOP_ITEM_SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                  />
                </div>
              </div>
              {topItems.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">
                  Belum ada penjualan di periode ini
                </p>
              ) : (
                <div className="space-y-2.5">
                  {topItems.map((it, idx) => (
                    <div
                      key={it.name}
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                      className="bg-white rounded-3xl p-3.5 flex items-center gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
                    >
                      <span className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-xs font-extrabold text-primary-700 font-mono">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{it.name}</p>
                        <p className="text-xs text-stone-400 font-medium">{it.qty} terjual</p>
                      </div>
                      <span className="text-sm font-extrabold text-stone-900 font-mono">
                        {formatRupiah(it.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-extrabold text-stone-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ListFilter size={13} /> Detail Transaksi
                </h2>
                <div className="relative">
                  <select
                    value={transactionSort}
                    onChange={(e) => setTransactionSort(e.target.value)}
                    className="appearance-none bg-stone-100 text-stone-600 text-[11px] font-bold pl-3 pr-7 py-1.5 rounded-full focus:outline-none"
                  >
                    {TRANSACTION_SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                  />
                </div>
              </div>

              {sortedLines.length === 0 ? (
                <p className="text-center text-stone-400 text-sm py-6">
                  Belum ada transaksi di periode ini
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-stone-400 font-semibold mb-2.5">
                    {sortedLines.length} baris transaksi
                  </p>
                  <div className="space-y-2">
                    {visibleLines.map((line, idx) => {
                      const config = STATUS_CONFIG[line.status];
                      return (
                        <div
                          key={line.key}
                          style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                          className="bg-white rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-[0_2px_14px_rgba(28,25,23,0.06)] border border-stone-50 animate-fade-in-up"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-extrabold font-mono text-stone-400">
                                #{line.order_number}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.color}`}
                              >
                                {config.shortLabel}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-stone-800 truncate">
                              {line.item_name}{' '}
                              <span className="text-stone-400 font-semibold">x{line.qty}</span>
                            </p>
                            <p className="text-xs text-stone-400 mt-0.5 truncate">
                              {line.customer_name} · {formatDateShort(line.created_at)},{' '}
                              {formatClock(line.created_at)}
                            </p>
                          </div>
                          <span className="text-sm font-extrabold text-stone-900 font-mono shrink-0">
                            {formatRupiah(line.subtotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {visibleCount < sortedLines.length && (
                    <button
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="w-full mt-3 py-3 rounded-2xl bg-stone-100 text-stone-600 text-xs font-bold"
                    >
                      Muat {Math.min(PAGE_SIZE, sortedLines.length - visibleCount)} transaksi lagi
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
