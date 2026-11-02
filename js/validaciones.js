// js/validaciones.js
// Funciones puras: reciben un valor y devuelven un mensaje de error o null.
// No tocan el DOM ni el estado, así se pueden probar y reutilizar solas.

export const VALOR_MINIMO = 100000;
export const VALOR_MAXIMO = 2500000;

const REGEX_DNI = /^\d{7,8}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_VENCIMIENTO = /^(0[1-9]|1[0-2])\/(\d{2})$/;
const REGEX_SOLO_LETRAS = /^[\p{L}' -]+$/u;

// ---------- Datos del equipo (paso 1) ----------

export function validarMarca(marca) {
  return marca ? null : 'Elegí una marca';
}

export function validarModelo(modelo) {
  const largo = modelo.trim().length;
  return largo >= 2 && largo <= 40 ? null : 'Ingresá el modelo del equipo';
}

export function validarValor(valor) {
  const ok = Number.isFinite(valor) && valor >= VALOR_MINIMO && valor <= VALOR_MAXIMO;
  return ok ? null : 'El valor debe estar entre $100.000 y $2.500.000';
}

export function validarAntiguedad(antiguedad) {
  return antiguedad ? null : 'Indicá la antigüedad';
}

// ---------- Datos personales (paso 3) ----------

// Mínimo 2 letras; se aceptan tildes, ñ, espacios, apóstrofo y guion.
export function validarNombre(nombre, mensaje = 'Ingresá tu nombre') {
  const texto = nombre.trim();
  const letras = texto.match(/\p{L}/gu) || [];
  return REGEX_SOLO_LETRAS.test(texto) && letras.length >= 2 ? null : mensaje;
}

export function validarApellido(apellido) {
  return validarNombre(apellido, 'Ingresá tu apellido');
}

export function validarDni(dni) {
  return REGEX_DNI.test(dni.trim()) ? null : 'El DNI debe tener 7 u 8 números';
}

// fecha llega como "AAAA-MM-DD" (input type="date"). "hoy" se puede pasar para testear.
export function validarNacimiento(fecha, hoy = new Date()) {
  if (!fecha) return 'Ingresá tu fecha de nacimiento';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return 'Ingresá tu fecha de nacimiento';

  let edad = hoy.getFullYear() - anio;
  const mesActual = hoy.getMonth() + 1;
  if (mesActual < mes || (mesActual === mes && hoy.getDate() < dia)) edad--;

  if (edad < 18) return 'Tenés que ser mayor de edad';
  if (edad > 120) return 'Ingresá una fecha de nacimiento válida';
  return null;
}

export function validarEmail(email) {
  return REGEX_EMAIL.test(email.trim()) ? null : 'Ingresá un email válido';
}

// 10 dígitos sin 0 ni 15 al principio. Se ignoran espacios y guiones.
export function validarCelular(celular) {
  const limpio = celular.replace(/[\s-]/g, '');
  const ok = /^\d{10}$/.test(limpio) && !limpio.startsWith('0') && !limpio.startsWith('15');
  return ok ? null : 'Ingresá 10 dígitos sin 0 ni 15. Ej.: 11 5555-1234';
}

export function validarTerminos(aceptados) {
  return aceptados ? null : 'Tenés que aceptar los términos';
}

// ---------- Datos de pago (paso 4) ----------

export function validarTarjeta(numero) {
  return /^\d{16}$/.test(numero.replace(/\s/g, '')) ? null : 'Número de tarjeta inválido';
}

// MM/AA, mes 01–12 y fecha futura. La tarjeta vale hasta el último día
// del mes impreso, por eso el mes en curso todavía es válido.
export function validarVencimiento(vencimiento, hoy = new Date()) {
  const partes = REGEX_VENCIMIENTO.exec(vencimiento.trim());
  if (!partes) return 'Vencimiento inválido';
  const mes = Number(partes[1]);
  const anio = 2000 + Number(partes[2]);
  const mesesVencimiento = anio * 12 + mes;
  const mesesHoy = hoy.getFullYear() * 12 + (hoy.getMonth() + 1);
  return mesesVencimiento >= mesesHoy ? null : 'Vencimiento inválido';
}

export function validarCvv(cvv) {
  return /^\d{3}$/.test(cvv.trim()) ? null : 'CVV inválido';
}

export function validarTitularTarjeta(titular) {
  return titular.trim() ? null : 'Ingresá el nombre del titular';
}

export function validarMetodo(metodo) {
  return metodo === 'credito' || metodo === 'debito' ? null : 'Elegí un medio de pago';
}

// ---------- Validación de un paso completo ----------
// Devuelven un objeto { idDelCampo: mensaje } solo con los campos con error.

function soloErrores(resultado) {
  return Object.fromEntries(Object.entries(resultado).filter(([, error]) => error));
}

export function validarEquipo(equipo) {
  return soloErrores({
    marca: validarMarca(equipo.marca),
    modelo: validarModelo(equipo.modelo),
    valor: validarValor(equipo.valor),
    antiguedad: validarAntiguedad(equipo.antiguedad),
  });
}

export function validarTitular(titular, hoy = new Date()) {
  return soloErrores({
    nombre: validarNombre(titular.nombre),
    apellido: validarApellido(titular.apellido),
    dni: validarDni(titular.dni),
    nacimiento: validarNacimiento(titular.nacimiento, hoy),
    email: validarEmail(titular.email),
    celular: validarCelular(titular.celular),
    terminos: validarTerminos(titular.terminos),
  });
}

export function validarPago(pago, hoy = new Date()) {
  return soloErrores({
    metodo: validarMetodo(pago.metodo),
    tarjeta: validarTarjeta(pago.tarjeta),
    'pago-titular': validarTitularTarjeta(pago.titular),
    vencimiento: validarVencimiento(pago.vencimiento, hoy),
    cvv: validarCvv(pago.cvv),
  });
}
