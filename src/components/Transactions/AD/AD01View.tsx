import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { auth } from '../../../lib/auth';
import * as XLSX from 'xlsx';
import './AD01.css';

interface Auditoria {
  id: string;
  numero_tarea: string;
  codigo_local: string;
  nombre_local: string;
  acta: string;
  guia: string;
  usuario_asignado: string;
  estado: string;
  creado_en: string;
}

const AD01View: React.FC = () => {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nombresUsuarios, setNombresUsuarios] = useState<Record<string, string>>({});
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [archivoSAP, setArchivoSAP] = useState<File | null>(null);
  const [archivoCorreo, setArchivoCorreo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { cargarAuditorias(); cargarUsuarios(); }, []);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('usuarios').select('id, nombre, apellido, rol');
    if (data) {
      setUsuarios(data);
      const m: Record<string, string> = {};
      data.forEach((u: any) => { m[u.id] = `${u.nombre} ${u.apellido}`; });
      setNombresUsuarios(m);
    }
  };

  const cargarAuditorias = async () => {
    setCargando(true);
    const { data } = await supabase.from('ad_auditorias').select('*').order('creado_en', { ascending: false });
    if (data) setAuditorias(data);
    setCargando(false);
  };

  const procesarArchivos = async () => {
    if (!archivoSAP || !archivoCorreo) { alert('Selecciona ambos archivos'); return; }
    setProcesando(true);

    try {
      // Leer archivo SAP
      const dataSAP = await leerExcel(archivoSAP);
      // Leer archivo Correo
      const dataCorreo = await leerExcel(archivoCorreo);

      // Crear mapa de correo: Despacho HC -> { acta, guia }
      const mapaCorreo: Record<string, { acta: string; guia: string }> = {};
      dataCorreo.forEach((row: any) => {
        const despacho = String(row['Despacho HC'] || '').trim();
        if (despacho) {
          mapaCorreo[despacho] = {
            acta: String(row['Acta'] || '').trim(),
            guia: String(row['Guía'] || row['Guia'] || '').trim()
          };
        }
      });

      // Agrupar datos SAP por Destinat. (código local)
      const grupos: Record<string, { nombre: string; entregas: Set<string>; items: any[] }> = {};
      dataSAP.forEach((row: any) => {
        const codLocal = String(row['Destinat.'] || '').trim();
        const nombreLocal = String(row['Nombre destinatario de mercancías'] || '').trim();
        const entrega = String(row['Entrega'] || '').trim();
        if (!codLocal) return;

        if (!grupos[codLocal]) grupos[codLocal] = { nombre: nombreLocal, entregas: new Set(), items: [] };
        grupos[codLocal].entregas.add(entrega);
        grupos[codLocal].items.push(row);
      });

      // Crear auditorías por cada local
      for (const [codLocal, grupo] of Object.entries(grupos)) {
        // Obtener acta y guía del primer entrega que tenga coincidencia
        let acta = ''; let guia = '';
        for (const entrega of grupo.entregas) {
          if (mapaCorreo[entrega]) {
            acta = mapaCorreo[entrega].acta;
            guia = mapaCorreo[entrega].guia;
            break;
          }
        }

        // Crear auditoría
        const { data: tarea } = await supabase.rpc('generar_numero_auditoria');
        const numeroTarea = tarea as string;

        const { data: auditoria, error: auditError } = await supabase.from('ad_auditorias').insert([{
          numero_tarea: numeroTarea, codigo_local: codLocal, nombre_local: grupo.nombre,
          acta, guia, estado: 'Pendiente', creado_por: auth.getUsuario()?.id
        }]).select('id').single();

        if (auditError || !auditoria) continue;

        // Insertar datos SAP
        const itemsInsert = grupo.items.map((item: any) => ({
          auditoria_id: (auditoria as any).id,
          entrega: String(item['Entrega'] || '').trim(),
          denominacion: String(item['Denominación'] || '').trim(),
          codigo_local: codLocal,
          nombre_local: grupo.nombre,
          sku: String(item['Material'] || '').trim(),
          cantidad_sap: parseInt(item['Cantidad entrega']) || 0
        }));

        await supabase.from('ad_datos_sap').insert(itemsInsert);
      }

      setMensaje('Auditorías creadas exitosamente');
      setTimeout(() => { setMensaje(''); setShowCrearModal(false); }, 2000);
      cargarAuditorias();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcesando(false);
    }
  };

  const leerExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleAsignar = async (auditoriaId: string, usuarioId: string) => {
    await supabase.from('ad_auditorias').update({ usuario_asignado: usuarioId || null }).eq('id', auditoriaId);
    cargarAuditorias();
  };

  const getEstadoBadge = (e: string) => {
    switch (e) {
      case 'Pendiente': return { color: '#b45309', bg: '#fef3c7' };
      case 'En Proceso': return { color: '#1d4ed8', bg: '#dbeafe' };
      case 'Finalizado': return { color: '#15803d', bg: '#dcfce7' };
      case 'Con Diferencias': return { color: '#dc2626', bg: '#fef2f2' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <div className="ad01-view">
      <div className="ad01-header">
        <h2>Gestión de Auditorías</h2>
        <button className="ed01-btn-save" onClick={() => setShowCrearModal(true)}>+ Nueva Auditoría</button>
      </div>

      <div className="ed03-tabla-container">
        <table className="ed03-tabla">
          <thead>
            <tr>
              <th>Tarea</th><th>Tienda</th><th>Acta</th><th>Guía</th><th>Asignado</th><th>Estado</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Cargando...</td></tr> :
              auditorias.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Sin auditorías</td></tr> :
              auditorias.map(a => {
                const eb = getEstadoBadge(a.estado);
                return (
                  <tr key={a.id}>
                    <td className="ed03-ticket-id">{a.numero_tarea}</td>
                    <td>{a.codigo_local} - {a.nombre_local}</td>
                    <td>{a.acta || '-'}</td>
                    <td>{a.guia || '-'}</td>
                    <td>
                      <select value={a.usuario_asignado || ''} onChange={e => handleAsignar(a.id, e.target.value)} style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <option value="">Sin asignar</option>
                        {usuarios.filter(u => u.rol === 'Auditor' || u.rol === 'Admin' || u.rol === 'Owner').map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
                      </select>
                    </td>
                    <td><span style={{ background: eb.bg, color: eb.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>{a.estado}</span></td>
                    <td>{new Date(a.creado_en).toLocaleDateString('es-CL')}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {showCrearModal && (
        <div className="ed01-modal-overlay" onClick={() => setShowCrearModal(false)}>
          <div className="ed01-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="ed01-modal-header"><h2>Nueva Auditoría</h2><button className="ed01-modal-close" onClick={() => setShowCrearModal(false)}>×</button></div>
            <div className="ed01-modal-body">
              <div className="ed01-field"><label>Archivo BD SAP (.xlsx)</label><input type="file" accept=".xlsx,.xls" onChange={e => setArchivoSAP(e.target.files?.[0] || null)} /></div>
              <div className="ed01-field"><label>Archivo Correo (.xlsx)</label><input type="file" accept=".xlsx,.xls" onChange={e => setArchivoCorreo(e.target.files?.[0] || null)} /></div>
              {mensaje && <div style={{ padding: '10px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontSize: '13px' }}>{mensaje}</div>}
            </div>
            <div className="ed01-modal-footer">
              <button className="ed01-btn-cancel" onClick={() => setShowCrearModal(false)}>Cancelar</button>
              <button className="ed01-btn-save" onClick={procesarArchivos} disabled={procesando}>{procesando ? 'Procesando...' : 'Crear Auditorías'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AD01View;