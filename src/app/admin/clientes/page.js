'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './clientes.module.css';
import agendaStyles from '../agenda/agenda.module.css';

// SVG Icons
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

const getStatusLabelClass = (status) => {
  switch (status) {
    case 'SEÑADO': return agendaStyles.badgeSenado;
    case 'REALIZADO': return agendaStyles.badgeRealizado;
    case 'CANCELADO': return agendaStyles.badgeCancelado;
    case 'REPROGRAMADO': return agendaStyles.badgeReprogramado;
    case 'NO_ASISTIO': return agendaStyles.badgeNoAsistio;
    case 'PENDIENTE_AUTORIZACION': return agendaStyles.badgePendienteAut;
    case 'PENDIENTE_PAGO': return agendaStyles.badgePendientePago;
    default: return '';
  }
};

function ClientesPageContent() {
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get('id');

  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Profile modal states
  const [selectedClient, setSelectedClient] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  // Create client modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    nombre: '',
    apellido: '',
    nombreCompleto: '',
    whatsapp: '',
    email: '',
    dni: '',
    frecuencia: 4,
    observaciones: '',
    notesGonzalo: '',
    canalAdquisicion: 'MANUAL'
  });

  // Edit notes state
  const [editNotes, setEditNotes] = useState({
    nombre: '',
    apellido: '',
    nombreCompleto: '',
    whatsapp: '',
    email: '',
    dni: '',
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

  // Trigger search profile when query param 'id' is present
  useEffect(() => {
    if (initialClientId) {
      handleClientClick(initialClientId);
    }
  }, [initialClientId]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newClient,
        nombreCompleto: `${newClient.nombre.trim()} ${newClient.apellido.trim()}`.trim()
      };
      const res = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setNewClient({
          nombre: '',
          apellido: '',
          nombreCompleto: '',
          whatsapp: '',
          email: '',
          dni: '',
          frecuencia: 4,
          observaciones: '',
          notesGonzalo: '',
          canalAdquisicion: 'MANUAL'
        });
        fetchClients();
      } else {
        const errData = await res.json();
        alert(`Error al crear cliente: ${errData.error || 'error desconocido'}`);
      }
    } catch (err) {
      console.error('Error creating client:', err);
      alert('Error de red al crear cliente.');
    }
  };

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
          const fullName = data.nombreCompleto || '';
          const spaceIndex = fullName.indexOf(' ');
          const nombre = spaceIndex !== -1 ? fullName.substring(0, spaceIndex) : fullName;
          const apellido = spaceIndex !== -1 ? fullName.substring(spaceIndex + 1) : '';

          setSelectedClient(data);
          setEditNotes({
            nombre,
            apellido,
            nombreCompleto: fullName,
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            dni: data.dni || '',
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
      const payload = {
        ...editNotes,
        nombreCompleto: `${editNotes.nombre.trim()} ${editNotes.apellido.trim()}`.trim()
      };
      const res = await fetch(`/api/admin/clientes/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedClient({
          ...selectedClient,
          nombreCompleto: data.nombreCompleto,
          whatsapp: data.whatsapp,
          email: data.email,
          dni: data.dni,
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
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h2>Directorio de Clientes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Busca, filtra y revisa las fichas digitales de tus clientes.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
          + Crear Nuevo Cliente
        </button>
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
          <div className={`glass-card premium-border ${agendaStyles.modalContent}`} style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', padding: 0 }}>
            <div className={agendaStyles.modalHeader} style={{ padding: '1.5rem 1.5rem 0.75rem 1.5rem', marginBottom: 0 }}>
              <div>
                <h3 className={styles.ficheTitle}>{selectedClient.nombreCompleto}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Alta: {new Date(selectedClient.fechaAlta).toLocaleDateString('es-ES')} | DNI: {selectedClient.dni || 'Sin registrar'} | Canal: {selectedClient.canalAdquisicion}</span>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className={agendaStyles.closeBtn} style={{ fontSize: '2rem', marginTop: '-0.5rem' }}>&times;</button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs} style={{ padding: '0 1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <button onClick={() => setActiveTab('history')} className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}>Ficha Histórica</button>
              <button onClick={() => setActiveTab('logs')} className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}>Historial Notificaciones</button>
              <button onClick={() => setActiveTab('settings')} className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}>Notas y Configuración</button>
            </div>

            {/* Scrollable Content Container */}
            <div style={{ overflowY: 'auto', padding: '0 1.5rem 1.5rem 1.5rem', flex: 1 }}>

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
                  <h3 className={styles.cardSectionTitle}>Datos del Cliente</h3>
                  
                  <div className={styles.detailGrid} style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Nombre *</label>
                      <input
                        type="text"
                        value={editNotes.nombre || ''}
                        onChange={(e) => setEditNotes({ ...editNotes, nombre: e.target.value })}
                        required
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Apellido *</label>
                      <input
                        type="text"
                        value={editNotes.apellido || ''}
                        onChange={(e) => setEditNotes({ ...editNotes, apellido: e.target.value })}
                        required
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>DNI</label>
                      <input
                        type="text"
                        value={editNotes.dni}
                        onChange={(e) => setEditNotes({ ...editNotes, dni: e.target.value })}
                        placeholder="Sin registrar"
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>WhatsApp *</label>
                      <div className={styles.phoneInputContainer}>
                        <div className={styles.phonePrefix}>
                          <span className={styles.flagIcon}>🇦🇷</span>
                          <span>+54</span>
                        </div>
                        <input
                          type="tel"
                          value={editNotes.whatsapp}
                          onChange={(e) => setEditNotes({ ...editNotes, whatsapp: e.target.value })}
                          required
                          style={{ border: 'none', borderRadius: 0, flex: 1, padding: '0.75rem', outline: 'none', backgroundColor: 'transparent', color: '#fff' }}
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.inputLabel}>Email *</label>
                      <input
                        type="email"
                        value={editNotes.email}
                        onChange={(e) => setEditNotes({ ...editNotes, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

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
                      <label className={styles.inputLabel} style={{ color: 'var(--color-gold)' }}>🛡️ Observaciones del Operador</label>
                      <textarea
                        value={editNotes.notasGonzalo}
                        onChange={(e) => setEditNotes({ ...editNotes, notasGonzalo: e.target.value })}
                        placeholder="Comentarios importantes de seguridad clínica o indicaciones específicas del operador..."
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
        </div>
      )}
      {/* CREATE CLIENT MODAL */}
      {isCreateOpen && (
        <div className={agendaStyles.modalOverlay}>
          <div className={`glass-card premium-border ${agendaStyles.modalContent}`} style={{ maxWidth: '550px' }}>
            <div className={agendaStyles.modalHeader}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-gold)' }}>Crear Nuevo Cliente</h3>
              <button onClick={() => setIsCreateOpen(false)} className={agendaStyles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleCreateClient}>
              <div className={agendaStyles.detailGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.inputRow}>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Nombre *</label>
                    <input
                      type="text"
                      value={newClient.nombre || ''}
                      onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                      required
                      placeholder="Ej. Juan"
                    />
                  </div>
                  <div className={styles.inputGroup} style={{ flex: 1 }}>
                    <label className={styles.inputLabel}>Apellido *</label>
                    <input
                      type="text"
                      value={newClient.apellido || ''}
                      onChange={(e) => setNewClient({ ...newClient, apellido: e.target.value })}
                      required
                      placeholder="Ej. Pérez"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>DNI (para validación única)</label>
                  <input
                    type="text"
                    value={newClient.dni}
                    onChange={(e) => setNewClient({ ...newClient, dni: e.target.value })}
                    placeholder="Ej. 12345678"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>WhatsApp *</label>
                  <div className={styles.phoneInputContainer}>
                    <div className={styles.phonePrefix}>
                      <span className={styles.flagIcon}>🇦🇷</span>
                      <span>+54</span>
                    </div>
                    <input
                      type="tel"
                      value={newClient.whatsapp}
                      onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
                      required
                      placeholder="Ej. 11 7673 5678"
                      style={{ border: 'none', borderRadius: 0, flex: 1, padding: '0.75rem', outline: 'none', backgroundColor: 'transparent', color: '#fff' }}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email *</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    required
                    placeholder="Ej. cliente@correo.com"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Canal de Adquisición *</label>
                  <select
                    value={newClient.canalAdquisicion}
                    onChange={(e) => setNewClient({ ...newClient, canalAdquisicion: e.target.value })}
                    required
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="ORGANICO">Orgánico (Web)</option>
                    <option value="RECOMENDADO">Recomendado</option>
                    <option value="REDES_SOCIALES">Redes Sociales</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Frecuencia Estimada (Semanas) *</label>
                  <input
                    type="number"
                    value={newClient.frecuencia}
                    onChange={(e) => setNewClient({ ...newClient, frecuencia: Number(e.target.value) })}
                    required
                    min="1"
                    max="24"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Observaciones Administrativas</label>
                  <textarea
                    value={newClient.observaciones}
                    onChange={(e) => setNewClient({ ...newClient, observaciones: e.target.value })}
                    placeholder="Detalles sobre el cliente..."
                    rows="3"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel} style={{ color: 'var(--color-gold)' }}>Observaciones del Operador</label>
                  <textarea
                    value={newClient.notasGonzalo}
                    onChange={(e) => setNewClient({ ...newClient, notasGonzalo: e.target.value })}
                    placeholder="Observaciones de seguridad clínica..."
                    rows="3"
                    style={{ borderColor: 'rgba(var(--color-gold-rgb), 0.3)' }}
                  />
                </div>
              </div>

              <div className={agendaStyles.modalFooter} style={{ marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-gold)' }}>Cargando página...</div>}>
      <ClientesPageContent />
    </Suspense>
  );
}
