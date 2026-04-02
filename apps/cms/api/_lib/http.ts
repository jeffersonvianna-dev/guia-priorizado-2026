import type { VercelResponse } from '@vercel/node';

export function sendJson(
  response: VercelResponse,
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  Object.entries(headers ?? {}).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  return response.status(status).json(data);
}

export function sendMethodNotAllowed(response: VercelResponse, allowed: string[]) {
  return sendJson(
    response,
    {
      ok: false,
      error: `Method not allowed. Use ${allowed.join(', ')}.`,
    },
    405,
    { allow: allowed.join(', ') },
  );
}

export function sendBadRequest(response: VercelResponse, message: string) {
  return sendJson(
    response,
    {
      ok: false,
      error: message,
    },
    400,
  );
}

export function sendServerError(response: VercelResponse, message: string) {
  return sendJson(
    response,
    {
      ok: false,
      error: message,
    },
    500,
  );
}
