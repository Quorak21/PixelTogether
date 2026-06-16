export function isAck(callback) {
  return typeof callback === 'function';
}

/**
 * Guard minimaliste BACK-02 :
 * - si callback n'est pas une fonction, on ne fait rien (pas d'exception).
 * - renvoie true quand callback est exploitable.
 */
export function guardAck(callback) {
  return isAck(callback);
}

export function ack(callback, payload) {
  if (!isAck(callback)) return;
  callback(payload);
}

/** BACK-04 : true si l'event doit être ignoré (cooldown non écoulé). */
export function isRateLimited(socket, eventKey, cooldownMs) {
  const now = Date.now();
  if (!socket.data.rateLimits) socket.data.rateLimits = {};
  const last = socket.data.rateLimits[eventKey] ?? 0;
  if (now - last < cooldownMs) return true;
  socket.data.rateLimits[eventKey] = now;
  return false;
}

