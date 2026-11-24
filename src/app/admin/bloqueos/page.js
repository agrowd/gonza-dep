'use client';

import { useState, useEffect } from 'react';
import styles from '../configuracion/configuracion.module.css';

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

export default function BloqueosPage() {
  const currentYear = new Date().getFullYear();
  const [selectedFeriadosYear, setSelectedFeriadosYear] = useState(currentYear);
  const [feriados, setFeriados] = useState([]);
  const [loadingFeriados, setLoadingFeriados] = useState(true);
  const [feriadoFilterTipo, setFeriadoFilterTipo] = useState('ALL');

  const [feriadoForm, setFeriadoForm] = useState({
    fechaStr: '',
    fechaHastaStr: '',
    isRangoFechas: false,
    motivo: '',
    tipo: 'UNICO',
    esDiaCompleto: true,
    horaInicio: '08:00',
    horaFin: '22:00',
    color: '#2563eb'
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchFeriados = async (year = selectedFeriadosYear) => {
    try {
      setLoadingFeriados(true);
      const res = await fetch(`/api/admin/feriados?year=${year}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setFeriados(data.feriados || []);
      }
    } catch (err) {
      console.error('Error fetching feriados:', err);
      showToast('Error al cargar feriados y bloqueos', 'error');
    } finally {
      setLoadingFeriados(false);
    }
  };

  useEffect(() => {
    fetchFeriados(selectedFeriadosYear);
  }, [selectedFeriadosYear]);

  const handleCreateFeriado = async (e) => {
    e.preventDefault();
    if (!feriadoForm.fechaStr) {
      showToast('La fecha de inicio es requerida', 'error');
      return;
    }
    if (!feriadoForm.motivo.trim()) {
      showToast('El motivo es obligatorio', 'error');
      return;
    }
    if (feriadoForm.isRangoFechas && !feriadoForm.fechaHastaStr) {
      showToast('Debes indicar la fecha hasta', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/feriados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feriadoForm)
      });
      if (res.ok) {
        showToast('Bloqueo / feriado registrado con éxito');
        setFeriadoForm({
          fechaStr: '',
          fechaHastaStr: '',
          isRangoFechas: false,
          motivo: '',
          tipo: 'UNICO',
          esDiaCompleto: true,
          horaInicio: '08:00',
          horaFin: '22:00',
          color: '#2563eb'
        });
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al crear bloqueo', 'error');
      }
    } catch (err) {
      showToast('Error de red al registrar bloqueo', 'error');
    }
  };

  const handleDeleteFeriado = async (f) => {
    if (!confirm(`¿Estás seguro de eliminar el bloqueo "${f.motivo}"?`)) return;
    try {
      const res = await fetch(`/api/admin/feriados/${f.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Bloqueo eliminado correctamente');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al eliminar', 'error');
      }
    } catch (err) {
      showToast('Error de red al eliminar', 'error');
    }
  };

  const handleToggleFeriadoActivo = async (f) => {
    try {
      const res = await fetch(`/api/admin/feriados/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !f.activo })
      });
      if (res.ok) {
        showToast(f.activo ? 'Feriado desactivado (agenda abierta)' : 'Feriado activado (agenda bloqueada)');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al actualizar', 'error');
      }
    } catch (err) {
      showToast('Error de red al actualizar', 'error');
    }
  };

  const formatFeriadoDate = (dateVal) => {
    if (!dateVal) return '';
    const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getFeriadoDayName = (dateVal) => {
    if (!dateVal) return '';
    const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '0.92rem'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h2>🚫 Bloqueos de Horario y Feriados Anuales</h2>
        <p>Configura días festivos, feriados puente y bloqueos especiales de horario para evitar reservas en la agenda.</p>
      </div>

      <div className={styles.bloqueosSectionCard}>
        <div className={styles.bloqueosTitleRow}>
          <div className={styles.bloqueosSectionTitle}>
            <span>Bloqueos y Feriados del Calendario</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Año a consultar:</span>
            <select 
              className={styles.input} 
              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontWeight: 700 }}
              value={selectedFeriadosYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedFeriadosYear(y);
                fetchFeriados(y);
              }}
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.5rem 0 1.25rem 0', lineHeight: '1.5' }}>
          Bloquea días u horarios en la agenda para feriados o eventos festivos. Los feriados <strong>Fijos</strong> se replican automáticamente todos los años. Los feriados <strong>Móviles</strong> permiten reubicar su fecha con anticipación (ej. feriados puente). Los bloqueos <strong>Únicos</strong> aplican solo a esa fecha específica.
        </p>

        {/* Formulario de Alta Rápida */}
        <form onSubmit={handleCreateFeriado} className={styles.bloqueoFormCard}>
          <div className={styles.bloqueoFormTitle}>
            <span>+ Crear Nuevo Bloqueo o Feriado</span>
          </div>

          <div className={styles.bloqueoFormGrid}>
            {/* 1. Tipo de Feriado */}
            <div className={styles.formField}>
              <label>Tipo de Bloqueo / Feriado *</label>
              <select
                className={styles.input}
                value={feriadoForm.tipo}
                onChange={(e) => {
                  const t = e.target.value;
                  let defaultC = '#dc2626';
                  if (t === 'MOVIL') defaultC = '#d97706';
                  if (t === 'UNICO') defaultC = '#2563eb';
                  setFeriadoForm(prev => ({ ...prev, tipo: t, color: defaultC }));
                }}
                required
              >
                <option value="FIJO">Fijo (Se repite todos los años, ej: Navidad)</option>
                <option value="MOVIL">Móvil (Se define o reubica por año, ej: Feriado puente)</option>
                <option value="UNICO">Único (Aplica solo a este día específico)</option>
              </select>
            </div>

            {/* Checkbox Rango de Días */}
            <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', margin: '0.15rem 0' }}>
                <input
                  type="checkbox"
                  checked={!!feriadoForm.isRangoFechas}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFeriadoForm(prev => ({
                      ...prev,
                      isRangoFechas: checked,
                      fechaHastaStr: checked ? (prev.fechaHastaStr || prev.fechaStr) : ''
                    }));
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  🗓️ Bloquear rango de días continuos (Desde / Hasta)
                </span>
              </label>
            </div>

            {/* 2. Fecha / Rango */}
            <div className={styles.formField}>
              <label>{feriadoForm.isRangoFechas ? 'Fecha Desde *' : 'Fecha a Bloquear *'}</label>
              <input
                type="date"
                className={styles.input}
                value={feriadoForm.fechaStr}
                onChange={(e) => setFeriadoForm(prev => ({ ...prev, fechaStr: e.target.value }))}
                required
              />
            </div>

            {feriadoForm.isRangoFechas && (
              <div className={styles.formField}>
                <label>Fecha Hasta *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={feriadoForm.fechaHastaStr}
                  onChange={(e) => setFeriadoForm(prev => ({ ...prev, fechaHastaStr: e.target.value }))}
                  required
                />
              </div>
            )}

            {/* Motivo */}
            <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
              <label>Motivo o Descripción *</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej: Feriado Nacional, Desinfección local, Capacitación..."
                value={feriadoForm.motivo}
                onChange={(e) => setFeriadoForm(prev => ({ ...prev, motivo: e.target.value }))}
                required
              />
            </div>

            {/* Día completo o franja horaria */}
            <div className={styles.formField}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={feriadoForm.esDiaCompleto}
                  onChange={(e) => setFeriadoForm(prev => ({ ...prev, esDiaCompleto: e.target.checked }))}
                />
                <span style={{ fontWeight: 600 }}>Día Completo (Bloquea toda la jornada)</span>
              </label>
            </div>

            {!feriadoForm.esDiaCompleto && (
              <>
                <div className={styles.formField}>
                  <label>Hora Inicio</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={feriadoForm.horaInicio}
                    onChange={(e) => setFeriadoForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                    required={!feriadoForm.esDiaCompleto}
                  />
                </div>
                <div className={styles.formField}>
                  <label>Hora Fin</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={feriadoForm.horaFin}
                    onChange={(e) => setFeriadoForm(prev => ({ ...prev, horaFin: e.target.value }))}
                    required={!feriadoForm.esDiaCompleto}
                  />
                </div>
              </>
            )}

            {/* Botón de envío */}
            <div className={styles.formField} style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}>
                + Crear Feriado / Bloqueo
              </button>
            </div>
          </div>
        </form>

        {/* Listado de Feriados del Año */}
        <div className={styles.feriadosFilterHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', marginTop: '1.5rem' }}>
          <div className={styles.feriadosStats} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>Filtro de bloqueos:</span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: feriadoFilterTipo === 'ALL' ? '1px solid #7a1f1e' : '1px solid #cbd5e1',
                  backgroundColor: feriadoFilterTipo === 'ALL' ? '#7a1f1e' : '#ffffff',
                  color: feriadoFilterTipo === 'ALL' ? '#ffffff' : '#475569'
                }}
                onClick={() => setFeriadoFilterTipo('ALL')}
              >
                Todos ({feriados.length})
              </button>
              <button
                type="button"
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: feriadoFilterTipo === 'UNICO' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: feriadoFilterTipo === 'UNICO' ? '#2563eb' : '#ffffff',
                  color: feriadoFilterTipo === 'UNICO' ? '#ffffff' : '#475569'
                }}
                onClick={() => setFeriadoFilterTipo('UNICO')}
              >
                🔵 Únicos ({feriados.filter(f => f.tipo === 'UNICO' || !f.tipo).length})
              </button>
              <button
                type="button"
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: feriadoFilterTipo === 'FIJO' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: feriadoFilterTipo === 'FIJO' ? '#dc2626' : '#ffffff',
                  color: feriadoFilterTipo === 'FIJO' ? '#ffffff' : '#475569'
                }}
                onClick={() => setFeriadoFilterTipo('FIJO')}
              >
                🔴 Fijos ({feriados.filter(f => f.tipo === 'FIJO').length})
              </button>
              <button
                type="button"
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: feriadoFilterTipo === 'MOVIL' ? '1px solid #d97706' : '1px solid #cbd5e1',
                  backgroundColor: feriadoFilterTipo === 'MOVIL' ? '#d97706' : '#ffffff',
                  color: feriadoFilterTipo === 'MOVIL' ? '#ffffff' : '#475569'
                }}
                onClick={() => setFeriadoFilterTipo('MOVIL')}
              >
                🟡 Móviles ({feriados.filter(f => f.tipo === 'MOVIL').length})
              </button>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => fetchFeriados(selectedFeriadosYear)}
          >
            🔄 Actualizar Lista
          </button>
        </div>

        {loadingFeriados ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem 0' }}>Cargando feriados y bloqueos...</p>
        ) : feriados.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            No hay feriados ni bloqueos registrados para el año {selectedFeriadosYear}.
          </div>
        ) : (
          <div className={styles.bloqueoCardList} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {feriados
              .filter(f => {
                if (feriadoFilterTipo === 'ALL') return true;
                if (feriadoFilterTipo === 'UNICO') return f.tipo === 'UNICO' || !f.tipo;
                if (feriadoFilterTipo === 'FIJO') return f.tipo === 'FIJO';
                if (feriadoFilterTipo === 'MOVIL') return f.tipo === 'MOVIL';
                return true;
              })
              .map((f) => {
                const isMovil = f.tipo === 'MOVIL';
                const isFijo = f.tipo === 'FIJO';
                const dotColor = f.color || (isFijo ? '#dc2626' : (isMovil ? '#d97706' : '#2563eb'));
                const dayName = getFeriadoDayName(f.fecha);
                const dateFormatted = `${formatFeriadoDate(f.fecha)} (${dayName})`;

                return (
                  <div
                    key={f.id}
                    className={styles.bloqueoCardItem}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.1rem',
                      backgroundColor: f.activo ? '#ffffff' : '#f8fafc',
                      border: `1.5px solid ${f.activo ? '#e2e8f0' : '#cbd5e1'}`,
                      borderRadius: '10px',
                      opacity: f.activo ? 1 : 0.65
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#1e293b' }}>
                          {f.motivo}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📅 {dateFormatted} {f.esDiaCompleto ? '• Día Completo' : `• ${f.horaInicio} a ${f.horaFin} hs`}
                          {isFijo && ' • Feriado Fijo Anual'}
                          {isMovil && ' • Feriado Móvil'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleFeriadoActivo(f)}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          color: f.activo ? '#166534' : '#64748b',
                          backgroundColor: f.activo ? '#f0fdf4' : '#f1f5f9'
                        }}
                      >
                        {f.activo ? '✓ Activo' : '○ Pausado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFeriado(f)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        title="Eliminar bloqueo"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
