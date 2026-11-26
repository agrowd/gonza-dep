'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './autogestion.module.css';

export default function TurnosAutogestionPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [operadores, setOperadores] = useState([]);
  const [estadoFilter, setEstadoFilter] = useState('PENDIENTE');
  const [operadorFilter, setOperadorFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch operators for the filter dropdown
  useEffect(() => {
    fetch('/api/admin/usuarios')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const ops = data.filter(u => u.rol === 'OPERADOR' || u.rol === 'ADMIN');
          setOperadores(ops);
        }
      })
      .catch(err => console.error('Error fetching operadores:', err));
  }, []);

  const fetchSolicitudes = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFilter !== 'ALL') params.set('estado', estadoFilter);
      if (operadorFilter !== 'ALL') params.set('operadorId', operadorFilter);

      const res = await fetch(`/api/admin/autogestion-solicitudes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(data.solicitudes || []);
        setPendingCount(data.pendingCount || 0);
      }
    } catch (error) {
      console.error('Error fetching solicitudes autogestion:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [estadoFilter, operadorFilter]);

  // Initial load and whenever filters change
  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Live polling every 25s
  useEffect(() => {
    const timer = setInterval(() => {
      fetchSolicitudes(true);
    }, 25000);
    return () => clearInterval(timer);
  }, [fetchSolicitudes]);

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la solicitud de ${nombre}?`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/autogestion-solicitudes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSolicitudes(prev => prev.filter(s => s.id !== id));
        setPendingCount(prev => Math.max(0, prev - 1));
      } else {
        alert('No se pudo eliminar la solicitud.');
      }
    } catch (e) {
      console.error('Error deleting solicitud:', e);
      alert('Error de conexión al eliminar.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAgendar = (sol) => {
    if (!sol.disponible) {
      alert(`No se puede agendar este turno porque el horario ya está ocupado (${sol.ocupadoMotivo || 'Solapamiento'}).`);
      return;
    }

    const cuponMatch = sol.observaciones?.match(/\[Cupón:\s*([^\]]+)\]/i);
    const cuponCodigo = cuponMatch ? cuponMatch[1].trim() : '';

    const params = new URLSearchParams({
      newTurno: 'true',
      date: sol.fechaStr,
      time: sol.horaInicio,
      horaFin: sol.horaFin,
      duracion: String(sol.duracionMinutos || 30),
      zones: sol.selectedZoneIds || '',
      nombre: sol.nombreCompleto || '',
      whatsapp: sol.whatsapp || '',
      email: sol.email || '',
      dni: sol.dni || '',
      valorTotal: String(sol.valorTotal || 0),
      manualTotalOverride: String(sol.valorTotal || 0),
      seña: String(sol.valorSeña || 0),
      manualSeñaOverride: String(sol.valorSeña || 0),
      solicitudId: sol.id
    });

    if (cuponCodigo) {
      params.set('cuponCodigo', cuponCodigo);
    }
    if (sol.observaciones) {
      params.set('observaciones', sol.observaciones);
    }
    if (sol.clienteId) {
      params.set('clienteId', sol.clienteId);
    }
    if (sol.operadorId) {
      params.set('operadorId', sol.operadorId);
    }
    if (sol.boxId) {
      params.set('boxId', sol.boxId);
    }

    router.push(`/admin/agenda?${params.toString()}`);
  };

  const formatFechaLegible = (fechaStr, horaInicio, horaFin) => {
    try {
      const [year, month, day] = fechaStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const diaSemana = d.toLocaleDateString('es-AR', { weekday: 'long' });
      const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
      const mesStr = d.toLocaleDateString('es-AR', { month: 'long' });
      return `${diaSemanaCap}, ${day} de ${mesStr} · ${horaInicio} a ${horaFin}`;
    } catch {
      return `${fechaStr} · ${horaInicio} a ${horaFin}`;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <span>📅</span>
            <span>Turnos de Autogestión</span>
          </h1>
          <span className={styles.countBadge}>
            {pendingCount} {pendingCount === 1 ? 'pendiente' : 'pendientes'}
          </span>
        </div>
        <p className={styles.subtitle}>Solicitudes recibidas desde la web.</p>

        <div className={styles.filterBar}>
          <select
            className={styles.selectInput}
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="PENDIENTE">⏳ Pendientes</option>
            <option value="AGENDADO">✅ Agendados</option>
            <option value="DESCARTADO">🗑️ Descartados</option>
            <option value="ALL">🔘 Todos</option>
          </select>

          <select
            className={styles.selectInput}
            value={operadorFilter}
            onChange={(e) => setOperadorFilter(e.target.value)}
          >
            <option value="ALL">🔍 Operadores (Todos)</option>
            {operadores.map(op => (
              <option key={op.id} value={op.id}>
                {op.nombre || op.usuario}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          <p>Cargando solicitudes...</p>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📬</div>
          <div className={styles.emptyTitle}>No hay solicitudes</div>
          <p>
            {estadoFilter === 'PENDIENTE'
              ? 'No hay solicitudes pendientes en este momento.'
              : 'No se encontraron solicitudes con los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {solicitudes.map((sol) => (
            <div key={sol.id} className={styles.card}>
              <div className={styles.cardTop}>
                <h3 className={styles.clientName}>{sol.nombreCompleto}</h3>
                <div className={styles.badgesGroup}>
                  <span
                    className={`${styles.statusBadge} ${
                      sol.estado === 'PENDIENTE'
                        ? styles.statusPendiente
                        : sol.estado === 'AGENDADO'
                        ? styles.statusAgendado
                        : styles.statusDescartado
                    }`}
                  >
                    {sol.estado === 'PENDIENTE' ? 'Pendiente' : sol.estado}
                  </span>

                  <span
                    className={`${styles.availBadge} ${
                      sol.disponible ? styles.availAvailable : styles.availBusy
                    }`}
                  >
                    <span>{sol.disponible ? '🟢' : '🔴'}</span>
                    <span>{sol.disponible ? 'Horario disponible' : 'Horario Ocupado'}</span>
                  </span>
                </div>
              </div>

              <div className={styles.dateTimeRow}>
                <span>📅</span>
                <span>{formatFechaLegible(sol.fechaStr, sol.horaInicio, sol.horaFin)}</span>
              </div>

              <div className={styles.zonesRow}>
                <span>✂️</span>
                <span>
                  <strong>Zonas:</strong> {sol.zonasTexto || 'Zonas no especificadas'}
                </span>
              </div>

              {sol.observaciones && (
                <div className={styles.obsBox}>
                  <strong>Nota:</strong> {sol.observaciones}
                </div>
              )}

              <div className={styles.infoGrid}>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Valor Total</span>
                  <span className={styles.infoValue}>
                    ${Number(sol.valorTotal || 0).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Seña</span>
                  <span className={styles.infoValue} style={{ color: '#16a34a' }}>
                    ${Number(sol.valorSeña || 0).toLocaleString('es-AR')}
                  </span>
                </div>
                <div className={styles.infoCol}>
                  <span className={styles.infoLabel}>Operador</span>
                  <span className={styles.infoValue}>
                    {sol.operadorNombre || 'Sin asignar'}
                  </span>
                </div>
              </div>

              <div className={styles.actionsRow}>
                {!sol.disponible && (
                  <div className={styles.busyWarning}>
                    <span>⚠️</span>
                    <span>{sol.ocupadoMotivo || 'Horario ocupado por otro turno o bloqueo'}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(sol.id, sol.nombreCompleto)}
                  className={styles.borrarBtn}
                  disabled={actionLoadingId === sol.id}
                >
                  <span>🗑️</span>
                  <span>Borrar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAgendar(sol)}
                  className={styles.agendarBtn}
                  disabled={!sol.disponible || actionLoadingId === sol.id}
                  title={!sol.disponible ? 'El horario no está disponible' : 'Agendar este turno'}
                >
                  <span>📅</span>
                  <span>Agendar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
