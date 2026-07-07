'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './layout.module.css';

// SVG Icons
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

export default function SidebarNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [wppStatus, setWppStatus] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        setWppStatus(data.status);
      } catch (e) {
        console.error('Error fetching WhatsApp status in nav:', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { name: 'Agenda', path: '/admin/agenda', icon: <CalendarIcon /> },
    { name: 'Clientes', path: '/admin/clientes', icon: <UsersIcon /> },
    { name: 'Estadísticas', path: '/admin/estadisticas', icon: <ChartIcon /> },
    { name: 'Notificaciones', path: '/admin/notificaciones', icon: <BellIcon /> },
    { name: 'Configuración', path: '/admin/configuracion', icon: <SettingsIcon /> },
  ];

  const isPrintPage = pathname === '/admin/agenda/imprimir';

  if (isPrintPage) {
    return (
      <style dangerouslySetInnerHTML={{__html: `
        aside,
        .${styles.mobileToggleBtn},
        .${styles.mobileBackdrop} {
          display: none !important;
        }
        main,
        [class*="contentArea"] {
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        body, html {
          background: #ffffff !important;
          color: #000000 !important;
        }
      `}} />
    );
  }

  return (
    <>
      {/* Mobile Hamburger Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={styles.mobileToggleBtn}
        aria-label="Abrir menú"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </>
          )}
        </svg>
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && <div className={styles.mobileBackdrop} onClick={() => setIsOpen(false)}></div>}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src="/logo.png" alt="Gonzalo" style={{ width: '210px', height: 'auto', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.35))' }} />

          {/* Close button for mobile inside sidebar */}
          <button onClick={() => setIsOpen(false)} className={styles.mobileCloseBtn} aria-label="Cerrar menú">
            &times;
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname ? pathname.startsWith(item.path) : false;
            const isNotifications = item.path === '/admin/notificaciones';
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span>{item.name}</span>
                {isNotifications && wppStatus && (
                  <span 
                    title={wppStatus === 'CONNECTED' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado (Escanea QR)'} 
                    style={{
                      marginLeft: 'auto',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: wppStatus === 'CONNECTED' ? '#4caf50' : '#f44336',
                      boxShadow: wppStatus === 'CONNECTED' ? '0 0 8px #4caf50' : '0 0 8px #f44336',
                      display: 'inline-block'
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {wppStatus && wppStatus !== 'CONNECTED' && (
          <Link 
            href="/admin/notificaciones"
            onClick={() => setIsOpen(false)}
            style={{
              margin: '0 0.5rem 1rem 0.5rem',
              padding: '0.6rem 0.8rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#f44336',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              cursor: 'pointer',
              lineHeight: '1.3'
            }}
          >
            <span>⚠️</span>
            <span>WhatsApp desconectado. Hacé clic para vincular.</span>
          </Link>
        )}

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre || 'Administrador'}</span>
            <span className={styles.userRole}>{user?.rol === 'ADMIN' ? 'Administrador' : 'Solo Lectura'}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOutIcon />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
