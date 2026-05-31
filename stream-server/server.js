/**
 * RaceNRoam Stream Fan-Out Server
 * --------------------------------
 * Port 8081 → receives raw frames from ingestor.py
 * Port 8080 → serves delayed frames to browser clients
 *
 * STREAM_DELAY_MS: 5-second buffer to sync with TikTok broadcast latency.
 *   Adjust this value to match your actual stream delay.
 *
 * Install:  npm install ws node-fetch
 * Run:      node server.js
 */

import { WebSocketServer, WebSocket } from "ws";
import fetch from "node-fetch";

const INGESTOR_URL    = "ws://127.0.0.1:8081";
const BROWSER_PORT    = 8080;
const STREAM_DELAY_MS = 5000;          // ← tune to your TikTok/Twitch delay
const JOLPICA_BASE    = "https://api.jolpi.ca/ergast/f1";
const SCHEDULE_TTL_MS = 30 * 60 * 1000; // refresh schedule every 30 min

// ── Delay queue ───────────────────────────────────────────────────────────────
/** @type {{ payload: string, deliverAt: number }[]} */
const queue = [];

function enqueue(payload) {
  queue.push({ payload, deliverAt: Date.now() + STREAM_DELAY_MS });
}

function drainQueue() {
  const now = Date.now();
  while (queue.length && queue[0].deliverAt <= now) {
    const { payload } = queue.shift();
    broadcast(payload);
  }
}

setInterval(drainQueue, 50); // drain at 20 Hz

// ── Browser WebSocket server ──────────────────────────────────────────────────
const browserWSS     = new WebSocketServer({ port: BROWSER_PORT });
const browserClients = new Set();

browserWSS.on("connection", (ws, req) => {
  browserClients.add(ws);
  console.log(`[browser] +client  total=${browserClients.size}  ip=${req.socket.remoteAddress}`);

  // Send current schedule immediately on connect
  if (cachedSchedule) {
    ws.send(JSON.stringify({ type: "schedule", race: cachedSchedule }));
  }

  ws.on("close",   () => { browserClients.delete(ws); console.log(`[browser] -client  total=${browserClients.size}`); });
  ws.on("error",   (e) => console.warn("[browser] ws error:", e.message));
});

console.log(`[browser] WebSocket server  → ws://localhost:${BROWSER_PORT}`);

function broadcast(payload) {
  for (const ws of browserClients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch { /* client gone */ }
    }
  }
}

// ── Ingestor connection ───────────────────────────────────────────────────────
let ingestorWS    = null;
let ingestorAlive = false;

function connectIngestor() {
  console.log(`[ingestor] Connecting to ${INGESTOR_URL}…`);
  ingestorWS = new WebSocket(INGESTOR_URL);

  ingestorWS.on("open", () => {
    ingestorAlive = true;
    console.log("[ingestor] ✓ Connected to ingestor.py");
    broadcastStatus("connected");
  });

  ingestorWS.on("message", (data) => {
    enqueue(data.toString());
  });

  ingestorWS.on("close", () => {
    ingestorAlive = false;
    console.log("[ingestor] Disconnected — retry in 3 s");
    broadcastStatus("disconnected");
    setTimeout(connectIngestor, 3000);
  });

  ingestorWS.on("error", () => {}); // handled by close
}

function broadcastStatus(status) {
  broadcast(JSON.stringify({ type: "status", ingestor: status }));
}

connectIngestor();

// ── Jolpica schedule ──────────────────────────────────────────────────────────
/** @type {object|null} */
let cachedSchedule = null;

async function fetchSchedule() {
  const year = new Date().getFullYear();
  try {
    const res  = await fetch(`${JOLPICA_BASE}/${year}/next.json`, {
      headers: { "User-Agent": "RaceNRoam/1.0" },
      timeout: 8000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const race = json?.MRData?.RaceTable?.Races?.[0];
    if (!race) throw new Error("No race data returned");

    cachedSchedule = {
      name:    race.raceName,
      circuit: race.Circuit?.circuitName,
      country: race.Circuit?.Location?.country,
      round:   Number(race.round),
      sessions: {
        fp1:        race.FirstPractice   ? `${race.FirstPractice.date}T${race.FirstPractice.time}Z`   : null,
        fp2:        race.SecondPractice  ? `${race.SecondPractice.date}T${race.SecondPractice.time}Z` : null,
        fp3:        race.ThirdPractice   ? `${race.ThirdPractice.date}T${race.ThirdPractice.time}Z`   : null,
        qualifying: race.Qualifying      ? `${race.Qualifying.date}T${race.Qualifying.time}Z`         : null,
        sprint:     race.Sprint          ? `${race.Sprint.date}T${race.Sprint.time}Z`                  : null,
        race:       `${race.date}T${race.time ?? "00:00:00"}Z`,
      },
    };

    console.log(`[schedule] Next race: ${cachedSchedule.name} — ${cachedSchedule.sessions.race}`);

    // Push updated schedule to all connected browsers
    broadcast(JSON.stringify({ type: "schedule", race: cachedSchedule }));
  } catch (e) {
    console.warn("[schedule] Jolpica fetch failed:", e.message);
  }
}

fetchSchedule();
setInterval(fetchSchedule, SCHEDULE_TTL_MS);

console.log(`[server] RaceNRoam stream server running  DELAY=${STREAM_DELAY_MS}ms`);
