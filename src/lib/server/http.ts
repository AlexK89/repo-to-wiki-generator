import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void;

export const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload, null, 2));
};

export const sendMethodNotAllowed = (
  response: ServerResponse,
  allowedMethods: string[],
) => {
  response.setHeader("allow", allowedMethods.join(", "));
  sendJson(response, 405, {
    error: "Method not allowed",
    allowedMethods,
  });
};

export const getRequestUrl = (request: IncomingMessage) =>
  new URL(request.url ?? "/", "http://localhost");

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown server error";
