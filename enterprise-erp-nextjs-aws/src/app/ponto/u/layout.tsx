export const dynamic = 'force-dynamic';

// Layout público para /ponto/u/[slug] - não usa AppShell
export default function PontoPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

