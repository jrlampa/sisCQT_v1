import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';

function isPrismaKnownError(err: any): err is { name: string; code: string; meta?: any } {
  return err?.name === 'PrismaClientKnownRequestError' && typeof err?.code === 'string';
}

function isPrismaValidationError(err: any): boolean {
  return err?.name === 'PrismaClientValidationError';
}

function mapPrismaKnownError(err: { code: string; meta?: any }): { status: number; message: string } {
  // Referência de códigos: https://www.prisma.io/docs/orm/reference/error-reference
  switch (err.code) {
    case 'P2002':
      return { status: 409, message: 'Conflito: registro já existe.' };
    case 'P2003':
      return { status: 409, message: 'Conflito de integridade referencial.' };
    case 'P2025':
      return { status: 404, message: 'Recurso não encontrado.' };
    default:
      return { status: 400, message: 'Operação inválida.' };
  }
}

/**
 * Middleware global para padronizar erros e evitar vazamento de detalhes internos (ex.: Prisma).
 *
 * Resposta padrão:
 * - { success: false, error: string, details?: any }
 */
export const errorHandler: ErrorRequestHandler = (err: any, req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';

  const rootErr = err instanceof HttpError && err.cause !== undefined ? err.cause : err;

  let status = 500;
  let message = 'Erro interno do servidor.';
  let details: any = undefined;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    details = err.details ?? undefined;
  } else if (rootErr instanceof ZodError) {
    status = 400;
    message = 'Dados inválidos.';
    details = rootErr.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
  } else if (isPrismaValidationError(rootErr)) {
    status = 400;
    message = 'Dados inválidos.';
  } else if (isPrismaKnownError(rootErr)) {
    const mapped = mapPrismaKnownError(rootErr);
    status = mapped.status;
    message = mapped.message;
  }

  // Log sempre, mas sem expor detalhes internos ao cliente.
  const logPayload = {
    status,
    path: req.originalUrl,
    method: req.method,
    name: rootErr?.name,
    code: rootErr?.code,
    // Evita logar objetos enormes acidentalmente; stack só em não-prod.
    msg: rootErr?.message,
    stack: !isProd ? rootErr?.stack : undefined,
  };
  if (status >= 500) console.error('Unhandled server error:', logPayload);
  else console.warn('Request error:', logPayload);

  const body: any = { success: false, error: message };
  if (details !== undefined) body.details = details;

  // Em desenvolvimento, ajuda debug sem vazar mensagem do Prisma (nem stack inteira).
  if (!isProd && status >= 500) {
    body.debug = {
      name: rootErr?.name,
      code: rootErr?.code,
    };
  }

  return res.status(status).json(body);
};

