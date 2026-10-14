/* ============================================================
   STATS — Cálculo de tablas de posiciones y estadísticas
============================================================ */

const Stats = {

  /* ---------- TABLA DE POSICIONES ---------- */
  tabla(equipos, partidos, cfg = {}) {
    const pv = cfg.puntosVictoria ?? 3;
    const pe = cfg.puntosEmpate ?? 1;

    const tabla = {};
    equipos.forEach(e => {
      tabla[e.id] = {
        id: e.id, nombre: e.nombre,
        PJ: 0, PG: 0, PE: 0, PP: 0,
        GF: 0, GC: 0, DIF: 0, PTS: 0
      };
    });

    partidos
      .filter(p => p.jugado && p.golesLocal !== null && p.golesVisitante !== null)
      .forEach(p => {
        const L = tabla[p.localId];
        const V = tabla[p.visitanteId];
        if (!L || !V) return;

        const gl = +p.golesLocal;
        const gv = +p.golesVisitante;

        L.PJ++; V.PJ++;
        L.GF += gl; L.GC += gv;
        V.GF += gv; V.GC += gl;

        if (gl > gv) {
          L.PG++; L.PTS += pv;
          V.PP++;
        } else if (gl < gv) {
          V.PG++; V.PTS += pv;
          L.PP++;
        } else {
          L.PE++; V.PE++;
          L.PTS += pe; V.PTS += pe;
        }
      });

    Object.values(tabla).forEach(t => t.DIF = t.GF - t.GC);

    return Object.values(tabla).sort((a, b) =>
      b.PTS - a.PTS ||
      b.DIF - a.DIF ||
      b.GF - a.GF ||
      a.nombre.localeCompare(b.nombre)
    );
  },

  /* ---------- ESTADÍSTICAS POR EQUIPO ---------- */
  statsEquipo(equipos, partidos) {
    return equipos.map(e => {
      const mis = partidos.filter(p =>
        p.jugado && (p.localId === e.id || p.visitanteId === e.id)
      );

      let gf = 0, gc = 0, victorias = 0;
      let mejor = null, peor = null;
      let racha = 0, rachaTipo = null;

      mis.forEach(p => {
        const esLocal = p.localId === e.id;
        const mg = esLocal ? +p.golesLocal : +p.golesVisitante;
        const rg = esLocal ? +p.golesVisitante : +p.golesLocal;
        const dif = mg - rg;

        gf += mg; gc += rg;
        if (dif > 0) victorias++;
        if (mejor === null || dif > mejor) mejor = dif;
        if (peor === null || dif < peor) peor = dif;
      });

      // Racha desde el último partido hacia atrás
      const ordenados = [...mis].sort((a, b) => a.jornada - b.jornada);
      for (let i = ordenados.length - 1; i >= 0; i--) {
        const p = ordenados[i];
        const esLocal = p.localId === e.id;
        const mg = esLocal ? +p.golesLocal : +p.golesVisitante;
        const rg = esLocal ? +p.golesVisitante : +p.golesLocal;
        const tipo = mg > rg ? 'G' : mg < rg ? 'P' : 'E';

        if (rachaTipo === null) { rachaTipo = tipo; racha = 1; }
        else if (tipo === rachaTipo) racha++;
        else break;
      }

      return {
        id: e.id,
        nombre: e.nombre,
        PJ: mis.length,
        victorias,
        pctVictorias: mis.length ? Math.round((victorias / mis.length) * 100) : 0,
        gfProm: mis.length ? (gf / mis.length).toFixed(2) : '0.00',
        gcProm: mis.length ? (gc / mis.length).toFixed(2) : '0.00',
        mejor, peor, racha, rachaTipo
      };
    });
  },

  /* ---------- CLASIFICADOS POR GRUPO ---------- */
  clasificadosPorGrupo(equipos, partidos, clasifican) {
    // Agrupar equipos por grupo (a partir de partidos)
    const grupos = {};
    partidos.forEach(p => {
      if (!p.grupo) return;
      if (!grupos[p.grupo]) grupos[p.grupo] = new Set();
      grupos[p.grupo].add(p.localId);
      grupos[p.grupo].add(p.visitanteId);
    });

    const resultado = [];
    Object.keys(grupos).sort().forEach(letra => {
      const ids = [...grupos[letra]];
      const equiposGrupo = equipos.filter(e => ids.includes(e.id));
      const tablaGrupo = this.tabla(equiposGrupo, partidos.filter(p => p.grupo === letra));
      resultado.push({
        grupo: letra,
        clasificados: tablaGrupo.slice(0, clasifican)
      });
    });
    return resultado;
  }
};