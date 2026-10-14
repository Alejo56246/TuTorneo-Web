/* ============================================================
   AUTH — Registro, login y sesión
   En producción: usar bcrypt en backend + JWT.
   Aquí: hash SHA-256 en el cliente (demo educativa).
============================================================ */

const Auth = {
  mode: 'login', // 'login' | 'register'

  /** Hash seguro (demo). En backend usar bcrypt + salt por usuario. */
  async hashPassword(pwd) {
    const data = new TextEncoder().encode(pwd + '::torneos-salt');
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async register(email, password) {
    if (!email || !password) throw new Error('Completa todos los campos');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email inválido');

    const users = DB.users();
    if (users.find(u => u.email === email))
      throw new Error('Ese email ya está registrado');

    const user = {
      id: uid(),
      email,
      passwordHash: await this.hashPassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    DB.saveUsers(users);
    return user;
  },

  async login(email, password) {
    const users = DB.users();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Usuario no encontrado');

    const hash = await this.hashPassword(password);
    if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta');
    return user;
  },

  current() {
    const s = DB.session();
    if (!s) return null;
    return DB.users().find(u => u.id === s.userId) || null;
  },

  logout() {
    DB.clearSession();
  }
};