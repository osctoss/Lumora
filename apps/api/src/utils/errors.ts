export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict detected', details?: unknown) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}
