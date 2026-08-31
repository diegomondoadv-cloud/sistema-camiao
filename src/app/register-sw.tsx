"use client";

import { useEffect } from "react";

/**
 * PWA: em PRODUÇÃO registra o service worker (app instalável).
 * Em DESENVOLVIMENTO faz o contrário — desregistra qualquer SW e limpa os
 * caches, para nunca servir chunk desatualizado (que causava tela branca /
 * campos sumindo após atualizações).
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    // Desenvolvimento: remove SW e limpa caches.
    navigator.serviceWorker
      .getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
    if (typeof caches !== "undefined") {
      caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);

  return null;
}
