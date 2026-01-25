import { prisma } from '@/lib/prisma';
export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}
