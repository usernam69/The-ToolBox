// Tiny home-network server for the chat and drawing games.
// Serves the app folder so friends can open it in a browser, and relays messages per room
// with Server-Sent Events (GET /api/events) and plain POSTs (/api/send). No dependencies.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const MAX_BODY = 256 * 1024;

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
}

function createLanServer(rootDir) {
  const rooms = new Map(); // room -> { clients:Set<{res,name,id}>, history:[] }
  const room = r => { if (!rooms.has(r)) rooms.set(r, { clients: new Set(), history: [] }); return rooms.get(r); };
  const send = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const broadcast = (r, obj) => { const rm = room(r); for (const c of rm.clients) send(c.res, obj); };
  const members = r => [...room(r).clients].map(c => ({ id: c.id, name: c.name }));
  const clean = (s, n) => String(s ?? '').slice(0, n);

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://x');

    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ips: lanAddresses(), port: server.address().port }));
    }
    if (url.pathname === '/api/events') {
      const r = clean(url.searchParams.get('room') || 'lobby', 40).toLowerCase();
      const client = { res, name: clean(url.searchParams.get('name') || 'Guest', 24), id: Math.random().toString(36).slice(2, 9) };
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      send(res, { type: 'hello', id: client.id, history: room(r).history });
      room(r).clients.add(client);
      broadcast(r, { type: 'members', members: members(r), joined: client.name });
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => {
        clearInterval(ping); room(r).clients.delete(client);
        broadcast(r, { type: 'members', members: members(r), left: client.name });
        if (!room(r).clients.size) rooms.delete(r);
      });
      return;
    }
    if (url.pathname === '/api/send' && req.method === 'POST') {
      const r = clean(url.searchParams.get('room') || 'lobby', 40).toLowerCase();
      let body = '';
      req.on('data', d => { body += d; if (body.length > MAX_BODY) req.destroy(); });
      req.on('end', () => {
        let msg; try { msg = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
        if (!msg || typeof msg.type !== 'string') { res.writeHead(400); return res.end(); }
        msg.at = Date.now();
        if (msg.type === 'chat') { msg.text = clean(msg.text, 1000); msg.name = clean(msg.name, 24); const h = room(r).history; h.push(msg); if (h.length > 60) h.shift(); }
        broadcast(r, msg);
        res.writeHead(204); res.end();
      });
      return;
    }
    // static files from the app folder (no directory traversal)
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(rootDir, rel);
    if (!file.startsWith(path.resolve(rootDir) + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return {
    start(port = 8765) {
      return new Promise((resolve, reject) => {
        const tryPort = p => {
          server.once('error', e => (e.code === 'EADDRINUSE' && p < port + 10 ? tryPort(p + 1) : reject(e)));
          server.listen(p, '0.0.0.0', () => resolve({ port: server.address().port, ips: lanAddresses() }));
        };
        if (server.listening) resolve({ port: server.address().port, ips: lanAddresses() }); else tryPort(port);
      });
    },
    stop() { server.close(); },
    get listening() { return server.listening; },
  };
}

module.exports = { createLanServer };
