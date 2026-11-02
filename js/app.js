// js/app.js
// Arranque, eventos y navegación. Cada evento modifica "solicitud"
// (a través de estado.js) y después se vuelve a pintar con render.js.

import {
  solicitud, catalogo, interfaz, irAPaso, actualizarCampo, elegirPlan,
  confirmarContratacion, reiniciarSolicitud, restaurarGuardado,
  erroresDelPaso, pasosValidosHasta, planElegido, cuotaDelPlan,
} from './estado.js';
import {
  CAMPOS, render, renderBotones, renderErrorCampo, renderPlanes, renderResumen, enfocarTitulo,
} from './render.js';
import { cargarPlanes, limpiarNumero, formatearMoneda } from './cotizador.js';
import { simularPago, generarPoliza } from './pago.js';

const campoPorId = new Map(CAMPOS.map((def) => [def.id, def]));

// ---------- Navegación ----------

function navegar(paso) {
  if (paso === 0 || paso === 4) interfaz.editandoDesdePago = false;
  irAPaso(paso);
  window.scrollTo({ top: 0 });
  enfocarTitulo();
}

function intentarAvanzar(paso) {
  if (paso !== solicitud.paso || interfaz.procesando) return;

  // Revalidar todo el paso y mostrar todos los errores
  const errores = erroresDelPaso(paso);
  const camposDelPaso = CAMPOS.filter((def) => def.paso === paso);
  camposDelPaso.forEach((def) => {
    interfaz.tocados.add(def.id);
    renderErrorCampo(def.id, errores[def.id]);
  });

  const primerError = camposDelPaso.find((def) => errores[def.id]);
  if (primerError) {
    enfocarCampo(primerError.id);
    return;
  }
  if (Object.keys(errores).length > 0) return; // p. ej. no se cargaron los planes

  if (paso === 4) {
    pagar();
  } else if (interfaz.editandoDesdePago && pasosValidosHasta(3)) {
    navegar(4);
  } else {
    navegar(paso + 1);
  }
}

function enfocarCampo(id) {
  let elemento = document.getElementById(id);
  if (elemento.tagName === 'FIELDSET') {
    elemento = elemento.querySelector('input:checked') || elemento.querySelector('input');
  }
  elemento.focus({ preventScroll: true });
  elemento.closest('.field, fieldset')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ---------- Pago simulado ----------

async function pagar() {
  if (interfaz.procesando) return; // evita pagos duplicados
  interfaz.procesando = true;
  renderBotones();
  renderResumen();

  const resultado = await simularPago(solicitud.pago.tarjeta);
  interfaz.procesando = false;

  if (resultado.ok) {
    confirmarContratacion(generarPoliza());
  } else {
    interfaz.motivoRechazo = resultado.motivo;
    irAPaso(6);
  }
  window.scrollTo({ top: 0 });
  enfocarTitulo();
}

function descargarPoliza() {
  const { titular, equipo, poliza, fechaAlta } = solicitud;
  const cuota = cuotaDelPlan(solicitud.plan);
  const texto = [
    'CUBRÍ SEGUROS · Póliza de seguro de celular (simulada)',
    '',
    `Número de póliza: ${poliza}`,
    `Titular: ${titular.nombre} ${titular.apellido} · DNI ${titular.dni}`,
    `Email: ${titular.email}`,
    `Equipo: ${equipo.marca} ${equipo.modelo} · ${formatearMoneda(equipo.valor)}`,
    `Plan: ${planElegido()?.nombre ?? ''}`,
    `Cuota mensual: ${cuota === null ? '' : formatearMoneda(cuota)}`,
    `Vigencia desde: ${new Date(fechaAlta).toLocaleDateString('es-AR')}`,
  ].join('\n');

  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${poliza}.txt`;
  enlace.click();
  URL.revokeObjectURL(url);
}

// ---------- Acciones de los botones (data-accion) ----------

const acciones = {
  cotizar: () => navegar(1),
  'ir-inicio': () => navegar(0),
  volver: () => {
    if (interfaz.procesando) return;
    navegar(Math.max(solicitud.paso - 1, 0));
  },
  'volver-inicio': () => {
    reiniciarSolicitud();
    window.scrollTo({ top: 0 });
    enfocarTitulo();
  },
  descargar: descargarPoliza,
  reintentar: () => {
    navegar(4);
    document.getElementById('boton-pagar').focus();
  },
  'cambiar-medio': () => {
    navegar(4);
    enfocarCampo('metodo');
  },
};

// ---------- Máscaras de input (bonus) ----------

function aplicarMascara(id, input, evento) {
  const borrando = evento.inputType?.startsWith('delete');
  let valor = input.value;

  if (id === 'tarjeta') {
    valor = valor.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  } else if (id === 'vencimiento') {
    const digitos = valor.replace(/\D/g, '').slice(0, 4);
    if (digitos.length > 2) valor = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    else if (digitos.length === 2 && !borrando) valor = `${digitos}/`;
    else valor = digitos;
  } else if (id === 'dni') {
    valor = valor.replace(/\D/g, '').slice(0, 8); // "30.123.456" -> "30123456"
  } else if (id === 'cvv') {
    valor = valor.replace(/\D/g, '');
  } else if (id === 'celular') {
    valor = valor.replace(/[^\d\s-]/g, '');
  }

  if (valor !== input.value) input.value = valor;
}

function leerValor(def, input) {
  if (def.tipo === 'checkbox') return input.checked;
  if (def.tipo === 'moneda') return limpiarNumero(input.value);
  return input.value;
}

// ---------- Eventos ----------

// Escritura y selección: se actualiza el estado y la UI que depende de él.
document.addEventListener('input', (evento) => {
  const input = evento.target;

  if (input.name === 'plan') {
    elegirPlan(input.value);
    renderPlanes();
    renderResumen();
    renderBotones();
    return;
  }

  const id = input.type === 'radio' ? input.name : input.id;
  const def = campoPorId.get(id);
  if (!def) return;

  aplicarMascara(id, input, evento);
  actualizarCampo(def.seccion, def.campo, leerValor(def, input));

  // Elegir una opción ya es una interacción completa
  if (def.tipo === 'radio' || def.tipo === 'checkbox' || input.tagName === 'SELECT') {
    interfaz.tocados.add(id);
  }
  // Si el campo ya mostró un error, se revalida mientras se corrige
  if (interfaz.tocados.has(id)) renderErrorCampo(id, erroresDelPaso(def.paso)[id]);

  renderPlanes();
  renderResumen();
  renderBotones();
});

// Errores en línea al salir del campo (blur)
document.addEventListener('focusout', (evento) => {
  const input = evento.target;
  const id = input.type === 'radio' ? input.name : input.id;
  const def = campoPorId.get(id);
  if (!def || def.paso !== solicitud.paso || interfaz.procesando) return;

  // En un grupo de radios, solo cuenta cuando el foco sale del grupo
  if (def.tipo === 'radio' && document.getElementById(id).contains(evento.relatedTarget)) return;

  if (def.tipo === 'moneda' && solicitud.equipo.valor) {
    input.value = formatearMoneda(solicitud.equipo.valor);
  }
  interfaz.tocados.add(id);
  renderErrorCampo(id, erroresDelPaso(def.paso)[id]);
});

document.addEventListener('submit', (evento) => {
  const form = evento.target.closest('[data-form-paso]');
  if (!form) return;
  evento.preventDefault(); // la página nunca se recarga
  intentarAvanzar(Number(form.dataset.formPaso));
});

// Enter con el botón deshabilitado: igual se revalida y se enfoca el primer error
document.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter' || evento.target.tagName !== 'INPUT') return;
  if (evento.target.type === 'checkbox' || evento.target.type === 'radio') return;
  const form = evento.target.closest('[data-form-paso]');
  if (form?.querySelector('[data-boton-avance]:disabled')) {
    evento.preventDefault();
    intentarAvanzar(Number(form.dataset.formPaso));
  }
});

document.addEventListener('click', (evento) => {
  // Click sobre un botón "Continuar" deshabilitado: explicar qué falta
  const envoltorio = evento.target.closest('[data-envoltorio-avance]');
  if (envoltorio && evento.target === envoltorio) {
    const form = envoltorio.closest('[data-form-paso]');
    if (form.querySelector('[data-boton-avance]').disabled) intentarAvanzar(Number(form.dataset.formPaso));
    return;
  }

  // Bonus: "Editar" desde el resumen lleva al paso y después vuelve al pago
  const editar = evento.target.closest('[data-editar]');
  if (editar && !interfaz.procesando) {
    navegar(Number(editar.dataset.editar));
    interfaz.editandoDesdePago = true;
    renderBotones();
    return;
  }

  const boton = evento.target.closest('[data-accion]');
  if (boton && !boton.disabled) acciones[boton.dataset.accion]?.();
});

// ---------- Arranque ----------

function hoyISO() {
  const hoy = new Date();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mm}-${dd}`;
}

// Si se restauró un paso al que no se podía llegar, volver al primero incompleto.
function corregirPasoRestaurado() {
  for (let paso = 1; paso < solicitud.paso; paso++) {
    if (paso === 2 && !catalogo.planes.length) continue;
    if (Object.keys(erroresDelPaso(paso)).length > 0) {
      solicitud.paso = paso;
      return;
    }
  }
}

async function iniciar() {
  document.getElementById('nacimiento').max = hoyISO();
  restaurarGuardado();
  corregirPasoRestaurado();
  render();

  try {
    catalogo.planes = await cargarPlanes();
  } catch (error) {
    catalogo.error = true;
    console.error('Cubrí Seguros:', error.message);
  }
  if (!planElegido() && catalogo.planes.length) {
    elegirPlan(catalogo.planes.find((plan) => plan.recomendado)?.id ?? catalogo.planes[0].id);
  }
  renderPlanes();
  renderResumen();
  renderBotones();
}

iniciar();
