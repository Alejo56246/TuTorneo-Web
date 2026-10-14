/* ============================================================
   APP — Orquestación general, estado y eventos
============================================================ */

const App = {
  user: null,
  currentComp: null,
  currentTab: 'fixture',

  /* ============================================================
     INICIALIZACIÓN
  ============================================================ */
  init() {
    this.bindAuth();

    const u = Auth.current();
    if (u) this.enterApp(u);
  },

  /* ============================================================
     AUTENTICACIÓN
  ============================================================ */
  bindAuth() {
    const els = {
      email: document.getElementById('auth-email'),
      password: document.getElementById('auth-password'),
      submit: document.getElementById('auth-submit'),
      title: document.getElementById('auth-title'),
      subtitle: document.getElementById('auth-subtitle'),
      switch: document.getElementById('auth-switch'),
      switchText: document.getElementById('auth-switch-text'),
      error: document.getElementById('auth-error')
    };

    const updateMode = () => {
      const isLogin = Auth.mode === 'login';
      els.title.textContent = isLogin ? '🏆 TorneosApp' : '🏆 Crear cuenta';
      els.subtitle.textContent = isLogin
        ? 'Inicia sesión para gestionar tus torneos'
        : 'Regístrate gratis en segundos';
      els.submit.textContent = isLogin ? 'Iniciar sesión' : 'Registrarme';
      els.switchText.textContent = isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
      els.switch.textContent = isLogin ? 'Regístrate' : 'Inicia sesión';
      els.error.classList.add('hidden');
    };
    updateMode();

    els.switch.onclick = () => {
      Auth.mode = Auth.mode === 'login' ? 'register' : 'login';
      updateMode();
    };

    els.submit.onclick = async () => {
      els.error.classList.add('hidden');
      try {
        const email = els.email.value.trim().toLowerCase();
        const pwd = els.password.value;

        const user = Auth.mode === 'login'
          ? await Auth.login(email, pwd)
          : await Auth.register(email, pwd);

        DB.saveSession({ userId: user.id });
        this.enterApp(user);
      } catch (e) {
        els.error.textContent = e.message;
        els.error.classList.remove('hidden');
      }
    };

    els.password.onkeydown = e => {
      if (e.key === 'Enter') els.submit.click();
    };
  },

  enterApp(user) {
    this.user = user;

    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');
    document.getElementById('user-email').textContent = user.email;

    document.getElementById('btn-logout').onclick = () => {
      Auth.logout();
      location.reload();
    };

    document.getElementById('btn-new-comp').onclick = () => this.openCompForm();
    document.getElementById('btn-back').onclick = () => this.showProjects();
    document.getElementById('btn-finish-comp').onclick = () => this.finishComp();
    document.getElementById('btn-edit-comp').onclick = () => this.openCompForm(this.currentComp);

    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        ['fixture', 'posiciones', 'stats'].forEach(k => {
          document.getElementById('tab-' + k).classList.toggle('hidden', k !== this.currentTab);
        });
        if (this.currentComp) this.renderDetail();
      };
    });

    this.showProjects();
  },

  /* ============================================================
     PROYECTOS
  ============================================================ */
  myComps() {
    return DB.comps().filter(c => c.userId === this.user.id);
  },

  showProjects() {
    document.getElementById('view-projects').classList.remove('hidden');
    document.getElementById('view-detail').classList.add('hidden');
    this.currentComp = null;

    UI.renderProjects(this.myComps(), {
      open: id => this.openComp(this.getComp(id)),
      dup:  id => this.duplicateComp(this.getComp(id)),
      del:  id => {
        if (!confirm('¿Eliminar esta competencia?')) return;
        DB.saveComps(DB.comps().filter(c => c.id !== id));
        toast('Competencia eliminada');
        this.showProjects();
      },
      arch: id => {
        const comps = DB.comps();
        const c = comps.find(x => x.id === id);
        c.estado = c.estado === 'archivada' ? 'en_curso' : 'archivada';
        DB.saveComps(comps);
        this.showProjects();
      }
    });
  },

  getComp(id) {
    return DB.comps().find(c => c.id === id);
  },

  saveComp(comp) {
    const comps = DB.comps();
    const idx = comps.findIndex(c => c.id === comp.id);
    if (idx >= 0) comps[idx] = comp;
    else comps.push(comp);
    DB.saveComps(comps);
    this.currentComp = comp;
  },

  duplicateComp(comp) {
    if (!comp) return;
    const copy = JSON.parse(JSON.stringify(comp));
    copy.id = uid();
    copy.nombre = comp.nombre + ' (copia)';
    copy.createdAt = new Date().toISOString();
    copy.estado = 'en_curso';
    copy.partidos.forEach(p => {
      p.jugado = false;
      p.golesLocal = null;
      p.golesVisitante = null;
    });
    const comps = DB.comps();
    comps.push(copy);
    DB.saveComps(comps);
    toast('Competencia duplicada');
    this.showProjects();
  },

  /* ============================================================
     CREAR / EDITAR COMPETENCIA
  ============================================================ */
  openCompForm(editComp = null) {
    UI.openCompForm({
      comp: editComp,
      onCancel: () => {},
      onSave: data => {
        let comp;

        if (editComp) {
          comp = { ...editComp, ...data };
          // Regenerar fixture solo si cambió formato o equipos
          const formatoCambio = editComp.formato !== data.formato;
          const equiposCambio =
            JSON.stringify(editComp.equipos) !== JSON.stringify(data.equipos);
          if (formatoCambio || equiposCambio) {
            comp.partidos = this.generarFixture(comp);
          }
        } else {
          comp = {
            id: uid(),
            userId: this.user.id,
            nombre: data.nombre,
            deporte: data.deporte,
            formato: data.formato,
            config: data.config,
            equipos: data.equipos,
            partidos: [],
            estado: 'en_curso',
            createdAt: new Date().toISOString()
          };
          comp.partidos = this.generarFixture(comp);
        }

        this.saveComp(comp);
        toast(editComp ? 'Competencia actualizada' : 'Competencia creada');
        this.openComp(comp);
      }
    });
  },

  generarFixture(comp) {
    const { formato, equipos, config } = comp;

    if (formato === 'liga') {
      return Fixtures.roundRobin(equipos, config.idaYVuelta);
    }
    if (formato === 'eliminacion_directa') {
      return Fixtures.eliminacionDirecta(equipos, config.idaYVuelta);
    }
    if (formato === 'grupos_eliminatorias') {
      const { partidos } = Fixtures.gruposEliminatorias(
        equipos,
        config.numGrupos || 2,
        config.clasificanPorGrupo || 2,
        config.idaYVuelta
      );
      return partidos;
    }
    return [];
  },

  /* ============================================================
     ABRIR COMPETENCIA
  ============================================================ */
  openComp(comp) {
    if (!comp) return;
    this.currentComp = comp;

    document.getElementById('view-projects').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');

    document.getElementById('detail-name').textContent = comp.nombre;
    document.getElementById('detail-meta').textContent =
      `${comp.deporte} · ${labelFormato(comp.formato)} · ${comp.equipos.length} equipos`;

    this.renderDetail();
  },

  renderDetail() {
    const comp = this.currentComp;
    if (!comp) return;

    if (this.currentTab === 'fixture') {
      UI.renderFixture(comp, (matchId, gl, gv) => this.onScoreChange(matchId, gl, gv));
    } else if (this.currentTab === 'posiciones') {
      UI.renderPosiciones(comp);
    } else if (this.currentTab === 'stats') {
      UI.renderStats(comp);
    }
  },

  /* ============================================================
     CARGAR RESULTADO
  ============================================================ */
  onScoreChange(matchId, gl, gv) {
    const comp = this.currentComp;
    const match = comp.partidos.find(p => p.id === matchId);
    if (!match) return;

    const glNum = gl === '' ? null : Math.max(0, parseInt(gl, 10));
    const gvNum = gv === '' ? null : Math.max(0, parseInt(gv, 10));

    match.golesLocal = glNum;
    match.golesVisitante = gvNum;
    match.jugado = glNum !== null && gvNum !== null;

    this.saveComp(comp);

    // Re-render solo de la pestaña actual para feedback inmediato
    if (this.currentTab === 'fixture') {
      this.renderDetail();
    }
  },

  /* ============================================================
     FINALIZAR COMPETENCIA
  ============================================================ */
  finishComp() {
    const comp = this.currentComp;
    if (!comp) return;
    if (!confirm('¿Marcar esta competencia como finalizada?')) return;
    comp.estado = 'finalizada';
    this.saveComp(comp);
    toast('Competencia finalizada');
    this.showProjects();
  }
};

/* ============================================================
   ARRANQUE
============================================================ */
document.addEventListener('DOMContentLoaded', () => App.init());