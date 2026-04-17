// Shim for Node.js 'util' module
export function inspect(value) {
  return String(value);
}

export function format(...args) {
  return args.map(String).join(' ');
}

export function deprecate(fn, msg) {
  console.warn(msg);
  return fn;
}

export function inherits(constructor, superConstructor) {
  constructor.prototype = Object.create(superConstructor.prototype);
  constructor.prototype.constructor = constructor;
}

export function isArray(obj) {
  return Array.isArray(obj);
}

export function isBoolean(obj) {
  return typeof obj === 'boolean';
}

export function isNull(obj) {
  return obj === null;
}

export function isNullOrUndefined(obj) {
  return obj == null;
}

export function isNumber(obj) {
  return typeof obj === 'number';
}

export function isString(obj) {
  return typeof obj === 'string';
}

export function isSymbol(obj) {
  return typeof obj === 'symbol';
}

export function isUndefined(obj) {
  return obj === undefined;
}

export function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

export function isFunction(obj) {
  return typeof obj === 'function';
}

export function isError(obj) {
  return obj instanceof Error;
}

export default {
  inspect,
  format,
  deprecate,
  inherits,
  isArray,
  isBoolean,
  isNull,
  isNullOrUndefined,
  isNumber,
  isString,
  isSymbol,
  isUndefined,
  isObject,
  isFunction,
  isError,
};
