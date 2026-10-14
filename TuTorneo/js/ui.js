/* ============================================================
   UI — Render de pantallas, modales y componentes visuales
============================================================ */

const UI = {

  /* ============================================================
     LISTA DE PROYECTOS
  ============================================================ */
  renderProjects(comps, handlers) {
    const cont = document.getElementById('projects-list');

    if (!comps.length) {
      cont.innerHTML = `
        <div class="card empty" style="grid-column:1/-1">
          <div class="empty-icon">🏟️</div>
          <h3>No tienes competencias aún</h3>
          <p class="muted">Crea tu primera competencia para empezar</p>
        </div>`;
      return;
    }

    cont.innerHTML = comps.map(c => {
      const jugados = c.partidos.filter(p => p.jugado).length;
      const total = c.partidos.length;
      return `
        <div class="card" data-id="${c.id}">
          <div class="row space-between mb-8">
            <h3>${esc(c.nombre)}</h3>
            <span class="badge badge-${c.estado}">${c.estado.replace('_', ' ')}</span>
          </div>
          <p class="muted mb-8">${esc(c.deporte)} · ${labelFormato(c.formato)}</p>
          <p class="muted mb-8" style="font-size:12px">
            ${c.equipos.length} equipos · ${jugados}/${total} partidos jugados
          </p>
          <p class="muted mb-12" style="font-size:12px">
            Creado: ${new Date(c.createdAt).toLocaleDateString('es-AR')}
          </p>
          <div class="row">
            <button class="btn-primary btn-sm" data-act="open">Abrir</button>
            <button class="btn-ghost btn-sm" data-act="dup">Duplicar</button>
            <button class="btn-ghost btn-sm" data-act="arch">
              ${c.estado === 'archivada' ? 'Reactivar' : 'Archivar'}
            </button>
            <button class="btn-danger btn-sm" data-act="del">Eliminar</button>
          </div>
        </div>`;
    }).join('');

    cont.querySelectorAll('[data-act]').forEach(btn => {
      btn.onclick = e => {
        const id = e.target.closest('.card').dataset.id;
        const act = e.target.dataset.act;
        handlers[act](id);
      };
    });
  },

  /* ============================================================
     MODAL — Crear / Editar competencia
  ============================================================ */
  openCompForm({ comp, onSave, onCancel }) {
    const editing = !!comp;
    const c = comp || {
      nombre: '',
      deporte: 'Fútbol',
      formato: 'liga',
      config: { idaYVuelta: false, numGrupos: 2, clasificanPorGrupo: 2 },
      equipos: []
    };

    const equiposTmp = JSON.parse(JSON.stringify(c.equipos));

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>${editing ? 'Editar' : 'Crear'} competencia</h2>

        <div class="field">
          <label>Nombre del torneo</label>
          <input id="f-nombre" value="${esc(c.nombre)}" placeholder="Ej: Liga 2025" />
        </div>

        <div class="grid grid-2">
          <div class="field">
            <label>Deporte</label>
            <select id="f-deporte">
              ${['Fútbol', 'Básquet', 'Vóley', 'Tenis', 'Handball', 'Rugby', 'Otro']
                .map(d => `<option ${d === c.deporte ? 'selected' : ''}>${d}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label>Formato</label>
            <select id="f-formato">
              <option value="liga" ${c.formato === 'liga' ? 'selected' : ''}>Liga (todos contra todos)</option>
              <option value="grupos_eliminatorias" ${c.formato === 'grupos_eliminatorias' ? 'selected' : ''}>Grupos + Eliminatorias</option>
              <option value="eliminacion_directa" ${c.formato === 'eliminacion_directa' ? 'selected' : ''}>Eliminación directa</option>
            </select>
          </div>
        </div>

        <div id="cfg-liga" class="field ${c.formato !== 'liga' ? 'hidden' : ''}">
          <label>
            <input type="checkbox" id="f-ida" ${c.config.idaYVuelta ? 'checked' : ''}
                   style="width:auto;margin-right:6px">
            Ida y vuelta
          </label>
        </div>

        <div id="cfg-grupos" class="grid grid-2 ${c.formato !== 'grupos_eliminatorias' ? 'hidden' : ''}">
          <div class="field">
            <label>Cantidad de grupos</label>
            <input type="number" id="f-ngrupos" min="2" max="8" value="${c.config.numGrupos || 2}">
          </div>
          <div class="field">
            <label>Clasifican por grupo</label>
            <input type="number" id="f-clasif" min="1" max="4" value="${c.config.clasificanPorGrupo || 2}">
          </div>
        </div>

        <div class="field">
          <label>Equipos participantes</label>
          <div id="teams-list"></div>
          <button class="btn-ghost btn-sm" id="btn-add-team" style="margin-top:8px">+ Agregar equipo</button>
        </div>

        <div class="row" style="justify-content:flex-end;margin-top:16px">
          <button class="btn-ghost" id="btn-cancel">Cancelar</button>
          <button class="btn-primary" id="btn-save">
            ${editing ? 'Guardar cambios' : 'Crear competencia'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('modal-root').appendChild(modal);

    /* --- Render dinámico de equipos --- */
    const renderTeams = () => {
      const cont = modal.querySelector('#teams-list');
      cont.innerHTML = equiposTmp.map((eq, i) => `
        <div class="team-item">
          <input data-idx="${i}" value="${esc(eq.nombre)}" placeholder="Nombre del equipo" />
          <button class="btn-danger btn-sm" data-del="${i}">✕</button>
        </div>
      `).join('') || '<p class="muted">Agrega al menos 2 equipos</p>';

      cont.querySelectorAll('input').forEach(inp => {
        inp.oninput = e => {
          equiposTmp[+e.target.dataset.idx].nombre = e.target.value;
        };
      });
      cont.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = () => {
          equiposTmp.splice(+btn.dataset.del, 1);
          renderTeams();
        };
      });
    };

    const addTeam = () => {
      equiposTmp.push({ id: uid(), nombre: '' });
      renderTeams();
    };

    modal.querySelector('#btn-add-team').onclick = addTeam;
    if (!equiposTmp.length) { addTeam(); addTeam(); } else renderTeams();

    /* --- Mostrar/ocultar config según formato --- */
    const formatoSel = modal.querySelector('#f-formato');
    const toggleCfg = () => {
      const f = formatoSel.value;
      modal.querySelector('#cfg-liga').classList.toggle('hidden', f !== 'liga');
      modal.querySelector('#cfg-grupos').classList.toggle('hidden', f !== 'grupos_eliminatorias');
    };
    formatoSel.onchange = toggleCfg;

    /* --- Cancelar --- */
    modal.querySelector('#btn-cancel').onclick = () => {
      modal.remove();
      onCancel?.();
    };

    /* --- Guardar --- */
    modal.querySelector('#btn-save').onclick = () => {
      const nombre = modal.querySelector('#f-nombre').value.trim();
      const deporte = modal.querySelector('#f-deporte').value;
      const formato = formatoSel.value;
      const idaYVuelta = modal.querySelector('#f-ida').checked;
      const numGrupos = +modal.querySelector('#f-ngrupos').value;
      const clasificanPorGrupo = +modal.querySelector('#f-clasif').value;

      if (!nombre) return alert('Ingresa un nombre');
      const equiposLimpios = equiposTmp
        .map(e => ({ id: e.id, nombre: e.nombre.trim() }))
        .filter(e => e.nombre);
      if (equiposLimpios.length < 2) return alert('Necesitas al menos 2 equipos');

      modal.remove();
      onSave({
        nombre, deporte, formato,
        config: { idaYVuelta, numGrupos, clasificanPorGrupo },
        equipos: equiposLimpios
      });
    };
  },

  /* ============================================================
     DETALLE — Fixture / Resultados
  ============================================================ */
  renderFixture(comp, onScoreChange) {
    const cont = document.getElementById('tab-fixture');

    if (!comp.partidos.length) {
      cont.innerHTML = `
        <div class="card empty">
          <div class="empty-icon">📅</div>
          <p>Esta competencia no tiene partidos generados</p>
        </div>`;
      return;
    }

    // Agrupar por fase + jornada
    const grupos = {};
    comp.partidos.forEach(p => {
      const key = p.grupo ? `Grupo ${p.grupo}` : p.fase;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(p);
    });

    cont.innerHTML = Object.entries(grupos).map(([fase, partidos]) => `
      <div class="card mb-16">
        <h3 class="mb-12">${esc(fase)}</h3>
        ${partidos.map(p => {
          const local = comp.equipos.find(e => e.id === p.localId);
          const visit = comp.equipos.find(e => e.id === p.visitanteId);
          return `
            <div class="match ${p.jugado ? 'finished' : ''}" data-id="${p.id}">
              <div class="team-name">${esc(local?.nombre || '?')}</div>
              <div class="score">
                <input type="number" min="0" data-side="local" value="${p.golesLocal ?? ''}" placeholder="-">
                <span>-</span>
                <input type="number" min="0" data-side="visit" value="${p.golesVisitante ?? ''}" placeholder="-">
              </div>
              <div class="team-name right">${esc(visit?.nombre || '?')}</div>
            </div>`;
        }).join('')}
      </div>
    `).join('');

    cont.querySelectorAll('.match input').forEach(inp => {
      inp.onchange = e => {
        const matchEl = e.target.closest('.match');
        const id = matchEl.dataset.id;
        const gl = matchEl.querySelector('[data-side="local"]').value;
        const gv = matchEl.querySelector('[data-side="visit"]').value;
        onScoreChange(id, gl, gv);
      };
    });
  },

  /* ============================================================
     DETALLE — Tabla de posiciones
  ============================================================ */
  renderPosiciones(comp) {
    const cont = document.getElementById('tab-posiciones');

    if (!comp.partidos.some(p => p.jugado)) {
      cont.innerHTML = `
        <div class="card empty">
          <div class="empty-icon">📊</div>
          <p>Sin resultados cargados todavía</p>
        </div>`;
      return;
    }

    // Si hay grupos, mostrar una tabla por grupo
    const hayGrupos = comp.partidos.some(p => p.grupo);

    if (hayGrupos) {
      const grupos = [...new Set(comp.partidos.filter(p => p.grupo).map(p => p.grupo))];
      cont.innerHTML = grupos.map(letra => {
        const ids = new Set();
        comp.partidos.filter(p => p.grupo === letra)
          .forEach(p => { ids.add(p.localId); ids.add(p.visitanteId); });
        const equiposGrupo = comp.equipos.filter(e => ids.has(e.id));
        const tabla = Stats.tabla(equiposGrupo, comp.partidos.filter(p => p.grupo === letra), comp.config);
        return `
          <div class="card mb-16">
            <h3 class="mb-12">Grupo ${letra}</h3>
            ${this._tablaHTML(tabla)}
          </div>`;
      }).join('');
    } else {
      const tabla = Stats.tabla(comp.equipos, comp.partidos, comp.config);
      cont.innerHTML = `<div class="card">${this._tablaHTML(tabla)}</div>`;
    }
  },

  _tablaHTML(tabla) {
    return `
      <table>
        <thead>
          <tr>
            <th>#</th><th>Equipo</th>
            <th class="text-center">PJ</th>
            <th class="text-center">PG</th>
            <th class="text-center">PE</th>
            <th class="text-center">PP</th>
            <th class="text-center">GF</th>
            <th class="text-center">GC</th>
            <th class="text-center">DIF</th>
            <th class="text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          ${tabla.map((t, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${esc(t.nombre)}</td>
              <td class="text-center">${t.PJ}</td>
              <td class="text-center">${t.PG}</td>
              <td class="text-center">${t.PE}</td>
              <td class="text-center">${t.PP}</td>
              <td class="text-center">${t.GF}</td>
              <td class="text-center">${t.GC}</td>
              <td class="text-center">${t.DIF > 0 ? '+' : ''}${t.DIF}</td>
              <td class="text-center"><strong>${t.PTS}</strong></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  },

  /* ============================================================
     DETALLE — Estadísticas
  ============================================================ */
  renderStats(comp) {
    const cont = document.getElementById('tab-stats');

    if (!comp.partidos.some(p => p.jugado)) {
      cont.innerHTML = `
        <div class="card empty">
          <div class="empty-icon">📈</div>
          <p>Carga resultados para ver estadísticas</p>
        </div>`;
      return;
    }

    const stats = Stats.statsEquipo(comp.equipos, comp.partidos)
      .sort((a, b) => b.pctVictorias - a.pctVictorias);

    const maxPct = Math.max(...stats.map(s => s.pctVictorias), 1);

    cont.innerHTML = `
      <div class="card mb-16">
        <h3 class="mb-12">📊 % de victorias</h3>
        ${stats.map(s => `
          <div class="chart-row">
            <div class="bar-label">${esc(s.nombre)}</div>
            <div class="stats-bar" style="width:${(s.pctVictorias / maxPct) * 100}%"></div>
            <div class="bar-value">${s.pctVictorias}%</div>
          </div>
        `).join('')}
      </div>

      <div class="card mb-16">
        <h3 class="mb-12">⚽ Promedio de goles a favor</h3>
        ${[...stats].sort((a, b) => b.gfProm - a.gfProm).map(s => `
          <div class="chart-row">
            <div class="bar-label">${esc(s.nombre)}</div>
            <div class="stats-bar" style="width:${Math.min(s.gfProm * 20, 100)}%"></div>
            <div class="bar-value">${s.gfProm}</div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h3 class="mb-12">📋 Detalle por equipo</h3>
        <table>
          <thead>
            <tr>
              <th>Equipo</th>
              <th class="text-center">PJ</th>
              <th class="text-center">Victorias</th>
              <th class="text-center">% Vict.</th>
              <th class="text-center">GF prom</th>
              <th class="text-center">GC prom</th>
              <th class="text-center">Mejor</th>
              <th class="text-center">Peor</th>
              <th class="text-center">Racha</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(s => `
              <tr>
                <td>${esc(s.nombre)}</td>
                <td class="text-center">${s.PJ}</td>
                <td class="text-center">${s.victorias}</td>
                <td class="text-center"><strong>${s.pctVictorias}%</strong></td>
                <td class="text-center">${s.gfProm}</td>
                <td class="text-center">${s.gcProm}</td>
                <td class="text-center">${s.mejor ?? '-'}</td>
                <td class="text-center">${s.peor ?? '-'}</td>
                <td class="text-center">${s.racha ? `${s.racha}${s.rachaTipo}` : '-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};