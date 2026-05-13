import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, unknown> | unknown[];

}

export type ApiResponseShape<T> = SuccessResponse<T> | ErrorResponse;

export const ApiResponse = {
  success<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json({ success: true, data });
  },

  created<T>(res: Response, data: T): Response {
    return this.success(res, data, 201);
  },

  noContent(res: Response): Response {
    return res.status(204).send();
  },

  error(res: Response, message: string, statusCode = 400, errors?:Record< string, unknown> | unknown[]): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  },

  notFound(res: Response, resource = 'Resource'): Response {
    return this.error(res, `${resource} not found`, 404);
  },

  unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  },

  forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  },

  validationError(res: Response, errors:Record<string, unknown> | unknown[]): Response {
    return this.error(res, 'Validation failed', 422, errors);
  },

  serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  },
};