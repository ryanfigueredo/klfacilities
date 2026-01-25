export const dynamic = 'force-dynamic';

export default function ChecklistAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use the standard app shell (sidebar + topbar + breadcrumbs)
  // to keep Checklist Admin pages consistent with the rest of the app.
  const AppShell = require('@/components/layout/AppShell')
    .AppShell as React.FC<{
    children: React.ReactNode;
  }>;
  return <AppShell>{children}</AppShell>;
}
