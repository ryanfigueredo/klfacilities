import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Gera um token JWT para o usuário
 */
export function generateJWT(userId: string, email: string, role: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d', // Token expira em 30 dias
  });
}

/**
 * Verifica e decodifica um token JWT
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Erro ao verificar JWT:', error);
    return null;
  }
}
