// js/pago.js
// Pago simulado y número de póliza. No hay pasarela real.

export const TARJETA_RECHAZADA = '4000000000000002';
export const DEMORA_PAGO_MS = 1500;

export function simularPago(numero) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const limpio = numero.replace(/\s/g, '');
      resolve(limpio === TARJETA_RECHAZADA
        ? { ok: false, motivo: 'Tarjeta rechazada' }
        : { ok: true });
    }, DEMORA_PAGO_MS);
  });
}

// El contador se guarda en localStorage para no repetir números entre sesiones.
const CLAVE_CONTADOR = 'cubri-contador-poliza';

function siguienteContador() {
  let contador = 0;
  try {
    contador = Number(localStorage.getItem(CLAVE_CONTADOR)) || 0;
  } catch {
    // Sin localStorage (modo privado estricto): arrancamos de 0.
  }
  contador = (contador % 999999) + 1;
  try {
    localStorage.setItem(CLAVE_CONTADOR, String(contador));
  } catch {
    // Si no se puede guardar, el número igual es válido.
  }
  return contador;
}

// Número de póliza: POL-AAAA-NNNNNN
export function generarPoliza(fecha = new Date()) {
  const contador = siguienteContador();
  return `POL-${fecha.getFullYear()}-${String(contador).padStart(6, '0')}`;
}
