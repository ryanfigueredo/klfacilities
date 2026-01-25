import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { verifyPassword } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logAudit, logLogin } from './audit/log';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          // Log de tentativa de login falhada
          try {
            await logLogin(
              'unknown',
              credentials.email,
              'unknown',
              '127.0.0.1',
              'auth',
              false,
              'Usuário não encontrado'
            );
          } catch (error) {
            console.error('Erro ao logar tentativa de login:', error);
          }
          return null;
        }

        // Verificar se o usuário está ativo
        if (user.ativo === false) {
          // Log de tentativa de login falhada
          try {
            await logLogin(
              user.id,
              credentials.email,
              user.role,
              '127.0.0.1',
              'auth',
              false,
              'Usuário desativado'
            );
          } catch (error) {
            console.error('Erro ao logar tentativa de login:', error);
          }
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          // Log de tentativa de login falhada
          try {
            await logLogin(
              user.id,
              credentials.email,
              user.role,
              '127.0.0.1',
              'auth',
              false,
              'Senha incorreta'
            );
          } catch (error) {
            console.error('Erro ao logar tentativa de login:', error);
          }
          return null;
        }

        // Log de login bem-sucedido
        try {
          await logLogin(
            user.id,
            user.email,
            user.role,
            '127.0.0.1',
            'auth',
            true
          );
        } catch (error) {
          console.error('Erro ao logar login bem-sucedido:', error);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role =
          ((user as any).role as
            | 'MASTER'
            | 'ADMIN'
            | 'RH'
            | 'SUPERVISOR'
            | 'JURIDICO'
            | 'OPERACIONAL') || 'RH';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as
          | 'MASTER'
          | 'ADMIN'
          | 'RH'
          | 'SUPERVISOR'
          | 'JURIDICO'
          | 'OPERACIONAL';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      if (token) {
        await logAudit({
          action: 'user.logout',
          resource: 'User',
          resourceId: token.id as string,
          userId: token.id as string,
          userEmail: token.email as string,
          userRole: token.role as string,
          success: true,
          ip: '127.0.0.1',
          userAgent: 'auth',
          method: 'POST',
          url: '/api/auth/signout',
          description: `Logout realizado: ${token.email}`,
        });
      }
    },
  },
};
