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

  // Modal para reubicar feriado móvil
  const [moveModal, setMoveModal] = useState({
    isOpen: false,
    feriado: null,
    nuevaFechaStr: ''
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchFeriados = async (year = selectedFeriadosYear) => {
    try {
      setLoadingFeriados(true);
      const res = await fetch(`/api/admin/bloqueos?ano=${year}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setFeriados(Array.isArray(data) ? data : []);
      } else {
        setFeriados([]);
      }
    } catch (err) {
      console.error('Error fetching feriados:', err);
      showToast('Error al cargar feriados y bloqueos', 'error');
      setFeriados([]);
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
      showToast('Selecciona una fecha para el bloqueo', 'error');
      return;
    }
    if (feriadoForm.isRangoFechas && feriadoForm.fechaHastaStr && feriadoForm.fechaHastaStr < feriadoForm.fechaStr) {
      showToast('La Fecha Hasta no puede ser anterior a la Fecha Desde', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/bloqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feriadoForm)
      });
      if (res.ok) {
        showToast(feriadoForm.isRangoFechas ? 'Rango de días bloqueado con éxito' : 'Feriado o bloqueo registrado con éxito');
        setFeriadoForm(prev => ({
          ...prev,
          motivo: '',
          esDiaCompleto: true,
          fechaHastaStr: '',
          isRangoFechas: false
        }));
        fetchFeriados(selectedFeriadosYear);
      } else if (res.status === 409) {
        const warnData = await res.json();
        const conf = window.confirm(`⚠️ ${warnData.message || 'Existen turnos cargados en esa fecha. ¿Deseas aplicar el bloqueo de todas formas?'}`);
        if (conf) {
          const forceRes = await fetch('/api/admin/bloqueos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...feriadoForm, forzar: true })
          });
          if (forceRes.ok) {
            showToast('Bloqueo forzado y registrado con éxito');
            setFeriadoForm(prev => ({
              ...prev,
              motivo: '',
              esDiaCompleto: true,
              fechaHastaStr: '',
              isRangoFechas: false
            }));
            fetchFeriados(selectedFeriadosYear);
            return;
          }
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al guardar bloqueo', 'error');
      }
    } catch (err) {
      console.error('Error creating feriado:', err);
      showToast('Error de red al crear bloqueo', 'error');
    }
  };

  const handleDeleteFeriado = async (id, isSynthesized, originalId) => {
    const targetId = originalId || id;
    if (!confirm('¿Seguro de que deseas eliminar este feriado o bloqueo de la agenda?')) return;
    try {
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Feriado o bloqueo eliminado correctamente');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al eliminar bloqueo', 'error');
      }
    } catch (err) {
      console.error('Error deleting feriado:', err);
      showToast('Error de red al eliminar bloqueo', 'error');
    }
  };

  const handleOpenMoveModal = (feriado) => {
    const origDateStr = feriado.fecha ? (typeof feriado.fecha === 'string' ? feriado.fecha.split('T')[0] : new Date(feriado.fecha).toISOString().split('T')[0]) : '';
    const movedDateStr = feriado.fechaMovida ? (typeof feriado.fechaMovida === 'string' ? feriado.fechaMovida.split('T')[0] : new Date(feriado.fechaMovida).toISOString().split('T')[0]) : origDateStr;
    setMoveModal({
      isOpen: true,
      feriado,
      nuevaFechaStr: movedDateStr
    });
  };

  const handleSaveMoveFeriado = async () => {
    if (!moveModal.feriado || !moveModal.nuevaFechaStr) return;
    try {
      const targetId = moveModal.feriado.originalId || moveModal.feriado.id;
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaMovidaStr: moveModal.nuevaFechaStr,
          originalId: targetId
        })
      });
      if (res.ok) {
        showToast('Fecha de feriado móvil reubicada exitosamente');
        setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' });
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al reubicar fecha', 'error');
      }
    } catch (err) {
      console.error('Error moving feriado:', err);
      showToast('Error de red al reubicar fecha', 'error');
    }
  };

  const handleResetMoveFeriado = async (feriado) => {
    if (!confirm('¿Deseas restaurar la fecha original de este feriado móvil?')) return;
    try {
      const targetId = feriado.originalId || feriado.id;
      const res = await fetch(`/api/admin/bloqueos/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaMovidaStr: null,
          originalId: targetId
        })
      });
      if (res.ok) {
        showToast('Feriado restaurado a su fecha original');
        fetchFeriados(selectedFeriadosYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al restaurar fecha', 'error');
      }
    } catch (err) {
      console.error('Error resetting feriado:', err);
      showToast('Error de red al restaurar fecha', 'error');
    }
  };

  const formatFeriadoDate = (dateVal) => {
    if (!dateVal) return '';
    const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return `${parts[2]} de ${months[d.getMonth()]} de ${parts[0]}`;
    }
    return dateStr;
  };

  const getFeriadoDayName = (dateVal) => {
    if (!dateVal) return '';
    const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
    const parts = dateStr.split('T')[0].split('-');
    let d;
    if (parts.length === 3) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return '';
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[d.getDay()];
  };

  const feriadosList = Array.isArray(feriados) ? feriados : [];

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
                Todos ({feriadosList.length})
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
                🔵 Únicos ({feriadosList.filter(f => f.tipo === 'UNICO' || !f.tipo).length})
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
                🔴 Fijos ({feriadosList.filter(f => f.tipo === 'FIJO').length})
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
                🟠 Móviles ({feriadosList.filter(f => f.tipo === 'MOVIL').length})
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
        ) : feriadosList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            No hay feriados ni bloqueos registrados para el año {selectedFeriadosYear}.
          </div>
        ) : (
          <div className={styles.bloqueoCardList} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {feriadosList
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
                const hasMoved = isMovil && f.fechaMovida;
                const dotColor = f.color || (isFijo ? '#dc2626' : (isMovil ? '#d97706' : '#2563eb'));
                const dayName = getFeriadoDayName(f.fecha);
                const dateFormatted = `${formatFeriadoDate(f.fecha)} (${dayName})`;

                return (
                  <div
                    key={f.id}
                    className={styles.bloqueoCardItem}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.9rem 1.1rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    {/* Header: Dot + Badge + Fecha */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                      <span 
                        style={{
                          backgroundColor: dotColor,
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          display: 'inline-block',
                          flexShrink: 0
                        }} 
                      />
                      {isFijo ? (
                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                          FIJO
                        </span>
                      ) : isMovil ? (
                        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                          MÓVIL
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                          ÚNICO
                        </span>
                      )}
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                        {dateFormatted}
                      </span>
                    </div>

                    {/* Body: Motivo | Horario | Acciones */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1.5, minWidth: '150px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Motivo
                        </span>
                        <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600 }}>
                          {f.motivo || 'Bloqueo administrativo'}
                        </span>
                        {hasMoved && (
                          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.2rem' }}>
                            ➡️ Reubicado al: <strong>{formatFeriadoDate(f.fechaMovida)} ({getFeriadoDayName(f.fechaMovida)})</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1, minWidth: '110px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Horario
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                          {f.esDiaCompleto ? (
                            <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                              Día completo
                            </span>
                          ) : (
                            <span style={{ color: '#334155', fontWeight: 600 }}>{f.horaInicio} - {f.horaFin} hs</span>
                          )}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        {isMovil && (
                          <>
                            <button
                              type="button"
                              className={styles.actionBtnSmall}
                              onClick={() => handleOpenMoveModal(f)}
                              title="Reubicar este feriado a otra fecha"
                            >
                              🗓️ Reubicar
                            </button>
                            {hasMoved && (
                              <button
                                type="button"
                                className={styles.actionBtnSmall}
                                onClick={() => handleResetMoveFeriado(f)}
                                title="Restaurar fecha original"
                              >
                                ↩️ Restaurar
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFeriado(f.id, f.isSynthesized, f.originalId)}
                          title="Eliminar este feriado o bloqueo"
                          style={{
                            border: '1px solid #fca5a5',
                            backgroundColor: '#ffffff',
                            color: '#dc2626',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal Reubicar Feriado Móvil */}
      {moveModal.isOpen && (
        <div className={styles.modalOverlay} onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                🗓️ Reubicar Fecha de Feriado Móvil
              </div>
              <button 
                type="button" 
                className={styles.modalCloseBtn}
                onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem', lineHeight: '1.4' }}>
                Estás reubicando: <strong>{moveModal.feriado?.motivo}</strong>
                <br />
                Fecha oficial original: <strong>{formatFeriadoDate(moveModal.feriado?.fecha)} ({getFeriadoDayName(moveModal.feriado?.fecha)})</strong>
              </p>
              <div className={styles.formField}>
                <label>Nueva Fecha Efectiva para Bloquear la Agenda *</label>
                <input
                  type="date"
                  className={styles.input}
                  value={moveModal.nuevaFechaStr}
                  onChange={(e) => setMoveModal(prev => ({ ...prev, nuevaFechaStr: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMoveModal({ isOpen: false, feriado: null, nuevaFechaStr: '' })}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveMoveFeriado}
                >
                  Guardar Reubicación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
