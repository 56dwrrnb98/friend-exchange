"use strict";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let message = {};

  try {
    message = event.data?.json() || {};
  } catch {
    message = {
      title: "The Friend Exchange",
      body: event.data?.text() || "A new filing has entered the exchange.",
      target_url: "#/markets",
    };
  }

  const title = String(message.title || "The Friend Exchange");
  const body = String(message.body || "A new filing has entered the exchange.");
  const targetUrl = String(message.target_url || "#/markets");
  const notificationId = String(message.notification_id || "general");
  const iconUrl = new URL("img/icon-192.png", self.registration.scope).href;
  const badgeUrl = new URL("img/favicon-32.png", self.registration.scope).href;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: iconUrl,
      badge: badgeUrl,
      tag: `friend-exchange-${notificationId}`,
      renotify: false,
      data: { targetUrl },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    String(event.notification.data?.targetUrl || "#/markets"),
    self.registration.scope,
  ).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const targetUrl = new URL(target);

    for (const client of windows) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }

    await self.clients.openWindow(target);
  })());
});
