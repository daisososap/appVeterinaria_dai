// Tipos proporcionados por Express
import type { RequestHandler } from "express";

// Extrae automáticamente los parámetros de un controlador de Express: req, res, next
type FuncionAsincrona = (
  ...argumentos: Parameters<RequestHandler>
) => Promise<unknown> | unknown;

// Recibe un controlador asíncrono y devuelve un controlador compatible con Express
export const asyncHandler = (
  funcion: FuncionAsincrona,
): RequestHandler => (req, res, next) => {
  Promise.resolve(funcion(req, res, next)).catch(next);
};