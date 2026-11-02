/* Nango-neo v3.2.0: cache only the static app shell, never account or dictionary data. */
'use strict';

const CACHE_NAME = 'nango-app-shell-v3.2.0';
const APP_ENTRY = 'Nango-neo.v03.2.0.html';
const SHELL_ASSETS = [
    APP_ENTRY,
    'style.v02.9.1.css',
    'Nango_main.v02.0.6.js',
    'Nango-quiz.v01.0.0.html',
    'Nango-quiz.v01.0.0.css',
    'Nango-quiz.v01.0.0.js',
    'nango-logo.svg',
    'manifest.webmanifest',
    'privacy-policy.html',
    'supabase-config.json',
    'DTformats.neo.v5.17/DF-FMT_schema.v01.17.json',
    'DTformats.neo.v5.17/DT-FMT_instruction_AI.v01.17.json',
    'DTformats.neo.v5.17/DT-FMT_template.v02.17.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const scopeUrl = new URL(self.registration.scope);
        const assets = SHELL_ASSETS.map((asset) => new URL(asset, scopeUrl).toString());
        await cache.addAll(assets);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((name) => name.startsWith('nango-app-shell-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const scopeUrl = new URL(self.registration.scope);

    // Supabase, CDN, authentication and API traffic must remain outside this cache.
    if (url.origin !== scopeUrl.origin) return;
    if (!url.pathname.startsWith(scopeUrl.pathname)) return;
    const scopedPath = url.pathname.slice(scopeUrl.pathname.length);
    if (scopedPath === 'api' || scopedPath.startsWith('api/')) return;

    if (request.mode === 'navigate') {
        // Network-first for pages; use the pre-cached app entry when offline.
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                const response = await fetch(request);
                if (response.ok && response.type === 'basic') {
                    await cache.put(request, response.clone());
                }
                return response;
            } catch (_) {
                const cachedPage = await cache.match(request);
                if (cachedPage) return cachedPage;
                const appUrl = new URL(APP_ENTRY, scopeUrl).toString();
                const appPage = await cache.match(appUrl);
                if (appPage) return appPage;
                return new Response('オフラインです。インターネット接続後に Nango を開いてください。', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            }
        })());
        return;
    }

    // Cache-first for static, same-origin app assets.
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
            await cache.put(request, response.clone());
        }
        return response;
    })());
});
