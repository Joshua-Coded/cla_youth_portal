import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { programmesList } from '@/lib/analytics';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'Leaders’ Dashboard' };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const programmes = (await programmesList()).filter((p) => p.is_active);
  return (
    <div className="shell">
      <Sidebar programmes={programmes.map(({ id, name, color }) => ({ id, name, color }))} />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
