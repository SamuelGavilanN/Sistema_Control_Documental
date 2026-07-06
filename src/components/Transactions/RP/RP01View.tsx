// src/components/Transactions/RP/RP01View.tsx
// Solo la función cargarInventario actualizada

const cargarInventario = async () => {
  setCargando(true);
  try {
    const resp = await fetch(API_URL + '/rp_inventario_empaques?select=*&order=creado_en.desc', { headers: HEADERS });
    const data = await resp.json();
    if (data && data.length > 0) {
      const empaquesConDatos = await Promise.all(data.map(async (empaque: any) => {
        const respBoms = await fetch(API_URL + '/rp_inventario_boms?select=*&empaque_id=eq.' + empaque.id + '&order=bom_sku.asc', { headers: HEADERS });
        const boms = await respBoms.json();
        const cantidadTotal = boms ? boms.reduce((s: number, b: any) => s + b.cantidad_maxima, 0) : 0;

        // Buscar TODAS las revisiones de RP02 para los BOMs de este empaque
        const bomsSku = boms ? boms.map((b: any) => b.bom_sku) : [];
        let todasRevisiones: any[] = [];
        
        if (bomsSku.length > 0) {
          // Buscar revisiones por cada BOM
          for (const sku of bomsSku) {
            const respRev = await fetch(
              API_URL + '/rp_documento_revisiones?select=*&bom_sku=eq.' + encodeURIComponent(sku) + '&origen=eq.CD01&order=creado_en.desc',
              { headers: HEADERS }
            );
            const revs = await respRev.json();
            if (revs && revs.length > 0) {
              todasRevisiones = [...todasRevisiones, ...revs];
            }
          }
        }

        // Calcular cantidad revisada por BOM
        const revisionesPorBOM: Record<string, number> = {};
        let idRevision = '-';
        let revisadoPor = '-';
        let revisadoEn = '-';
        
        todasRevisiones.forEach((r: any) => {
          if (!revisionesPorBOM[r.bom_sku]) revisionesPorBOM[r.bom_sku] = 0;
          revisionesPorBOM[r.bom_sku] += (r.cantidad_revisada || 0);
          
          if (r.documento_id) idRevision = r.documento_id;
          if (r.revisado_por) {
            // Intentar obtener nombre
          }
        });

        if (todasRevisiones.length > 0) {
          const ultima = todasRevisiones[todasRevisiones.length - 1];
          revisadoEn = new Date(ultima.creado_en).toLocaleString('es-CL');
          if (ultima.revisado_por) {
            try {
              const respUser = await fetch(API_URL + '/usuarios?select=nombre,apellido&id=eq.' + ultima.revisado_por, { headers: HEADERS });
              const userData = await respUser.json();
              if (userData && userData.length > 0) {
                revisadoPor = userData[0].nombre + ' ' + userData[0].apellido;
              }
            } catch (e) {}
          }
        }

        const cantidadRevisada = Object.values(revisionesPorBOM).reduce((s: number, v: number) => s + v, 0);
        const cantidadPendiente = Math.max(0, cantidadTotal - cantidadRevisada);

        // Marcar BOMs con su cantidad revisada
        const bomsConEstado = boms ? boms.map((bom: any) => {
          const cantidadRev = revisionesPorBOM[bom.bom_sku] || 0;
          return {
            ...bom,
            revisado: cantidadRev > 0,
            cantidad_revisada: cantidadRev,
            cantidad_pendiente: Math.max(0, bom.cantidad_maxima - cantidadRev)
          };
        }) : [];

        return {
          ...empaque,
          boms: bomsConEstado,
          cantidad_total: cantidadTotal,
          cantidad_revisada: cantidadRevisada,
          cantidad_pendiente: cantidadPendiente,
          id_revision: idRevision,
          revisado_por: revisadoPor,
          revisado_en: revisadoEn
        };
      }));
      setEmpaques(empaquesConDatos);
    } else {
      setEmpaques([]);
    }
    setCargando(false);
  } catch (e) {
    console.error('Error cargando inventario:', e);
    setCargando(false);
  }
};
