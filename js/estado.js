// js/estado.js
// Un único objeto "solicitud" es la fuente de verdad del flujo.
// Cada cambio pasa por estas funciones y después se llama a render().

import { render } from './render.js';
import { calcularCuota } from './cotizador.js';
import {
  validarEquipo, validarTitular, validarPago, validarValor, validarAntiguedad,
} from './validaciones.js';

const CLAVE_STORAGE = 'cubri-solicitud';

function crearSolicitudInicial() {
  return {
    paso: 0, // 0 = inicio, 1..4 = checkout, 5 = éxito, 6 = error
    equipo: { marca: '', modelo: '', valor: 0, antiguedad: '' },
    plan: 'plus',
    titular: { nombre: '', apellido: '', dni: '', nacimiento: '', email: '', celular: '', terminos: false },
    pago: { metodo: 'credito', tarjeta: '', vencimiento: '', cvv: '', titular: '' },
    poliza: null,
    fechaAlta: null,
  };
}

export const solicitud = crearSolicitudInicial();

// Datos que no son de la solicitud del usuario:
// los planes que llegan del JSON y el estado de la interfaz.
export const catalogo = { planes: [], error: false };

export const interfaz = {
  tocados: new Set(),        // campos que ya perdieron el foco (para mostrar errores)
  procesando: false,         // pago en curso
  motivoRechazo: '',         // texto que devolvió el pago simulado
  editandoDesdePago: false,  // bonus: "Editar" desde el resumen vuelve al pago
};

// ---------- Consultas sobre el estado (no modifican nada) ----------

export function planElegido() {
  return catalogo.planes.find((plan) => plan.id === solicitud.plan) || null;
}

// Cuota de un plan según el equipo cargado. null si todavía no se puede calcular.
// Siempre se calcula desde el estado, nunca leyendo textos del DOM.
export function cuotaDelPlan(idPlan) {
  const plan = catalogo.planes.find((p) => p.id === idPlan);
  const { valor, antiguedad } = solicitud.equipo;
  if (!plan || validarValor(valor) || validarAntiguedad(antiguedad)) return null;
  return calcularCuota(valor, plan.tasaAnual, antiguedad);
}

// Errores de un paso del checkout: { idDelCampo: mensaje }
export function erroresDelPaso(paso) {
  if (paso === 1) return validarEquipo(solicitud.equipo);
  if (paso === 2) return planElegido() ? {} : { plan: 'Elegí un plan' };
  if (paso === 3) return validarTitular(solicitud.titular);
  if (paso === 4) return validarPago(solicitud.pago);
  return {};
}

export function pasosValidosHasta(paso) {
  for (let n = 1; n <= paso; n++) {
    if (Object.keys(erroresDelPaso(n)).length > 0) return false;
  }
  return true;
}

export function irAPaso(n) {
  solicitud.paso = n;
  interfaz.tocados.clear();
  guardar();
  render();
}

// Actualiza un campo de una sección: actualizarCampo('equipo', 'modelo', 'Galaxy A55')
export function actualizarCampo(seccion, campo, valor) {
  solicitud[seccion][campo] = valor;
  guardar();
}

export function elegirPlan(idPlan) {
  solicitud.plan = idPlan;
  guardar();
}

export function confirmarContratacion(poliza) {
  solicitud.poliza = poliza;
  solicitud.fechaAlta = new Date().toISOString();
  borrarGuardado(); // limpieza al terminar
  irAPaso(5);
}

export function reiniciarSolicitud() {
  const nueva = crearSolicitudInicial();
  Object.assign(solicitud, nueva);
  interfaz.tocados.clear();
  interfaz.procesando = false;
  interfaz.motivoRechazo = '';
  interfaz.editandoDesdePago = false;
  borrarGuardado();
  render();
}

// ---------- Bonus: persistencia temporal en localStorage ----------
// Nunca se guardan el número de tarjeta ni el CVV.

function guardar() {
  if (solicitud.paso >= 5) return;
  const copia = structuredClone(solicitud);
  copia.pago.tarjeta = '';
  copia.pago.cvv = '';
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(copia));
  } catch {
    // Si el navegador no deja guardar, la app funciona igual.
  }
}

function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE_STORAGE);
  } catch {
    // Nada que limpiar.
  }
}

export function restaurarGuardado() {
  let guardado = null;
  try {
    guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
  } catch {
    guardado = null;
  }
  if (!guardado || typeof guardado !== 'object') return;

  Object.assign(solicitud.equipo, guardado.equipo);
  Object.assign(solicitud.titular, guardado.titular);
  Object.assign(solicitud.pago, guardado.pago, { tarjeta: '', cvv: '' });
  if (typeof guardado.plan === 'string') solicitud.plan = guardado.plan;

  // Si se había llegado al error de pago, se vuelve al paso de pago.
  const paso = Number(guardado.paso);
  solicitud.paso = paso === 6 ? 4 : Math.min(Math.max(paso || 0, 0), 4);
}
