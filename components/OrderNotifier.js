'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { api, POLL_INTERVAL } from '@/lib/apiClient';

const SOUND_KEY = 'nafilah_pos_sound_enabled';

// Notifikasi global (bunyi + notifikasi browser) saat ada pesanan baru masuk.
// Dipasang di app/layout.js supaya jalan di halaman mana pun (Kasir, Antrian,
// Menu, Laporan) — baik di HP maupun PC. Bunyinya di-generate langsung lewat
// Web Audio API (tidak perlu file suara), dan berhenti/nyala tersimpan di
// localStorage supaya tidak perlu diaktifkan ulang tiap buka halaman.
export default function OrderNotifier() {
  const [enabled, setEnabled] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const audioCtxRef = useRef(null);
  const knownIdsRef = useRef(null); // null = belum pernah load sama sekali
  const enabledRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_KEY) === 'true';
    setEnabled(stored);
    enabledRef.current = stored;
  }, []);

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function playSiren() {
    try {
      const ctx = ensureAudioContext();
      const now = ctx.currentTime;
      const duration = 3.2; // total durasi bunyi (detik)
      const low = 500; // Hz, nada rendah
      const high = 1100; // Hz, nada tinggi
      const cycles = 4; // jumlah naik-turun ("wee-oo wee-oo ...")
      const cycleDuration = duration / cycles;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      // envelope: fade in cepat, tahan, fade out di akhir
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.4, now + 0.08);
      gain.gain.setValueAtTime(0.4, now + duration - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // sapuan frekuensi naik-turun berulang, khas sirene
      osc.frequency.setValueAtTime(low, now);
      for (let i = 0; i < cycles; i++) {
        const cycleStart = now + i * cycleDuration;
        osc.frequency.linearRampToValueAtTime(high, cycleStart + cycleDuration / 2);
        osc.frequency.linearRampToValueAtTime(low, cycleStart + cycleDuration);
      }

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (err) {
      console.error('Gagal memutar bunyi notifikasi:', err);
    }
  }

  function showBrowserNotification(order) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification('Pesanan baru masuk', {
        body: order.order_number ? `Nota #${order.order_number}` : 'Ada pesanan baru masuk',
        icon: '/icon-192.png',
      });
    } catch (err) {
      console.error(err);
    }
  }

  function toggle() {
    if (enabled) {
      localStorage.setItem(SOUND_KEY, 'false');
      enabledRef.current = false;
      setEnabled(false);
      return;
    }
    // aktifkan dalam event klik langsung, supaya browser mengizinkan bunyi
    ensureAudioContext();
    playSiren();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    localStorage.setItem(SOUND_KEY, 'true');
    enabledRef.current = true;
    setEnabled(true);
    setJustEnabled(true);
    setTimeout(() => setJustEnabled(false), 2500);
  }

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const orders = await api.listOrders({ limit: 15 });
        if (!mounted) return;

        const currentIds = new Set(orders.map((o) => o.id));

        if (knownIdsRef.current === null) {
          // load pertama kali: cuma catat, jangan bunyi (biar tidak nyanyi
          // buat pesanan lama yang sudah ada sebelum halaman dibuka)
          knownIdsRef.current = currentIds;
          return;
        }

        const newOnes = orders.filter((o) => !knownIdsRef.current.has(o.id));
        knownIdsRef.current = currentIds;

        if (newOnes.length > 0 && enabledRef.current) {
          playSiren();
          newOnes.forEach(showBrowserNotification);
        }
      } catch (err) {
        console.error(err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 flex justify-end items-center gap-2">
        {justEnabled && (
          <span className="pointer-events-none text-[11px] font-bold text-white bg-stone-900 px-3 py-1.5 rounded-full shadow-md">
            Notifikasi suara aktif
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={enabled ? 'Matikan notifikasi suara' : 'Aktifkan notifikasi suara'}
          className={`pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${
            enabled ? 'bg-primary-500 text-stone-900' : 'bg-white text-stone-400'
          }`}
        >
          {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
    </div>
  );
}
