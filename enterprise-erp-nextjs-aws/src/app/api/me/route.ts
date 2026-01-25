import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, roleLabel } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id, name, email } = user as any;
    const role = (user as any).role as string | undefined;
    return NextResponse.json({
      id,
      name,
      email,
      photoUrl: (user as any).photoUrl,
      role,
      roleLabel: roleLabel(role),
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
