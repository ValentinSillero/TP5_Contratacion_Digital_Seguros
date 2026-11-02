// js/cotizador.js
// Cálculo de la cuota, carga de planes y formato de moneda.

export const ANTIGUEDADES = {
  'menos-1': { etiqueta: 'Menos de 1 año', factor: 1.0 },
  '1-2': { etiqueta: '1 a 2 años', factor: 1.1 },
  'mas-2': { etiqueta: 'Más de 2 años', factor: 1.25 },
};

// Fórmula de la consigna (sección 5.1), sin modificaciones.
export function calcularCuota(valor, tasaAnual, antiguedad) {
  const factorAntiguedad = ANTIGUEDADES[antiguedad].factor;
  return Math.round(valor * tasaAnual / 12 * factorAntiguedad);
}

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatearMoneda(numero) {
  return formatoMoneda.format(numero);
}

// "$ 600.000" -> 600000. Los inputs devuelven strings: hay que limpiarlos.
export function limpiarNumero(texto) {
  const soloDigitos = String(texto).replace(/\D/g, '');
  return soloDigitos ? Number(soloDigitos) : 0;
}

export async function cargarPlanes() {
  const respuesta = await fetch('data/planes.json');
  if (!respuesta.ok) throw new Error(`No se pudo cargar planes.json (${respuesta.status})`);
  return respuesta.json();
}
