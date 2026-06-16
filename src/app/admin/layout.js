import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth.js';
import SidebarNav from './SidebarNav.js';
import styles from './layout.module.css';

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  const session = verifySessionToken(sessionCookie?.value);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar Nav (Client Component) */}
      <SidebarNav user={session} />
      
      {/* Main Content Area */}
      <main className={styles.contentArea}>
        {children}
      </main>
    </div>
  );
}
