//Controlador para validar los datos, aplicar las reglas de
//negocio y llamar al repositorio y consultas http

import type { Request, Response } from "express";

import {
  actualizarCita, actualizarEstadoCita, buscarCitaPorId,
  crearCita, eliminarCita, horarioOcupado, listarCitas,
} from "../repositories/cita.repository.js";

import {
  estadosPermitidos,
  type ActualizarCita, type EstadoCita, type NuevaCita,
} from "../types/cita.js";

import { AppError } from "../middlewares/error.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function obtenerId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "El identificador no es válido.");
  }
  return id;
}

function esEstadoValido(valor: unknown): valor is EstadoCita {
  return typeof valor === "string" &&
    estadosPermitidos.includes(valor as EstadoCita);
}

function validarFechaNoPasada(fecha: string): void {
  const partes = fecha.trim().split("-");
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);

  if (partes.length !== 3 || [anio, mes, dia].some(Number.isNaN)) {
    throw new AppError(400, "La fecha de la cita no es válida.");
  }

  const fechaCita = new Date(anio, mes - 1, dia);
  const fechaReal =
    fechaCita.getFullYear() === anio &&
    fechaCita.getMonth() === mes - 1 &&
    fechaCita.getDate() === dia;

  if (!fechaReal || Number.isNaN(fechaCita.getTime())) {
    throw new AppError(400, "La fecha ingresada no existe en el calendario.");
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaCita < hoy) {
    throw new AppError(
      400,
      "No se pueden agendar citas en una fecha pasada al día actual.",
    );
  }
}

function validarCampos(datos: Partial<NuevaCita>): void {
  const campos = [datos.mascota, datos.cliente, datos.servicio,
                  datos.fecha, datos.hora];
  const existeVacio = campos.some(
    valor => typeof valor !== "string" || valor.trim() === "",
  );
  if (existeVacio) {
    throw new AppError(400, "Todos los campos son obligatorios.");
  }
  if (datos.estado !== undefined && !esEstadoValido(datos.estado)) {
    throw new AppError(400, "El estado de la cita no es válido.");
  }
}

export const obtenerCitas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const estado = req.query.estado;
  if (estado !== undefined && !esEstadoValido(estado)) {
    throw new AppError(400, "El filtro de estado no es válido.");
  }
  res.json(await listarCitas(estado));
});

export const obtenerCita = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cita = await buscarCitaPorId(obtenerId(req));
  if (!cita) throw new AppError(404, "La cita no fue encontrada.");
  res.json(cita);
});

export const registrarCita = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const datos = req.body as Partial<NuevaCita>;
  validarCampos(datos);
  validarFechaNoPasada(datos.fecha!);
  if (await horarioOcupado(datos.fecha!, datos.hora!)) {
    throw new AppError(409, "Ya existe una cita activa en ese horario.");
  }
  const cita = await crearCita(datos as NuevaCita);
  res.status(201).json({ mensaje: "Cita registrada correctamente.", cita });
});

export const modificarCita = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = obtenerId(req);
  const datos = req.body as Partial<ActualizarCita>;
  validarCampos(datos);
  if (!esEstadoValido(datos.estado)) {
    throw new AppError(400, "El estado es obligatorio y debe ser válido.");
  }
  if (await horarioOcupado(datos.fecha!, datos.hora!, id)) {
    throw new AppError(409, "Ya existe otra cita activa en ese horario.");
  }
  const cita = await actualizarCita(id, datos as ActualizarCita);
  if (!cita) throw new AppError(404, "La cita no fue encontrada.");
  res.json({ mensaje: "Cita actualizada correctamente.", cita });
});

export const cambiarEstado = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = obtenerId(req);
  const estado: unknown = req.body.estado;
  if (!esEstadoValido(estado)) {
    throw new AppError(400, "El estado enviado no es válido.");
  }
  const actual = await buscarCitaPorId(id);
  if (!actual) throw new AppError(404, "La cita no fue encontrada.");
  if (actual.estado === "atendida" && estado === "cancelada") {
    throw new AppError(409, "Una cita atendida no puede cancelarse.");
  }
  const cita = await actualizarEstadoCita(id, estado);
  res.json({ mensaje: "Estado actualizado correctamente.", cita });
});

export const borrarCita = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!await eliminarCita(obtenerId(req))) {
    throw new AppError(404, "La cita no fue encontrada.");
  }
  res.status(204).send();
});