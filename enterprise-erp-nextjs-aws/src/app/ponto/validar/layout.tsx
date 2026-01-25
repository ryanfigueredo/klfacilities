export const dynamic = 'force-dynamic';

// Layout público para /ponto/validar - não usa AppShell
export default function ValidarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

