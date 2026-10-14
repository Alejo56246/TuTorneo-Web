/* ============================================================
   STORAGE — Capa de persistencia (localStorage)
   Simula una base de datos relacional.
============================================================ */

const DB = {
  get(key, def) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  /* --- Usuarios --- */
  users()       { return this.get('users', []); },
  saveUsers(u)  { this.set('users', u); },

  /* --- Competencias --- */
  comps()       { return this.get('comps', []); },
  saveComps(c)  { this.set('comps', c); },

  /* --- Sesión --- */
  session()       { return this.get('session', null); },
  saveSession(s)  { this.set('session', s); },
  clearSession()  { localStorage.removeItem('session'); }
};

/* ============================================================
   UTILIDADES GENERALES
============================================================ */

/** Genera un ID único corto */
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Escapa HTML para prevenir XSS */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Muestra una notificación tipo toast */
function toast(msg, ms = 2500) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Etiquetas legibles para formatos */
function labelFormato(f) {
  return {
    liga: 'Liga',
    grupos_eliminatorias: 'Grupos + Eliminatorias',
    eliminacion_directa: 'Eliminación directa'
  }[f] || f;
}