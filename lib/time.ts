/** Wall-clock accessor (kept out of render bodies so components stay pure by lint rules). */
export const nowMs = () => Date.now();
