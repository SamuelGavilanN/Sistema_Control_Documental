// src/components/Transactions/SD/SD01CargaExcel.tsx

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { auth } from '../../../lib/auth';

const API_URL = 'https://jeabsljwaghhyxjpaslv.supabase.co/rest/v1';
const HEADERS: any = {
  'apikey': 'sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G',
  'Authorization': 'Bearer sb_publishable_hZdYQky0f9owzRFCIn4VxA_VB8cQ-1G'
};

interface SD01CargaExcelProps {
  onClose: () => void;
  onTransportesCreados: () => void;
}

const generarIdDocumento = () => {
  const ahora = new Date();
  const dia = String(ahora.getDate()).padStart(2, '0');
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const anio = ahora.getFullYear();
  const random = String(Math.floor(Math.random() * 90000) + 10000);
  return 'SD' + dia + mes + anio + random;
};

const SD01CargaExcel: React.FC<SD01CargaExcelProps> = ({ onClose, onTransportesCreados }) => {
  const [archivo, setArchivo]: any = useState(null);
  const [archivoNombre, setArchivoNombre]: any = useState('');
  const [procesando, setProcesando]: any = useState(false);
  const [mensaje, setMensaje]: any = useState({ tipo: '', texto: '' });
  const [resumen, setResumen]: any = useState(null);
  const fileInputRef: any = useRef(null);
  const usuario: any = auth.getUsuario();

  const extraerFechaDeNombre = (nombre: string): string | null => {
    const fechaMatch = nombre.match(/(\d{2}-\d{2}-\d{4})/);
    if (!fechaMatch) return null;
    const partesFecha = fechaMatch[1].split('-');
    return partesFecha[2] + '-' + partesFecha[1] + '-' + partesFecha[0];
  };

  const procesarArchivo = async () => {
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Seleccione un archivo' });
      return;
    }

    setProcesando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const fechaProgramacion = extraerFechaDeNombre(archivoNombre);
      if (!fechaProgramacion) {
        setMensaje({ tipo: 'error', texto: 'No se pudo extraer la fecha del nombre del archivo. Formato esperado: ... DD-MM-YYYY ...' });
        setProcesando(false);
        return;
      }

      const data = await archivo.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 3) {
        setMensaje({ tipo: 'error', texto: 'El archivo no tiene datos suficientes' });
        setProcesando(false);
        return;
      }

      const headers = rows[2];
      const dataRows = rows.slice(3);

      // Buscar columnas
      const colCodTI = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('cód ti'));
      const colTienda = headers.findIndex((h: string) => {
        if (!h) return false;
        const header = h.toString().toLowerCase().trim();
        return header === 'tienda' || header.includes('tienda');
      });
      const colBultos = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('bultos'));
      const colConductor = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('conductor'));
      const colVehiculo = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('vehículo'));
      const colFechaEntrega = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('fecha entrega'));
      const colHoraEntrega = headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('hora entrega'));

      if (colCodTI < 0) {
        setMensaje({ tipo: 'error', texto: 'Columna Cód TI no encontrada' });
        setProcesando(false);
        return;
      }

      // Agrupar filas por transporte
      const transportes: any[] = [];
      let transporteActual: any = null;

      for (const row of dataRows) {
        if (!row || row.length === 0) {
          if (transporteActual && transporteActual.locales.length > 0) {
            transportes.push(transporteActual);
          }
          transporteActual = null;
          continue;
        }

        const codTI = String(row[colCodTI] || '').trim();
        const tienda = colTienda >= 0 ? String(row[colTienda] || '').trim() : '';
        const conductor = colConductor >= 0 ? String(row[colConductor] || '').trim() : '';
        const vehiculo = colVehiculo >= 0 ? String(row[colVehiculo] || '').trim() : '';
        const bultos = colBultos >= 0 ? parseInt(row[colBultos]) || 0 : 0;
        const fechaEntrega = colFechaEntrega >= 0 ? String(row[colFechaEntrega] || '').trim() : '';
        const horaEntrega = colHoraEntrega >= 0 ? String(row[colHoraEntrega] || '').trim() : '';

        if (!codTI) {
          if (transporteActual && transporteActual.locales.length > 0) {
            transportes.push(transporteActual);
          }
          transporteActual = null;
          continue;
        }

        if (!transporteActual) {
          transporteActual = {
            conductor,
            vehiculo,
            fechaProgramacion,
            locales: []
          };
        }

        transporteActual.locales.push({
          codigo_local: codTI,
          nombre_local: tienda,
          bultos,
          fechaEntrega,
          horaEntrega
        });
      }

      if (transporteActual && transporteActual.locales.length > 0) {
        transportes.push(transporteActual);
      }

      if (transportes.length === 0) {
        setMensaje({ tipo: 'error', texto: 'No se encontraron transportes para crear' });
        setProcesando(false);
        return;
      }

      setResumen({
        fechaProgramacion,
        totalTransportes: transportes.length,
        totalLocales: transportes.reduce((s: number, t: any) => s + t.locales.length, 0),
        totalBultos: transportes.reduce((s: number, t: any) => s + t.locales.reduce((ss: number, l: any) => ss + l.bultos, 0), 0),
        transportes
      });

      setMensaje({ tipo: 'success', texto: transportes.length + ' transporte(s) detectado(s)' });
    } catch (e) {
      console.error('Error procesando archivo:', e);
      setMensaje({ tipo: 'error', texto: 'Error al procesar el archivo' });
    }
    setProcesando(false);
  };

  const handleEliminarTransporte = (index: number) => {
    if (!resumen) return;
    const nuevosTransportes = resumen.transportes.filter((_: any, i: number) => i !== index);
    if (nuevosTransportes.length === 0) {
      setResumen(null);
      setArchivo(null);
      setArchivoNombre('');
      setMensaje({ tipo: '', texto: '' });
      return;
    }
    setResumen({
      ...resumen,
      totalTransportes: nuevosTransportes.length,
      totalLocales: nuevosTransportes.reduce((s: number, t: any) => s + t.locales.length, 0),
      totalBultos: nuevosTransportes.reduce((s: number, t: any) => s + t.locales.reduce((ss: number, l: any) => ss + l.bultos, 0), 0),
      transportes: nuevosTransportes
    });
  };

  const handleGuardar = async () => {
    if (!resumen) return;

    setProcesando(true);
    let creados = 0;
    let errores = 0;

    for (const trans of resumen.transportes) {
      try {
        // Buscar o crear conductor
        let conductorId = null;
        if (trans.conductor) {
          const partesNombre = trans.conductor.split(' ');
          const nombre = partesNombre[0] || '';
          const apellido = partesNombre.slice(1).join(' ') || '';

          if (nombre) {
            const respConductor = await fetch(
              API_URL + '/conductores?select=id&nombre=ilike.' + encodeURIComponent(nombre) + '&apellido=ilike.' + encodeURIComponent(apellido),
              { headers: HEADERS }
            );
            const conductorData = await respConductor.json();
            if (conductorData && conductorData.length > 0) {
              conductorId = conductorData[0].id;
            } else {
              const respNuevo = await fetch(API_URL + '/conductores', {
                method: 'POST',
                headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                body: JSON.stringify({
                  nombre: nombre,
                  apellido: apellido || '.',
                  activo: true
                })
              });
              if (respNuevo.ok) {
                const nuevoData = await respNuevo.json();
                const nuevo = Array.isArray(nuevoData) ? nuevoData[0] : nuevoData;
                conductorId = nuevo.id;
              }
            }
          }
        }

        // Buscar o crear patente
        let patenteId = null;
        if (trans.vehiculo) {
          const patenteLimpia = trans.vehiculo.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (patenteLimpia) {
            const respPatente = await fetch(
              API_URL + '/patentes?select=id&numero_patente=ilike.' + encodeURIComponent(patenteLimpia),
              { headers: HEADERS }
            );
            const patenteData = await respPatente.json();
            if (patenteData && patenteData.length > 0) {
              patenteId = patenteData[0].id;
            } else {
              const respNueva = await fetch(API_URL + '/patentes', {
                method: 'POST',
                headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
                body: JSON.stringify({
                  numero_patente: patenteLimpia,
                  tipo_vehiculo: 'Otro',
                  activo: true
                })
              });
              if (respNueva.ok) {
                const nuevaData = await respNueva.json();
                const nueva = Array.isArray(nuevaData) ? nuevaData[0] : nuevaData;
                patenteId = nueva.id;
              }
            }
          }
        }

        const idDocumento = generarIdDocumento();
        
        const transporteData: any = {
          id_documento: idDocumento,
          fecha_programacion: trans.fechaProgramacion,
          estado: 'Pendiente',
          creado_por: usuario?.id,
          modificado_por: usuario?.nombre + ' ' + usuario?.apellido
        };

        if (conductorId) {
          transporteData.conductor_id = conductorId;
        }
        if (patenteId) {
          transporteData.patente_principal_id = patenteId;
        }

        const respTransporte = await fetch(API_URL + '/sd01_documentos', {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(transporteData)
        });

        if (!respTransporte.ok) {
          errores++;
          continue;
        }

        // Crear locales
        for (const local of trans.locales) {
          await fetch(API_URL + '/sd01_documento_locales', {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documento_id: idDocumento,
              codigo_local: local.codigo_local,
              nombre_local: local.nombre_local || '',
              fecha_entrega: local.fechaEntrega || null,
              hora_entrega: local.horaEntrega || null,
              cantidad_solicitada: local.bultos || 0
            })
          });
        }

        creados++;
      } catch (e) {
        errores++;
      }
    }

    if (errores === 0) {
      setMensaje({ tipo: 'success', texto: creados + ' transporte(s) creado(s) correctamente' });
      setTimeout(() => {
        onTransportesCreados();
      }, 1500);
    } else {
      setMensaje({ tipo: 'warning', texto: creados + ' creado(s), ' + errores + ' error(es)' });
    }
    setProcesando(false);
  };

  return (
    <div className="sd01-modal-overlay" onClick={onClose}>
      <div className="sd01-modal" style={{ maxWidth: '700px' }} onClick={(e: any) => e.stopPropagation()}>
        <div className="sd01-modal-header">
          <h2>Cargar Transportes desde Excel</h2>
          <button className="sd01-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="sd01-modal-body">
          {mensaje.texto && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 500,
              background: mensaje.tipo === 'success' ? 'var(--success-bg)' : mensaje.tipo === 'error' ? 'var(--error-bg)' : 'var(--warning-bg)',
              color: mensaje.tipo === 'success' ? 'var(--success-text)' : mensaje.tipo === 'error' ? 'var(--error-text)' : 'var(--warning-text)',
              border: mensaje.tipo === 'success' ? '1px solid var(--success-border)' : mensaje.tipo === 'error' ? '1px solid var(--error-border)' : '1px solid var(--warning-border)'
            }}>
              {mensaje.texto}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label className="sd01-form-label">Archivo Excel</label>
            <div
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '32px', border: '2px dashed var(--border-input)', borderRadius: '10px',
                cursor: 'pointer', background: 'var(--bg-section)', color: 'var(--text-placeholder)', fontSize: '13px'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>{archivoNombre || 'Seleccionar archivo Excel'}</span>
              {archivoNombre && <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '12px' }}>Click para cambiar</span>}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                El nombre del archivo debe contener la fecha (DD-MM-YYYY)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setArchivo(file);
                    setArchivoNombre(file.name);
                    setResumen(null);
                    setMensaje({ tipo: '', texto: '' });
                  }
                }}
              />
            </div>
          </div>

          {archivo && !resumen && (
            <button className="sd01-btn-save" onClick={procesarArchivo} disabled={procesando} style={{ width: '100%' }}>
              {procesando ? 'Analizando...' : 'Analizar Archivo'}
            </button>
          )}

          {resumen && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Fecha</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{new Date(resumen.fechaProgramacion + 'T00:00:00').toLocaleDateString('es-CL')}</strong>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Transportes</span>
                  <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{resumen.totalTransportes}</strong>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Locales</span>
                  <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{resumen.totalLocales}</strong>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Bultos</span>
                  <strong style={{ fontSize: '18px', color: 'var(--text-primary)' }}>{resumen.totalBultos}</strong>
                </div>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table className="ed03-tabla" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Conductor</th>
                      <th>Vehículo</th>
                      <th style={{ textAlign: 'center' }}>Locales</th>
                      <th style={{ textAlign: 'center' }}>Bultos</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.transportes.map((t: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{idx + 1}</td>
                        <td>{t.conductor || '-'}</td>
                        <td style={{ fontFamily: 'Courier New, monospace' }}>{t.vehiculo || '-'}</td>
                        <td style={{ textAlign: 'center' }}>{t.locales.length}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.locales.reduce((s: number, l: any) => s + l.bultos, 0)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleEliminarTransporte(idx)}
                            style={{
                              width: '24px', height: '24px',
                              background: 'var(--error-bg)', color: 'var(--error-text)',
                              border: '1px solid var(--error-border)', borderRadius: '4px',
                              cursor: 'pointer', fontSize: '14px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Eliminar transporte"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="sd01-btn-cancel" onClick={() => { setResumen(null); setArchivo(null); setArchivoNombre(''); }}>Cancelar</button>
                <button className="sd01-btn-save" onClick={handleGuardar} disabled={procesando} style={{ flex: 1 }}>
                  {procesando ? 'Creando...' : 'Crear ' + resumen.totalTransportes + ' Transporte(s)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SD01CargaExcel;
