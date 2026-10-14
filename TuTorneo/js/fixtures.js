/* ============================================================
   FIXTURES — Generadores de calendarios por formato
============================================================ */

const Fixtures = {

  /* ---------- ROUND ROBIN (todos contra todos) ---------- */
  roundRobin(teams, idaYVuelta = false) {
    const list = [...teams];
    if (list.length % 2) list.push(null); // "bye" si es impar

    const n = list.length;
    const rondas = n - 1;
    const mitad = n / 2;
    const partidos = [];

    for (let r = 0; r < rondas; r++) {
      for (let i = 0; i < mitad; i++) {
        const local = list[i];
        const visit = list[n - 1 - i];
        if (local && visit) {
          partidos.push({
            id: uid(),
            fase: 'Liga',
            jornada: r + 1,
            grupo: null,
            localId: local.id,
            visitanteId: visit.id,
            golesLocal: null,
            golesVisitante: null,
            jugado: false,
            penales: null
          });
        }
      }
      // rotar (manteniendo el primero fijo)
      list.splice(1, 0, list.pop());
    }

    if (idaYVuelta) {
      const vuelta = partidos.map(p => ({
        ...p,
        id: uid(),
        jornada: p.jornada + rondas,
        localId: p.visitanteId,
        visitanteId: p.localId
      }));
      return [...partidos, ...vuelta];
    }
    return partidos;
  },

  /* ---------- ELIMINACIÓN DIRECTA ---------- */
  eliminacionDirecta(teams, idaYVuelta = false) {
    const list = [...teams];

    // Rellenar hasta potencia de 2 con BYEs
    let size = 1;
    while (size < list.length) size *= 2;
    while (list.length < size) list.push(null);

    const nombresRonda = {
      2: 'Final',
      4: 'Semifinales',
      8: 'Cuartos de final',
      16: 'Octavos de final',
      32: 'Dieciseisavos'
    };

    const partidos = [];
    let rondaActual = list;
    let faseNum = 0;

    while (rondaActual.length > 1) {
      const fase = nombresRonda[rondaActual.length] || `Ronda ${rondaActual.length}`;
      const siguiente = [];

      for (let i = 0; i < rondaActual.length; i += 2) {
        const a = rondaActual[i];
        const b = rondaActual[i + 1];
        if (a && b) {
          partidos.push({
            id: uid(),
            fase,
            jornada: faseNum,
            grupo: null,
            localId: a.id,
            visitanteId: b.id,
            golesLocal: null,
            golesVisitante: null,
            jugado: false,
            penales: null
          });
        }
        siguiente.push(a || b); // avanza el que tiene BYE
      }
      rondaActual = siguiente;
      faseNum++;
    }
    return partidos;
  },

  /* ---------- GRUPOS + ELIMINATORIAS ---------- */
  gruposEliminatorias(teams, numGrupos = 2, clasifican = 2, idaYVuelta = false) {
    // Distribuir en grupos estilo "serpentina"
    const grupos = Array.from({ length: numGrupos }, () => []);
    teams.forEach((t, i) => grupos[i % numGrupos].push(t));

    const partidos = [];
    grupos.forEach((equipos, gi) => {
      const letra = String.fromCharCode(65 + gi);
      const rr = this.roundRobin(equipos, idaYVuelta);
      rr.forEach(p => partidos.push({
        ...p,
        fase: `Grupo ${letra}`,
        grupo: letra
      }));
    });

    // NOTA: los cruces de eliminatorias se generan cuando
    // finalizan todos los partidos de grupos (ver App.advanceToKnockout)
    return { partidos, grupos };
  },

  /* Genera cruces de eliminación a partir de clasificados */
  generarCruces(clasificados) {
    // clasificados: array de equipos {id, nombre}
    const partidos = [];
    for (let i = 0; i < clasificados.length; i += 2) {
      const a = clasificados[i];
      const b = clasificados[i + 1];
      if (a && b) {
        partidos.push({
          id: uid(),
          fase: 'Eliminatorias',
          jornada: 999,
          grupo: null,
          localId: a.id,
          visitanteId: b.id,
          golesLocal: null,
          golesVisitante: null,
          jugado: false,
          penales: null
        });
      }
    }
    return partidos;
  }
};