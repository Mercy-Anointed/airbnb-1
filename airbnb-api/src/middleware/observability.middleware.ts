import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

const startedAt = Date.now();
const counters = {
  httpRequestsTotal: 0,
  httpErrorsTotal: 0,
};

export const observabilityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.header('x-request-id') ?? crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  counters.httpRequestsTotal += 1;

  res.on('finish', () => {
    if (res.statusCode >= 500) counters.httpErrorsTotal += 1;
  });

  next();
};

export const getMetrics = () => {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  return [
    '# HELP airbnb_http_requests_total Total HTTP requests handled by this process.',
    '# TYPE airbnb_http_requests_total counter',
    `airbnb_http_requests_total ${counters.httpRequestsTotal}`,
    '# HELP airbnb_http_errors_total Total 5xx HTTP responses from this process.',
    '# TYPE airbnb_http_errors_total counter',
    `airbnb_http_errors_total ${counters.httpErrorsTotal}`,
    '# HELP airbnb_process_uptime_seconds Process uptime in seconds.',
    '# TYPE airbnb_process_uptime_seconds gauge',
    `airbnb_process_uptime_seconds ${uptimeSeconds}`,
  ].join('\n');
};
