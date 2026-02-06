/**
 * Prisma config for CLI / tooling that expects Prisma 7-style config.
 * Prisma 6 still uses the url in schema.prisma; this file satisfies the IDE.
 */
export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
};
