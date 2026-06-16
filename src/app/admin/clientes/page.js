'use client';

import { useState, useEffect } from 'react';
import styles from './clientes.module.css';
import agendaStyles from '../agenda/agenda.module.css';

// SVG Icons
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

export default function ClientesPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Profile modal states
  const [selectedClient, setSelectedClient] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  // Edit notes state
  const [editNotes, setEditNotes] = useState({
    frecuencia: 4,
    observaciones: '',
    notasGonzalo: ''
  });
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch clients list
  const fetchClients = () => {
    setLoading(true);
    fetch(`/api/admin/clientes?search=${search}&filter=${filter}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data);
        }
      })
      .catch(err => console.error('Error fetching clients:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, [filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients();
  };

  // Fetch individual profile details
  const handleClientClick = (clientId) => {
    fetch(`/api/admin/clientes/${clientId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSelectedClient(data);
          setEditNotes({
            frecuencia: data.frecuencia,
            observaciones: data.observaciones || '',
            notasGonzalo: data.notasGonzalo || ''
          });
          setActiveTab('history');
          setIsProfileOpen(true);
        }
      })
      .catch(err => console.error('Error fetching client profile:', err));
  };

  // Save admin profile notes/frequency settings
  const handleSaveNotes = async (e) => {
    e.preventDefault();
    setIsSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/clientes/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editNotes)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedClient({
          ...selectedClient,
          frecuencia: data.frecuencia,
          observaciones: data.observaciones,
          notasGonzalo: data.notasGonzalo
        });
        alert('Ficha del cliente actualizada correctamente.');
        fetchClients(); // refresh list
      }
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Delete client
  const handleDeleteClient = async (clientId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente? Esto borrará también todo su historial de turnos.')) return;
    try {
      const res = await fetch(`/api/admin/clientes/${clientId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsProfileOpen(false);
        fetchClients();
      }
    } catch (e) {
      console.error('Error deleting client:', e);
    }
  };

  // Calculations for profile overview
  const getProfileStats = (client) => {
    if (!client || !client.turnos) return { count: 0, lastDate: 'Nunca', timeSinceLast: 'N/A' };
    
    const turnosRealizados = client.turnos.filter(t => t.estado === 'REALIZADO');
    const count = turnosRealizados.length;
    
    let lastDate = 'Nunca';
    let timeSinceLast = 'N/A';

    if (count > 0) {
      // client.turnos are ordered by date desc
      const last = turnosRealizados[0];
      const lastD = new Date(last.fecha);
      lastDate = lastD.toLocaleDateString('es-ES', { dateStyle: 'medium' });

      // time elapsed
      const diffTime = Math.abs(new Date() - lastD);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        timeSinceLast = `${diffDays} días`;
      } else {
        const months = Math.floor(diffDays / 30);
        const days = diffDays % 30;
        timeSinceLast = `${months} ${months === 1 ? 'mes' : 'meses'}${days > 0 ? ` y ${days} días` : ''}`;
      }
    }

    // Next turn if any
    const nextTurn = client.turnos.find(t => new Date(t.fecha) >= new Date() && t.estado !== 'CANCELADO');

    return {
      count,
      lastDate,
      timeSinceLast,
      nextTurn
    };
  };

  const stats = selectedClient ? getProfileStats(selectedClient) : null;

  return (
    <div>
      {/* Page Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h2>Directorio de Clientes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Busca, filtra y revisa las fichas digitales de tus clientes.</p>
        </div>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar cliente por nombre, email o WhatsApp..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', padding: '0.75rem 1.25rem' }}>
          <SearchIcon /> Buscar
        </button>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '220px' }}
        >
          <option value="all">Todos los clientes</option>
          <option value="new">Clientes nuevos (≤ 1 sesión)</option>
          <option value="recurrent">Clientes recurrentes (&gt; 1 sesión)</option>
          <option value="upcoming">Con turno próximo</option>
          <option value="no_upcoming">Sin próximo turno</option>
          <option value="canceled">Que han cancelado</option>
          <option value="no_show">Que no asistieron</option>
        </select>
      </form>

      {/* List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gold)' }}>
          Cargando listado de clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
          No se encontraron clientes con los filtros aplicados.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.clientsTable}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>WhatsApp</th>
                <th>Email</th>
                <th>Sesiones</th>
                <th>Canal</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const realizadosCount = client.turnos.filter(t => t.estado === 'REALIZADO').length;
                return (
                  <tr key={client.id}>
                    <td onClick={() => handleClientClick(client.id)} className={styles.clientName}>
                      {client.nombreCompleto}
                    </td>
                    <td className={styles.metaText}>{client.whatsapp}</td>
                    <td className={styles.metaText}>{client.email}</td>
                    <td style={{ fontWeight: 600 }}>{realizadosCount}</td>
                    <td className={styles.metaText} style={{ textTransform: 'capitalize' }}>
                      {client.canalAdquisicion.toLowerCase().replace('_', ' ')}
                    </td>
                    <td>
                      <span className={`${agendaStyles.statusPill} ${client.estado === 'ACTIVO' ? agendaStyles.badgeSenado : agendaStyles.badgeNoAsistio}`} style={{ fontSize: '0.7rem' }}>
                        {client.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PROFILE MODAL (Ficha completa) */}
      {isProfileOpen && selectedClient && stats && (
        <div className={agendaStyles.modalOverlay}>
          <div className={`glass-card premium-border ${agendaStyles.modalContent}`} style={{ maxWidth: '850px' }}>
            <div className={agendaStyles.modalHeader}>
              <div>
                <h3 className={styles.ficheTitle}>{selectedClient.nombreCompleto}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alta: {new Date(selectedClient.fechaAlta).toLocaleDateString('es-ES')} | Canal: {selectedClient.canalAdquisicion}</span>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className={agendaStyles.closeBtn}>&times;</button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button onClick={() => setActiveTab('history')} className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}>Ficha Histórica</button>
              <button onClick={() => setActiveTab('logs')} className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}>Historial Notificaciones</button>
              <button onClick={() => setActiveTab('settings')} className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}>Notas y Configuración</button>
            </div>

            {/* TAB CONTENT: History */}
            {activeTab === 'history' && (
              <div className={styles.ficheContainer}>
                <div className={styles.grid2}>
                  
                  {/* Left Column: Quick Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className={styles.cardSection}>
                      <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Sesiones Realizadas</span>
                      <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-gold)' }}>{stats.count}</span>
                    </div>
                    
                    <div className={styles.cardSection}>
                      <span className={styles.detailLabel} style={{ display: 'block', marginBottom: '0.5rem' }}>Última sesión</span>
                      <span className={styles.detailValue} style={{ fontSize: '1.05rem' }}>{stats.lastDate}</span>
                      {stats.count > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>Hace: {stats.timeSinceLast}</span>
                      )}
                    </div>

                    <div className={styles.cardSection}>
                      <span className={styles.detailLabel} style={{ display: 'block', marginBottom: '0.5rem' }}>Próximo Turno</span>
                      {stats.nextTurn ? (
                        <div>
                          <span className={styles.detailValue} style={{ color: 'var(--color-gold)', fontSize: '1.05rem', fontWeight: 700 }}>
                            {new Date(stats.nextTurn.fecha).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginTop: '0.25rem' }}>
                            {stats.nextTurn.horaInicio} a {stats.nextTurn.horaFin}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Zonas: {JSON.parse(stats.nextTurn.zonas).map(z => z.nombre).join(', ')}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Saldo: ${stats.nextTurn.saldoPendiente.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.detailValue} style={{ color: 'var(--text-muted)' }}>Sin turnos próximos</span>
                      )}
                    </div>

                    {/* Quick Contacts Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <a href={`https://wa.me/${selectedClient.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderColor: '#25D366', color: '#25D366' }}>
                        💬 WhatsApp del Cliente
                      </a>
                      <button onClick={() => handleDeleteClient(selectedClient.id)} className="btn btn-secondary" style={{ borderColor: 'var(--status-cancelado)', color: '#ff8a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <TrashIcon /> Eliminar Cliente
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Paper-card history */}
                  <div className={styles.cardSection}>
                    <h3 className={styles.cardSectionTitle}>Historial de Turnos</h3>
                    
                    {selectedClient.turnos.length === 0 ? (
                      <div className={styles.emptyState}>Sin historial registrado</div>
                    ) : (
                      <div className={styles.paperList}>
                        {selectedClient.turnos.map((t, idx) => {
                          const isCanceled = t.estado === 'CANCELADO';
                          let zonas = '';
                          try {
                            zonas = JSON.parse(t.zonas).map(z => z.nombre).join(', ');
                          } catch (e) {
                            zonas = t.zonas;
                          }

                          return (
                            <div key={t.id} className={`${styles.paperItem} ${isCanceled ? styles.paperItemCanceled : ''}`}>
                              <div className={styles.paperItemHeader}>
                                <span className={styles.paperDate}>
                                  {selectedClient.turnos.length - idx}) {new Date(t.fecha).toLocaleDateString('es-ES')} - {t.horaInicio} hs
                                </span>
                                <span className={`${agendaStyles.statusPill} ${getStatusLabelClass(t.estado)}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                                  {t.estado}
                                </span>
                              </div>
                              <div className={styles.paperZonas}>Zonas: {zonas}</div>
                              <div className={styles.paperMeta}>
                                <span>Costo: ${t.valorTotal.toLocaleString()}</span>
                                <span>Seña: ${t.valorSeña.toLocaleString()}</span>
                                <span>Saldo: ${t.saldoPendiente.toLocaleString()}</span>
                              </div>
                              {t.observaciones && (
                                <div className={styles.paperNotes}>
                                  <strong>Nota:</strong> {t.observaciones}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Logs */}
            {activeTab === 'logs' && (
              <div className={styles.cardSection}>
                <h3 className={styles.cardSectionTitle}>Mensajes Enviados</h3>
                {selectedClient.notificaciones.length === 0 ? (
                  <div className={styles.emptyState}>No hay notificaciones enviadas a este cliente.</div>
                ) : (
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {selectedClient.notificaciones.map(n => (
                      <div key={n.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          <span>{new Date(n.fechaEnvio).toLocaleString('es-ES')} | Canal: {n.canal}</span>
                          <span style={{ color: n.estado === 'ENVIADO' ? '#81c784' : '#ff8a8a', fontWeight: 600 }}>{n.estado}</span>
                        </div>
                        <p style={{ color: '#fff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{n.mensaje}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Settings & Notes */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveNotes} className={styles.ficheContainer}>
                <div className={styles.cardSection}>
                  <h3 className={styles.cardSectionTitle}>Anotaciones de Ficha Digital</h3>
                  
                  <div className={styles.detailGrid} style={{ gridTemplateColumns: '1fr' }}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Tratamiento cada cuántas semanas (Frecuencia) *</label>
                      <input
                        type="number"
                        value={editNotes.frecuencia}
                        onChange={(e) => setEditNotes({ ...editNotes, frecuencia: Number(e.target.value) })}
                        required
                        min="1"
                        max="24"
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Observaciones Administrativas (Comentarios personales, CBU, trabajo, etc.)</label>
                      <textarea
                        value={editNotes.observaciones}
                        onChange={(e) => setEditNotes({ ...editNotes, observaciones: e.target.value })}
                        placeholder="Ej. Trabaja en tribunales, buena tolerancia al dolor, suele transferir al instante."
                        rows="4"
                      />
                    </div>

                    <div className={styles.inputGroup} style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.25rem' }}>
                      <label className={styles.inputLabel} style={{ color: 'var(--color-gold)' }}>🛡️ Observaciones Exclusivas para Gonzalo</label>
                      <textarea
                        value={editNotes.notasGonzalo}
                        onChange={(e) => setEditNotes({ ...editNotes, notasGonzalo: e.target.value })}
                        placeholder="Comentarios importantes de seguridad clínica o indicaciones específicas de Gonzalo..."
                        rows="3"
                        style={{ borderColor: 'rgba(var(--color-gold-rgb), 0.3)' }}
                      />
                    </div>
                  </div>
                </div>

                <div className={agendaStyles.modalFooter}>
                  <button type="button" onClick={() => setIsProfileOpen(false)} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={isSavingNotes}>
                    {isSavingNotes ? 'Guardando...' : 'Guardar Ficha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
