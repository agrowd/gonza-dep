'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../configuracion/configuracion.module.css';
import { formatMilesInput, cleanMilesInput, formatMoney } from '@/lib/formatNumber.js';

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const KeyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>
);

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    nombre: '',
    usuario: '',
    password: '',
    rol: 'OPERADOR',
    comisionTipo: 'PORCENTAJE',
    comisionValor: '30',
    comisionTurnoPct: 0
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [passwordTargetName, setPasswordTargetName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/usuarios');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.usuarios) ? data.usuarios : []);
        setUsers(list);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => { if (d?.user) setCurrentUser(d.user); })
      .catch(() => {});
  }, []);

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setUserForm({
      nombre: '',
      usuario: '',
      password: '',
      rol: 'OPERADOR',
      comisionTipo: 'PORCENTAJE',
      comisionValor: '30',
      comisionTurnoPct: 0
    });
    setUserError('');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUserId(u.id);
    setUserForm({
      nombre: u.nombre,
      usuario: u.usuario,
      password: '',
      rol: u.rol,
      comisionTipo: u.comisionTipo || 'PORCENTAJE',
      comisionValor: String(u.comisionValor ?? 30),
      comisionTurnoPct: u.comisionTurnoPct ?? 0
    });
    setUserError('');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserError('');
    if (!userForm.nombre.trim() || !userForm.usuario.trim()) {
      setUserError('El nombre y el nombre de usuario son obligatorios.');
      return;
    }
    if (!editingUserId && (!userForm.password || userForm.password.length < 6)) {
      setUserError('La contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }

    setSavingUser(true);
    try {
      const payload = {
        nombre: userForm.nombre.trim(),
        usuario: userForm.usuario.trim().toLowerCase(),
        rol: userForm.rol,
        comisionTipo: userForm.comisionTipo,
        comisionValor: parseFloat(cleanMilesInput(userForm.comisionValor)) || 0,
        comisionTurnoPct: parseFloat(userForm.comisionTurnoPct) || 0
      };
      if (userForm.password && userForm.password.trim().length >= 6) {
        payload.password = userForm.password.trim();
      }

      const url = editingUserId ? `/api/admin/usuarios/${editingUserId}` : '/api/admin/usuarios';
      const method = editingUserId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar usuario.');
      }

      setShowUserModal(false);
      showToast(editingUserId ? 'Usuario actualizado exitosamente.' : 'Usuario creado exitosamente.');
      fetchUsers();
    } catch (err) {
      setUserError(err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    if (user.id === currentUser?.id) {
      showToast('No puedes desactivar tu propia cuenta de usuario.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !user.activo })
      });
      if (res.ok) {
        showToast(user.activo ? 'Usuario desactivado.' : 'Usuario activado.');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al cambiar estado.', 'error');
      }
    } catch (err) {
      showToast('Error de red al actualizar usuario.', 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      showToast('No puedes eliminar tu propia cuenta.', 'error');
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar permanentemente al usuario "${user.nombre}" (@${user.usuario})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Usuario eliminado con éxito.');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al eliminar usuario.', 'error');
      }
    } catch (err) {
      showToast('Error de red al eliminar usuario.', 'error');
    }
  };

  const handleOpenResetPassword = (u) => {
    setPasswordUserId(u.id);
    setPasswordTargetName(`${u.nombre} (@${u.usuario})`);
    setNewPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    try {
      const res = await fetch(`/api/admin/usuarios/${passwordUserId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al restablecer contraseña.');
      }
      setShowPasswordModal(false);
      showToast('Contraseña restablecida exitosamente.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const usersList = Array.isArray(users) ? users : [];

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
        <h2>👥 Gestión de Usuarios y Operadores</h2>
        <p>Administra los miembros del equipo, roles de acceso al sistema, comisiones y restablecimiento de contraseñas.</p>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <span>Equipo y Roles de Acceso</span>
          <button 
            className="btn btn-primary" 
            onClick={handleOpenNewUser}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <PlusIcon /> Nuevo Usuario / Operador
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Crea cuentas de acceso para operadores y recepcionistas. Los <strong>Operadores</strong> solo pueden ver y gestionar su agenda y clientes asignados (sin acceso a caja, costos, métricas ni configuración).
        </p>

        {loadingUsers ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gold)' }}>Cargando usuarios...</div>
        ) : usersList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay usuarios registrados.</div>
        ) : (
          <div className={styles.userCardsGrid}>
            {usersList.map(u => (
              <div key={u.id} className={`${styles.userCard} ${u.activo === false ? styles.userCardBlocked : ''}`}>
                <div className={styles.userCardHeader}>
                  <div>
                    <div className={styles.userCardName}>{u.nombre}</div>
                    <div className={styles.userCardHandle}>@{u.usuario}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                    {u.rol === 'ADMIN' && (
                      <span className={styles.roleBadgeAdmin}>👑 Admin</span>
                    )}
                    {u.rol === 'OPERADOR' && (
                      <span className={styles.roleBadgeOperador}>✂️ Operador</span>
                    )}
                    {u.rol === 'RECEPCION' && (
                      <span className={styles.roleBadgeRecepcion}>📋 Recepción</span>
                    )}
                    {Number(u.comisionTurnoPct || 0) > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px' }}>
                        🎯 {u.comisionTurnoPct}% comisionable
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.userCardRate}>
                  {u.comisionValor ? (
                    u.comisionTipo === 'PORCENTAJE'
                      ? `${u.comisionValor}% por turno`
                      : u.comisionTipo === 'POR_DIA'
                      ? `${formatMoney(u.comisionValor)} por día`
                      : `${formatMoney(u.comisionValor)} por turno`
                  ) : 'Sin comisión'}
                </div>

                <div className={styles.userCardActions}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem' }} 
                    onClick={() => handleOpenEditUser(u)}
                    title="Editar usuario"
                  >
                    <EditIcon />
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem' }} 
                    onClick={() => handleOpenResetPassword(u)}
                    title="Restablecer contraseña"
                  >
                    <KeyIcon />
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ 
                      padding: '0.35rem 0.65rem', 
                      color: u.activo === false ? '#10b981' : '#f59e0b',
                      borderColor: u.activo === false ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                    }} 
                    onClick={() => handleToggleUserStatus(u)}
                    title={u.activo === false ? 'Habilitar usuario' : 'Bloquear / Inhabilitar usuario'}
                  >
                    {u.activo === false ? '✓' : '⊘'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                    onClick={() => handleDeleteUser(u)}
                    title="Eliminar usuario permanentemente"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: NUEVO / EDITAR USUARIO */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: 'calc(100dvh - 1.5rem)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="modal-header">
              <h3>{editingUserId ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h3>
              <button type="button" onClick={() => setShowUserModal(false)} className="close-btn">&times;</button>
            </div>

            {userError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 600 }}>
                {userError}
              </div>
            )}

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', paddingBottom: '0.5rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre Completo *</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  placeholder="Ej: Lucía Méndez"
                  required 
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Usuario de Acceso *</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={userForm.usuario}
                    onChange={(e) => setUserForm({ ...userForm, usuario: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="Ej: lucia"
                    required 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Rol de Acceso *</label>
                  <select 
                    className={styles.input}
                    value={userForm.rol}
                    onChange={(e) => setUserForm({ ...userForm, rol: e.target.value })}
                  >
                    <option value="OPERADOR">Operador (Solo Agenda propia)</option>
                    <option value="RECEPCION">Recepción (Agenda + Clientes)</option>
                    <option value="ADMIN">Administrador (Acceso Total)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {editingUserId ? 'Nueva Contraseña (Opcional - dejar vacío para conservar)' : 'Contraseña de Acceso *'}
                </label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUserId ? '••••••••' : 'Mínimo 6 caracteres'}
                  required={!editingUserId}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo de Comisión</label>
                  <select 
                    className={styles.input}
                    value={userForm.comisionTipo}
                    onChange={(e) => setUserForm({ ...userForm, comisionTipo: e.target.value })}
                  >
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="POR_TURNO">Monto Fijo por Turno ($)</option>
                    <option value="POR_DIA">Monto Fijo por Día ($)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {userForm.comisionTipo === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Valor Comisión ($ ARS)'}
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    className={styles.input} 
                    value={formatMilesInput(userForm.comisionValor)}
                    onChange={(e) => setUserForm({ ...userForm, comisionValor: cleanMilesInput(e.target.value) })}
                    placeholder="Ej: 30"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>🎯 Turno comisionable (% comisión por defecto para promotor / captador)</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className={styles.input}
                  value={userForm.comisionTurnoPct ?? 0}
                  onChange={(e) => setUserForm({ ...userForm, comisionTurnoPct: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej: 10"
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowUserModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                  {savingUser ? 'Guardando...' : (editingUserId ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: 'calc(100dvh - 1.5rem)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div className="modal-header">
              <h3>🔑 Restablecer Contraseña</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="close-btn">&times;</button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Ingresa una nueva contraseña para <strong>{passwordTargetName}</strong>.
            </p>

            {passwordError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 600 }}>
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSaveResetPassword}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nueva Contraseña *</label>
                <input 
                  type="password" 
                  className={styles.input} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required 
                  autoFocus
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
