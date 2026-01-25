export const dynamic = 'force-dynamic';

// Layout público para /ponto/scan - não usa AppShell
export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

