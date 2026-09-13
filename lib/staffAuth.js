// Dipakai bareng oleh app/api/staff/login/route.js dan middleware.js.
// Pakai Web Crypto API (bukan modul 'crypto' Node) supaya jalan baik di
// runtime Node (API routes) maupun Edge (middleware).
const COOKIE_NAME = 'staff_auth';

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Token yang disimpan di cookie — turunan dari PIN + garam tetap, BUKAN
// PIN itu sendiri, supaya PIN asli tidak pernah tersimpan di cookie browser.
export async function computeStaffToken(pin) {
  return sha256Hex(`nafilah-staff-v1:${pin}`);
}

export { COOKIE_NAME };
