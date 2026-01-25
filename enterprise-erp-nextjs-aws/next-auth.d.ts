import NextAuth from 'next-auth';
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role:
        | 'MASTER'
        | 'ADMIN'
        | 'RH'
        | 'SUPERVISOR'
        | 'JURIDICO'
        | 'OPERACIONAL'
        | 'LAVAGEM'
        | 'AUXILIAR_ADMIN'
        | 'LUCIANO';
    };
  }
}
