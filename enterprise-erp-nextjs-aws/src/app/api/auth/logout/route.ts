import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // limpa cookie de sessão proprietária; ajuste o nome/path/domínio conforme seu app
  res.cookies.set('kl.session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 0,
    path: '/',
  });
  return res;
}
