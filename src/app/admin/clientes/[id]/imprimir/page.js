'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import styles from './imprimir.module.css';

export default function FichaImprimirPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/clientes/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar la ficha del cliente');
        return res.json();
      })
      .then(data => setClient(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#d4a54d', fontFamily: 'Arial, sans-serif' }}>
        Cargando ficha para impresión...
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#ef4444', fontFamily: 'Arial, sans-serif' }}>
        <h3>Error al cargar ficha</h3>
        <p>{error || 'Cliente no encontrado'}</p>
        <Link href="/admin/clientes" style={{ color: '#d4a54d', textDecoration: 'underline' }}>
          Volver a Clientes
        </Link>
      </div>
    );
  }

  // Calculate age if fechaNacimiento is present
  let edad = null;
  if (client.fechaNacimiento) {
    const birthDate = new Date(client.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    edad = age;
  }

  const turnosRealizados = (client.turnos || []).filter(t => t.estado === 'REALIZADO');
  const countRealizados = turnosRealizados.length;
  const countPrevias = Number(client.sesionesPrevias) || 0;
  const totalSesiones = countRealizados + countPrevias;

  return (
    <div className={styles.pageContainer}>
      {/* Top action bar */}
      <div className={styles.actionBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => window.history.back()} className={styles.btnSecondary}>
            ← Volver a la Ficha
          </button>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            Ficha de: <strong>{client.nombreCompleto}</strong>
          </span>
        </div>
        <button onClick={handlePrint} className={styles.btnPrint}>
          🖨️ Imprimir / Guardar como PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div className={styles.sheet}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Gonzalo Depilación Láser</h1>
            <p className={styles.subtitle}>Ficha Digital del Cliente e Historial Clínico</p>
          </div>
          <div className={styles.metaHeader}>
            <div>Fecha Emisión: {new Date().toLocaleDateString('es-AR')}</div>
            <div>Paraná 597, Piso 8, Dpto 48 - CABA</div>
          </div>
        </div>

        {/* Client Personal Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Datos Personales</h2>
          <div className={styles.grid3}>
            <div><strong>Nombre Completo:</strong> {client.nombreCompleto}</div>
            <div><strong>DNI:</strong> {client.dni || 'Sin registrar'}</div>
            <div><strong>WhatsApp:</strong> {client.whatsapp}</div>
            <div><strong>Email:</strong> {client.email}</div>
            <div>
              <strong>Fecha Nacimiento:</strong> {client.fechaNacimiento ? new Date(client.fechaNacimiento).toLocaleDateString('es-AR') : 'Sin registrar'}
              {edad !== null && ` (${edad} años)`}
            </div>
            <div><strong>Canal de Adquisición:</strong> {client.canalAdquisicion || 'Orgánico'}</div>
            <div><strong>Frecuencia:</strong> Cada {client.frecuencia} semanas</div>
            <div><strong>Fecha Alta:</strong> {new Date(client.fechaAlta).toLocaleDateString('es-AR')}</div>
            <div><strong>Estado:</strong> {client.estado}</div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Resumen de Sesiones</h2>
          <div className={styles.metricsBox}>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Total Sesiones</span>
              <span className={styles.metricValue}>{totalSesiones}</span>
              {countPrevias > 0 && (
                <span className={styles.metricSub}>({countRealizados} en sistema + {countPrevias} previas)</span>
              )}
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Fecha Primer Turno</span>
              <span className={styles.metricValueSm}>
                {client.fechaPrimerTurno ? new Date(client.fechaPrimerTurno).toLocaleDateString('es-AR') : 'No registrada'}
              </span>
            </div>
            <div className={styles.metricItem}>
              <span className={styles.metricLabel}>Turnos Registrados</span>
              <span className={styles.metricValueSm}>{(client.turnos || []).length} turnos</span>
            </div>
          </div>
        </div>

        {/* Clinical / Operator Notes */}
        {client.notasGonzalo && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Observaciones del Operador (Potencia / Clínica)</h2>
            <div className={styles.notesBoxClinical}>
              {client.notasGonzalo}
            </div>
          </div>
        )}

        {/* Administrative Notes */}
        {client.observaciones && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Observaciones Administrativas</h2>
            <div className={styles.notesBoxAdmin}>
              {client.observaciones}
            </div>
          </div>
        )}

        {/* Turn History Table */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Historial Cronológico de Turnos</h2>
          {(!client.turnos || client.turnos.length === 0) ? (
            <p style={{ color: '#777', fontStyle: 'italic' }}>Sin turnos registrados hasta el momento.</p>
          ) : (
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Fecha</th>
                  <th style={{ width: '10%' }}>Horario</th>
                  <th style={{ width: '25%' }}>Zonas</th>
                  <th style={{ width: '10%' }}>Costo</th>
                  <th style={{ width: '10%' }}>Seña</th>
                  <th style={{ width: '10%' }}>Saldo</th>
                  <th style={{ width: '11%' }}>Estado</th>
                  <th style={{ width: '12%' }}>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {client.turnos.map((t) => {
                  let zonas = '';
                  try {
                    zonas = JSON.parse(t.zonas).map(z => z.nombre).join(', ');
                  } catch (e) {
                    zonas = t.zonas;
                  }

                  return (
                    <tr key={t.id}>
                      <td>{new Date(t.fecha).toLocaleDateString('es-AR')}</td>
                      <td>{t.horaInicio} a {t.horaFin}</td>
                      <td>{zonas}</td>
                      <td>${t.valorTotal.toLocaleString('es-AR')}</td>
                      <td>${t.valorSeña.toLocaleString('es-AR')}</td>
                      <td>${t.saldoPendiente.toLocaleString('es-AR')}</td>
                      <td>
                        <span className={styles.statusBadge}>{t.estado}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#444' }}>
                        {t.observaciones || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Gonzalo Depilación para Hombres — Documento Confidencial para Uso Interno</p>
        </div>
      </div>
    </div>
  );
}
