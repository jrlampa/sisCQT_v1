export type HttpErrorDetails = unknown;

/**
 * Erro "controlado" para respostas HTTP (mensagem segura para o cliente).
 */
export class HttpError extends Error {
  status: number;
  details?: HttpErrorDetails;
  cause?: unknown;

  constructor(status: number, message: string, details?: HttpErrorDetails, cause?: unknown) {
    // Node 20 suporta ErrorOptions; tipagem pode variar entre libs/targets.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(message, cause !== undefined ? ({ cause } as any) : undefined);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.cause = cause;
  }
}

