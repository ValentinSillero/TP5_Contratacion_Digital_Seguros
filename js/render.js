// js/render.js
// Pinta la interfaz a partir del estado. El DOM solo muestra lo que dice "solicitud".

import {
  solicitud, catalogo, interfaz, planElegido, cuotaDelPlan, erroresDelPaso,
} from './estado.js';
import { formatearMoneda, ANTIGUEDADES } from './cotizador.js';

// Mapa de campos del formulario: id del input -> dónde vive en el estado.
// El orden es el del DOM (se usa para enfocar el primer error).
export const CAMPOS = [
  { id: 'marca', seccion: 'equipo', campo: 'marca', paso: 1 },
  { id: 'modelo', seccion: 'equipo', campo: 'modelo', paso: 1 },
  { id: 'valor', seccion: 'equipo', campo: 'valor', paso: 1, tipo: 'moneda' },
  { id: 'antiguedad', seccion: 'equipo', campo: 'antiguedad', paso: 1, tipo: 'radio' },
  { id: 'nombre', seccion: 'titular', campo: 'nombre', paso: 3 },
  { id: 'apellido', seccion: 'titular', campo: 'apellido', paso: 3 },
  { id: 'dni', seccion: 'titular', campo: 'dni', paso: 3 },
  { id: 'nacimiento', seccion: 'titular', campo: 'nacimiento', paso: 3 },
  { id: 'email', seccion: 'titular', campo: 'email', paso: 3 },
  { id: 'celular', seccion: 'titular', campo: 'celular', paso: 3 },
  { id: 'terminos', seccion: 'titular', campo: 'terminos', paso: 3, tipo: 'checkbox' },
  { id: 'metodo', seccion: 'pago', campo: 'metodo', paso: 4, tipo: 'radio' },
  { id: 'tarjeta', seccion: 'pago', campo: 'tarjeta', paso: 4 },
  { id: 'vencimiento', seccion: 'pago', campo: 'vencimiento', paso: 4 },
  { id: 'cvv', seccion: 'pago', campo: 'cvv', paso: 4 },
  { id: 'pago-titular', seccion: 'pago', campo: 'titular', paso: 4 },
];

const TITULOS = {
  0: { titulo: 'Inicio' },
  1: { titulo: 'Contanos sobre tu celular', movil: 'Cotizá tu seguro' },
  2: { titulo: 'Elegí tu plan', movil: 'Elegí tu plan' },
  3: { titulo: 'Tus datos', movil: 'Tus datos' },
  4: { titulo: 'Pago', movil: 'Pago' },
  5: { titulo: 'Contratación exitosa' },
  6: { titulo: 'Error de pago' },
};

const ESTADOS_STEPPER = { completo: 'completado', activo: 'paso actual', pendiente: 'pendiente' };

const $ = (selector) => document.querySelector(selector);

// ---------- Render completo (se llama después de cambiar de paso) ----------

export function render() {
  const { paso } = solicitud;
  document.body.dataset.pasoActual = String(paso);

  document.querySelectorAll('[data-paso]').forEach((seccion) => {
    seccion.hidden = Number(seccion.dataset.paso) !== paso;
  });
  $('#checkout').hidden = !(paso >= 1 && paso <= 4);

  renderEncabezado();
  renderStepper();
  renderPlanes();
  renderResumen();
  rellenarFormularios();
  renderErrores();
  renderBotones();
  renderResultado();
}

function renderEncabezado() {
  const textos = TITULOS[solicitud.paso];
  if (textos.movil) {
    $('#titulo-paso').textContent = textos.titulo;
    $('#titulo-movil').textContent = textos.movil;
  }
  document.title = `${textos.titulo} · Cubrí Seguros`;
}

// ---------- Stepper: completo / activo / pendiente ----------

export function renderStepper() {
  document.querySelectorAll('#stepper li').forEach((item) => {
    const numero = Number(item.dataset.numero);
    let estado = 'pendiente';
    if (numero < solicitud.paso) estado = 'completo';
    if (numero === solicitud.paso) estado = 'activo';

    item.dataset.estado = estado;
    item.querySelector('.sr-estado').textContent = `, ${ESTADOS_STEPPER[estado]}`;
    if (estado === 'activo') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

// ---------- Tarjetas de plan (se crean una vez desde el JSON) ----------

export function renderPlanes() {
  const lista = $('#lista-planes');
  $('#error-planes').hidden = !catalogo.error;
  if (catalogo.error) lista.replaceChildren();
  if (!catalogo.planes.length) return;

  if (!lista.querySelector('.tarjeta-plan')) crearTarjetasPlan(lista);
  lista.setAttribute('aria-busy', 'false');

  catalogo.planes.forEach((plan) => {
    const tarjeta = lista.querySelector(`[data-id-plan="${plan.id}"]`);
    const cuota = cuotaDelPlan(plan.id);
    tarjeta.querySelector('[data-plan="precio"]').textContent = cuota === null ? '—' : formatearMoneda(cuota);
    tarjeta.querySelector('input').checked = plan.id === solicitud.plan;
  });
}

function crearTarjetasPlan(lista) {
  const plantilla = $('#tpl-plan');
  const tarjetas = catalogo.planes.map((plan) => {
    const tarjeta = plantilla.content.firstElementChild.cloneNode(true);
    tarjeta.dataset.idPlan = plan.id;
    tarjeta.querySelector('input').value = plan.id;
    tarjeta.querySelector('[data-plan="nombre"]').textContent = plan.nombre;
    tarjeta.querySelector('[data-plan="badge"]').hidden = !plan.recomendado;

    const coberturas = tarjeta.querySelector('[data-plan="coberturas"]');
    plan.coberturas.forEach((texto) => coberturas.append(itemCobertura(texto, true)));
    (plan.noIncluye || []).forEach((texto) => coberturas.append(itemCobertura(texto, false)));
    return tarjeta;
  });
  lista.replaceChildren(...tarjetas);
}

function itemCobertura(texto, incluida) {
  const item = document.createElement('li');
  item.className = incluida ? 'flex items-center gap-2' : 'flex items-center gap-2 text-slate-400';
  item.innerHTML = `<svg class="size-3.5 shrink-0 ${incluida ? 'text-exito' : 'text-slate-400'}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3"><use href="#i-${incluida ? 'check' : 'x'}"/></svg>`;

  if (!incluida) {
    const aviso = document.createElement('span');
    aviso.className = 'sr-only';
    aviso.textContent = 'No incluye: ';
    item.append(aviso);
  }
  const etiqueta = document.createElement('span');
  etiqueta.textContent = texto;
  item.append(etiqueta);
  return item;
}

// ---------- Resumen (card lateral en desktop / barra y card en mobile) ----------

export function renderResumen() {
  const { equipo, titular, paso } = solicitud;
  const dato = (clave) => $(`[data-resumen="${clave}"]`);
  const fila = (clave) => $(`[data-fila="${clave}"]`);

  const nombreEquipo = [equipo.marca, equipo.modelo.trim()].filter(Boolean).join(' ');
  dato('equipo').textContent = nombreEquipo || '—';
  dato('valor').textContent = equipo.valor ? formatearMoneda(equipo.valor) : '—';
  dato('antiguedad').textContent = ANTIGUEDADES[equipo.antiguedad]?.etiqueta ?? '—';

  const plan = planElegido();
  fila('plan').hidden = paso < 2 || !plan;
  dato('plan').textContent = plan ? plan.nombre : '';

  const nombreTitular = `${titular.nombre.trim()} ${titular.apellido.trim()}`.trim();
  fila('titular').hidden = paso < 4 || !nombreTitular;
  dato('titular').textContent = nombreTitular;

  const cuota = cuotaDelPlan(solicitud.plan);
  const mostrarTotal = paso >= 2 && cuota !== null;
  fila('total').hidden = !mostrarTotal;
  dato('total').textContent = mostrarTotal ? formatearMoneda(cuota) : '';

  const aviso = dato('aviso');
  aviso.hidden = mostrarTotal;
  if (cuota === null) {
    aviso.textContent = 'Completá los datos del equipo para ver el precio.';
  } else {
    const minima = Math.min(...catalogo.planes.map((p) => cuotaDelPlan(p.id)));
    aviso.textContent = `Desde ${formatearMoneda(minima)}/mes según el plan que elijas.`;
  }

  // Bonus: links "Editar" solo en el paso de pago
  document.querySelectorAll('[data-editar]').forEach((boton) => {
    boton.hidden = paso !== 4 || interfaz.procesando;
  });

  // Barra inferior mobile del paso 2
  $('[data-barra="detalle"]').textContent = plan ? `Plan ${plan.nombre} · ${equipo.modelo.trim()}` : '';
  $('[data-barra="precio"]').textContent = cuota === null ? '' : `${formatearMoneda(cuota)}/mes`;
}

// ---------- Formularios ----------

// Rellena los inputs desde el estado: al volver atrás no se pierde nada.
function rellenarFormularios() {
  CAMPOS.forEach((def) => {
    const valor = solicitud[def.seccion][def.campo];
    if (def.tipo === 'radio') {
      document.querySelectorAll(`input[name="${def.id}"]`).forEach((radio) => {
        radio.checked = radio.value === valor;
      });
      return;
    }
    const input = document.getElementById(def.id);
    if (def.tipo === 'checkbox') input.checked = valor;
    else if (def.tipo === 'moneda') input.value = valor ? formatearMoneda(valor) : '';
    else input.value = valor;
  });
}

// Muestra (o limpia) el error de un campo: borde rojo, mensaje y atributos ARIA.
export function renderErrorCampo(id, mensaje) {
  const control = document.getElementById(id);
  const error = document.getElementById(`${id}-error`);
  const ayuda = document.getElementById(`${id}-ayuda`);
  const field = control.closest('.field');
  const invalido = Boolean(mensaje);

  // En los grupos de radios el atributo va en el fieldset y en cada opción
  const controles = control.tagName === 'FIELDSET'
    ? [control, ...control.querySelectorAll('input')]
    : [control];
  controles.forEach((el) => {
    if (invalido) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  });

  if (field) field.toggleAttribute('data-invalid', invalido);
  error.textContent = mensaje || '';
  error.hidden = !invalido;

  const descripciones = [ayuda?.id, invalido ? error.id : null].filter(Boolean);
  if (descripciones.length) control.setAttribute('aria-describedby', descripciones.join(' '));
  else control.removeAttribute('aria-describedby');
}

// Errores del paso actual: solo de los campos que ya se tocaron.
function renderErrores() {
  const errores = erroresDelPaso(solicitud.paso);
  CAMPOS.forEach((def) => {
    const visible = def.paso === solicitud.paso && interfaz.tocados.has(def.id);
    renderErrorCampo(def.id, visible ? errores[def.id] : null);
  });
}

// Botones de avance: deshabilitados hasta que el paso sea válido.
export function renderBotones() {
  document.querySelectorAll('[data-form-paso]').forEach((form) => {
    const paso = Number(form.dataset.formPaso);
    const boton = form.querySelector('[data-boton-avance]');
    const ayuda = form.querySelector('[data-ayuda-avance]');

    if (paso === 4) {
      renderBotonPagar(boton);
      return;
    }

    const invalido = Object.keys(erroresDelPaso(paso)).length > 0;
    boton.disabled = invalido;
    if (ayuda) ayuda.hidden = !invalido;

    // Bonus "Editar desde el resumen": el botón vuelve directo al pago
    boton.dataset.texto ??= boton.textContent.trim();
    boton.textContent = interfaz.editandoDesdePago ? 'Guardar y volver al pago' : boton.dataset.texto;
  });

  // Mientras se procesa el pago no se puede volver ni editar
  document.querySelectorAll('[data-accion="volver"]').forEach((boton) => {
    boton.disabled = interfaz.procesando;
  });
}

function renderBotonPagar(boton) {
  const procesando = interfaz.procesando;
  boton.disabled = procesando;
  boton.setAttribute('aria-busy', String(procesando));
  boton.querySelector('.spinner').hidden = !procesando;
  boton.querySelector('[data-texto-boton]').textContent = procesando ? 'Procesando…' : 'Pagar y contratar';
  $('#campos-pago').disabled = procesando;
  $('#estado-pago').textContent = procesando ? 'Procesando el pago, esperá un momento.' : '';
}

// ---------- Pantallas de resultado (éxito / error) ----------

function renderResultado() {
  const { titular, equipo, poliza, fechaAlta } = solicitud;

  if (solicitud.paso === 5) {
    const escribir = (clave, texto) => { $(`[data-exito="${clave}"]`).textContent = texto; };
    const cuota = cuotaDelPlan(solicitud.plan);
    escribir('nombre', titular.nombre.trim());
    escribir('email', titular.email.trim());
    escribir('poliza', poliza);
    escribir('titular', `${titular.nombre.trim()} ${titular.apellido.trim()}`);
    escribir('seguro', `Celular · ${equipo.marca} ${equipo.modelo.trim()}`);
    escribir('plan', planElegido()?.nombre ?? '');
    escribir('vigencia', new Date(fechaAlta).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    escribir('cuota', cuota === null ? '' : `${formatearMoneda(cuota)}/mes`);
  }

  if (solicitud.paso === 6) {
    $('[data-error="motivo"]').textContent = interfaz.motivoRechazo === 'Tarjeta rechazada'
      ? 'La tarjeta fue rechazada'
      : interfaz.motivoRechazo || 'La tarjeta fue rechazada';
  }
}

// Lleva el foco al título visible del paso (lectores de pantalla y teclado).
export function enfocarTitulo() {
  const candidatos = {
    0: ['titulo-inicio'],
    5: ['titulo-exito'],
    6: ['titulo-error'],
  }[solicitud.paso] || ['titulo-paso', 'titulo-movil'];

  const titulo = candidatos
    .map((id) => document.getElementById(id))
    .find((el) => el && el.getClientRects().length > 0);
  titulo?.focus({ preventScroll: true });
}
