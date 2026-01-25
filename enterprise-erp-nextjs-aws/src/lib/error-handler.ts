import { z } from 'zod';

export interface AppError {
  message: string;
  code: string;
  statusCode: number;
  context?: Record<string, unknown>;
}

export class ValidationError extends Error {
  public code: string;
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class AuthenticationError extends Error {
  public code: string;
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class AuthorizationError extends Error {
  public code: string;
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class NotFoundError extends Error {
  public code: string;
  public statusCode: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export function handleZodError(error: z.ZodError): AppError {
  const firstError = error.issues[0];
  const field = firstError.path.join('.');

  return {
    message: `Campo inválido: ${field} - ${firstError.message}`,
    code: 'VALIDATION_ERROR',
    statusCode: 400,
    context: {
      field,
      details: error.issues,
    },
  };
}

export function handlePrismaError(error: unknown): AppError {
  // Prisma unique constraint violation
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    const field =
      (error as { meta?: { target?: string[] } }).meta?.target?.[0] || 'campo';
    return {
      message: `${field} já existe no sistema`,
      code: 'DUPLICATE_ENTRY',
      statusCode: 409,
      context: { field, originalError: error },
    };
  }

  // Prisma record not found
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2025'
  ) {
    return {
      message: 'Registro não encontrado',
      code: 'NOT_FOUND',
      statusCode: 404,
      context: { originalError: error },
    };
  }

  // Prisma foreign key constraint violation
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2003'
  ) {
    const field =
      (error as { meta?: { field_name?: string } }).meta?.field_name || 'campo';
    return {
      message: `${field} referenciado não existe`,
      code: 'FOREIGN_KEY_VIOLATION',
      statusCode: 400,
      context: { field, originalError: error },
    };
  }

  // Default Prisma error
  return {
    message: 'Erro no banco de dados',
    code: 'DATABASE_ERROR',
    statusCode: 500,
    context: { originalError: error },
  };
}

export function handleGenericError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (
    error instanceof ValidationError ||
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError
  ) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    };
  }

  // If it's a Zod error, handle it
  if (error instanceof z.ZodError) {
    return handleZodError(error);
  }

  // If it's a Prisma error, handle it
  if (error && typeof error === 'object' && 'code' in error) {
    return handlePrismaError(error);
  }

  // Generic error
  return {
    message: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    context: { originalError: error },
  };
}
