/**
 * Garde de sécurité minimaliste (BACK-02).
 * Renvoie true si le callback est exploitable pour renvoyer une réponse au client,
 * évitant ainsi des exceptions en cas d'appel incorrect sans callback.
 * 
 * @param {any} callback - La fonction de rappel à tester.
 * @returns {boolean} true si le callback est bien une fonction.
 */
export function guardAck(callback) {
  return typeof callback === 'function';
}

/**
 * Système de limitation de fréquence (Rate Limiter / Anti-Spam / BACK-04).
 * Enregistre le timestamp de chaque action sur le socket.
 * Renvoie `true` si la même action est répétée avant l'expiration du délai `cooldownMs`.
 * Utilisé principalement pour limiter le spam de dessins (pixelPlaced) ou de messages de chat.
 * 
 * @param {Object} socket - Le socket client.
 * @param {string} eventKey - La clé de l'événement à limiter.
 * @param {number} cooldownMs - Le délai d'attente en millisecondes.
 * @returns {boolean} true si l'action est limitée.
 */
export function isRateLimited(socket, eventKey, cooldownMs) {
  const now = Date.now();
  if (!socket.data.rateLimits) socket.data.rateLimits = {};
  const last = socket.data.rateLimits[eventKey] ?? 0;
  if (now - last < cooldownMs) return true;
  socket.data.rateLimits[eventKey] = now;
  return false;
}
