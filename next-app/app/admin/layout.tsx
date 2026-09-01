import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      {children}
      {/* Toasts del panel: los avisos con "Deshacer" (UndoNotice) viven acá. */}
      <Toaster position="bottom-center" />
    </AdminShell>
  );
}
