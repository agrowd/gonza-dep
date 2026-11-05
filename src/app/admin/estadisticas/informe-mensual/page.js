'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

function formatMoney(amount) {
  if (amount === undefined || amount === null) return '$ 0';
  return `$ ${Number(amount).toLocaleString('es-AR')}`;
}

export default function InformeMensualPage({ searchParams }) {
  const unwrappedParams = use(searchParams);
  const initialMes = unwrappedParams?.mes || '';

  const [mes, setMes] = useState(initialMes);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = mes ? `/api/admin/estadisticas/consolidado-mensual?mes=${mes}` : '/api/admin/estadisticas/consolidado-mensual';
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar consolidado mensual');
        return res.json();
      })
      .then(json => {
        setData(json);
        if (!mes && json.selectedMonth) {
          setMes(json.selectedMonth);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [mes]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#7a1f1e', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>⏳</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Generando Informe Mensual DPH...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#dc2626', fontFamily: 'system-ui, sans-serif' }}>
        <h3>Error al cargar el informe mensual</h3>
        <p>{error || 'No se pudieron recuperar los datos'}</p>
        <Link href="/admin/estadisticas" style={{ color: '#7a1f1e', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          Volver a Estadísticas
        </Link>
      </div>
    );
  }

  const { kpis, resumen, evolucion13Meses, mesLabel, fechaEmision, selectedMonth } = data;

  // Max values for responsive SVG charts
  const maxTurnos = Math.max(...evolucion13Meses.map(m => m.turnosAtendidos), 10);
  const maxFacturacion = Math.max(...evolucion13Meses.map(m => Math.max(m.facturacion, m.gastos, m.facturacionNeta)), 100000);
  const maxAltasBajas = Math.max(...evolucion13Meses.map(m => Math.max(m.clientesNuevos, m.totalBajas)), 5);
  const maxDetalleBajas = Math.max(...evolucion13Meses.map(m => Math.max(m.finalizados, m.cancelados, m.ausentes)), 5);

  return (
    <div className="informe-wrapper" style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      padding: '1.5rem 1rem',
      color: '#0f172a',
      fontFamily: 'Arial, Helvetica, sans-serif'
    }}>
      {/* Action Bar (Screen only, hidden on print) */}
      <div className="no-print" style={{
        maxWidth: '900px',
        margin: '0 auto 1.5rem auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        backgroundColor: '#ffffff',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link href="/admin/estadisticas" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            ← Volver a Estadísticas
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="mesSelect" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
              Mes a consultar:
            </label>
            <input
              id="mesSelect"
              type="month"
              value={selectedMonth}
              onChange={(e) => setMes(e.target.value)}
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#0f172a'
              }}
            />
          </div>
        </div>

        <button
          onClick={handlePrint}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.25rem',
            backgroundColor: '#7a1f1e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(122, 31, 30, 0.25)'
          }}
        >
          🖨️ Imprimir / Guardar como PDF (2 Páginas)
        </button>
      </div>

      {/* ============================================================ */}
      {/* PÁGINA 1: INFORME EJECUTIVO Y RESUMEN DEL MES               */}
      {/* ============================================================ */}
      <div className="pdf-page" style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '2.5rem 2.8rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
        marginBottom: '2rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #7a1f1e', paddingBottom: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Informe mensual — {mesLabel}
            </h1>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#7a1f1e', marginTop: '0.2rem' }}>
              GONZALO Depilación para Hombres
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
            <div><strong>Fecha de emisión:</strong> {fechaEmision}</div>
            <div><strong>Fuente:</strong> Sistema de Gestión DPH</div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* KPI 1: Turnos Atendidos */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #7a1f1e',
            borderRadius: '8px',
            padding: '1rem 0.9rem',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              TURNOS ATENDIDOS
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {kpis.turnosAtendidos.valor}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: kpis.turnosAtendidos.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.turnosAtendidos.comparacion ? `${kpis.turnosAtendidos.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>

          {/* KPI 2: Facturación */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #d97706',
            borderRadius: '8px',
            padding: '1rem 0.9rem',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              FACTURACIÓN
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, wordBreak: 'break-word' }}>
              {formatMoney(kpis.facturacion.valor)}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: kpis.facturacion.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.facturacion.comparacion ? `${kpis.facturacion.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>

          {/* KPI 3: Facturación Neta */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #16a34a',
            borderRadius: '8px',
            padding: '1rem 0.9rem',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              FACTURACIÓN NETA
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1, wordBreak: 'break-word' }}>
              {formatMoney(kpis.facturacionNeta.valor)}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginTop: '0.35rem' }}>
              {kpis.facturacionNeta.porcentajeFacturacion}
            </div>
          </div>

          {/* KPI 4: Clientes Nuevos */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderTop: '4px solid #2563eb',
            borderRadius: '8px',
            padding: '1rem 0.9rem',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
              CLIENTES NUEVOS
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {kpis.clientesNuevos.valor}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: kpis.clientesNuevos.comparacion ? '#16a34a' : '#64748b', marginTop: '0.35rem' }}>
              {kpis.clientesNuevos.comparacion ? `${kpis.clientesNuevos.comparacion} vs mes anterior` : 's/d vs mes anterior'}
            </div>
          </div>
        </div>

        {/* Resumen Table (Matching PDF) */}
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Resumen de {mesLabel}
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #94a3b8' }}>
              <th style={{ textAlign: 'left', padding: '0.65rem 0.9rem', fontWeight: 800, color: '#334155' }}>Indicador</th>
              <th style={{ textAlign: 'right', padding: '0.65rem 0.9rem', fontWeight: 800, color: '#334155', width: '220px' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Turnos atendidos</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.turnosAtendidos}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Ocupación de agenda</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>
                {resumen.ocupacionAgendaPorc.toFixed(1).replace('.', ',')}% <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>({resumen.ocupacionMinutos} min ocup. / {resumen.disponiblesMinutos} min disp.)</span>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Facturación del mes</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(resumen.facturacionMes)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Gastos del mes</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatMoney(resumen.gastosMes)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f0fdf4' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#166534', fontWeight: 700 }}>Facturación neta</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 800, color: '#166534' }}>{formatMoney(resumen.facturacionNeta)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Clientes nuevos</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.clientesNuevos}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Valor de los turnos de clientes nuevos</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(resumen.valorTurnosNuevos)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Clientes que finalizaron tratamiento</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700 }}>{resumen.clientesFinalizaron}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fcfdfd' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Bajas: turnos cancelados</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{resumen.bajasCancelados}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#1e293b' }}>Bajas: no vinieron (ausentes)</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{resumen.bajasNoVinieron}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fff1f2' }}>
              <td style={{ padding: '0.55rem 0.9rem', color: '#991b1b', fontWeight: 700 }}>Total bajas</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 800, color: '#991b1b' }}>{resumen.totalBajas}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.55rem 0.9rem', color: '#475569' }}>Valor de los turnos cancelados y no asistidos</td>
              <td style={{ padding: '0.55rem 0.9rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatMoney(resumen.valorBajasPerdido)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer Page 1 */}
        <div style={{ marginTop: '2.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
          <span>GONZALO Depilación para Hombres — Resumen Ejecutivo</span>
          <span>Página 1 de 2</span>
        </div>
      </div>

      {/* CSS Page Break for PDF Export */}
      <div className="pdf-page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }} />

      {/* ============================================================ */}
      {/* PÁGINA 2: EVOLUCIÓN HISTÓRICA DE LOS ÚLTIMOS 13 MESES        */}
      {/* ============================================================ */}
      <div className="pdf-page" style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        padding: '2.5rem 2.8rem',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        boxSizing: 'border-box'
      }}>
        {/* Header Page 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #7a1f1e', paddingBottom: '0.85rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Evolución de los últimos 13 meses
            </h2>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginTop: '0.2rem' }}>
              Desde {evolucion13Meses[0].fullLabel} hasta {evolucion13Meses[evolucion13Meses.length - 1].fullLabel}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: '#64748b' }}>
            <div>GONZALO Depilación para Hombres</div>
          </div>
        </div>

        {/* 4 Comparative Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gráfico 1: Turnos Atendidos */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                1. Turnos Atendidos
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Cantidad de citas realizadas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
              {evolucion13Meses.map((m, idx) => {
                const heightPct = maxTurnos > 0 ? (m.turnosAtendidos / maxTurnos) * 100 : 0;
                const isSelected = idx === evolucion13Meses.length - 1;
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: m.turnosAtendidos > 0 ? '#0f172a' : '#cbd5e1', marginBottom: '3px' }}>
                      {m.turnosAtendidos > 0 ? m.turnosAtendidos : 's/d'}
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${Math.max(heightPct, 4)}%`,
                      backgroundColor: m.turnosAtendidos > 0 ? (isSelected ? '#7a1f1e' : '#b45309') : '#e2e8f0',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {evolucion13Meses.map(m => (
                <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico 2: Facturación vs Gastos vs Facturación Neta */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                2. Facturación, Gastos y Facturación Neta ($)
              </span>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#d97706', borderRadius: '2px' }} /> Facturación
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> Gastos
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#16a34a', borderRadius: '2px' }} /> Neta
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
              {evolucion13Meses.map((m) => {
                const fPct = maxFacturacion > 0 ? (m.facturacion / maxFacturacion) * 100 : 0;
                const gPct = maxFacturacion > 0 ? (m.gastos / maxFacturacion) * 100 : 0;
                const nPct = maxFacturacion > 0 ? (m.facturacionNeta / maxFacturacion) * 100 : 0;
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '1.5px', justifyContent: 'center' }}>
                      <div title={`Facturación: ${formatMoney(m.facturacion)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(fPct, m.facturacion > 0 ? 4 : 0)}%`, backgroundColor: '#d97706', borderRadius: '2px 2px 0 0' }} />
                      <div title={`Gastos: ${formatMoney(m.gastos)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(gPct, m.gastos > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                      <div title={`Neta: ${formatMoney(m.facturacionNeta)}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(nPct, m.facturacionNeta > 0 ? 4 : 0)}%`, backgroundColor: '#16a34a', borderRadius: '2px 2px 0 0' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {evolucion13Meses.map(m => (
                <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico 3: Altas (Clientes Nuevos) vs Total Bajas */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                3. Altas (Clientes Nuevos) vs Total de Bajas
              </span>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }} /> Altas (Nuevos)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> Total Bajas
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
              {evolucion13Meses.map((m) => {
                const aPct = maxAltasBajas > 0 ? (m.clientesNuevos / maxAltasBajas) * 100 : 0;
                const bPct = maxAltasBajas > 0 ? (m.totalBajas / maxAltasBajas) * 100 : 0;
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '2px', justifyContent: 'center' }}>
                      <div title={`Altas: ${m.clientesNuevos}`} style={{ flex: 1, maxWidth: '14px', height: `${Math.max(aPct, m.clientesNuevos > 0 ? 4 : 0)}%`, backgroundColor: '#2563eb', borderRadius: '2px 2px 0 0' }} />
                      <div title={`Bajas: ${m.totalBajas}`} style={{ flex: 1, maxWidth: '14px', height: `${Math.max(bPct, m.totalBajas > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {evolucion13Meses.map(m => (
                <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico 4: Detalle de Bajas */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fcfcfd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                4. Detalle de Bajas
              </span>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#64748b', borderRadius: '2px' }} /> Finalizaron
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#d97706', borderRadius: '2px' }} /> Cancelaron
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '2px' }} /> No Vinieron
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '110px', gap: '6px', paddingTop: '15px', borderBottom: '1px solid #cbd5e1' }}>
              {evolucion13Meses.map((m) => {
                const finPct = maxDetalleBajas > 0 ? (m.finalizados / maxDetalleBajas) * 100 : 0;
                const canPct = maxDetalleBajas > 0 ? (m.cancelados / maxDetalleBajas) * 100 : 0;
                const ausPct = maxDetalleBajas > 0 ? (m.ausentes / maxDetalleBajas) * 100 : 0;
                return (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '100%', gap: '1.5px', justifyContent: 'center' }}>
                      <div title={`Finalizaron: ${m.finalizados}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(finPct, m.finalizados > 0 ? 4 : 0)}%`, backgroundColor: '#64748b', borderRadius: '2px 2px 0 0' }} />
                      <div title={`Cancelaron: ${m.cancelados}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(canPct, m.cancelados > 0 ? 4 : 0)}%`, backgroundColor: '#d97706', borderRadius: '2px 2px 0 0' }} />
                      <div title={`No vinieron: ${m.ausentes}`} style={{ flex: 1, maxWidth: '10px', height: `${Math.max(ausPct, m.ausentes > 0 ? 4 : 0)}%`, backgroundColor: '#dc2626', borderRadius: '2px 2px 0 0' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {evolucion13Meses.map(m => (
                <div key={m.key} style={{ flex: 1, textAlign: 'center', fontSize: '0.66rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footnote Page 2 */}
        <div style={{ marginTop: '2rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#94a3b8' }}>
          <span>* s/d: sin datos en meses anteriores al inicio del registro en el sistema.</span>
          <span>Página 2 de 2</span>
        </div>
      </div>
    </div>
  );
}
