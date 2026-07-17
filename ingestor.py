#!/usr/bin/env python3
"""
RaceNRoam F1 Live Timing Ingestor
----------------------------------
Connects to F1's official SignalR live timing feed via FastF1.
Parses CarData.z (telemetry), Position.z (GPS X/Y), and TimingData.
Broadcasts JSON state to server.js on ws://localhost:8081 at 5 Hz.

Install:  pip install fastf1 websockets
Run:      python ingestor.py
"""

import asyncio
import json
import logging
import time
from collections import defaultdict

import websockets

try:
    from fastf1.livetiming.client import SignalRClient
except ImportError:
    raise SystemExit("ERROR: run  pip install fastf1 websockets  first.")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ingestor] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ingestor")

# ── Config ────────────────────────────────────────────────────────────────────
OUT_PORT = 8081          # server.js connects here
BROADCAST_HZ = 5         # frames per second sent upstream
BROADCAST_INTERVAL = 1.0 / BROADCAST_HZ

# ── Shared state (updated by handlers, read by broadcast loop) ────────────────
timing    = defaultdict(dict)   # driver_number -> timing fields
positions = defaultdict(dict)   # driver_number -> {x, y, speed, rpm, …}
session   = {}                  # session meta

_upstream_clients: set = set()


# ── FastF1 SignalR subclass ───────────────────────────────────────────────────

HANDLED_TOPICS = {
    "TimingData",
    "TimingAppData",
    "Position.z",
    "CarData.z",
    "DriverList",
    "SessionInfo",
    "RaceControlMessages",
}

class F1Ingestor(SignalRClient):
    """
    Subclasses FastF1's SignalRClient to intercept raw SignalR messages
    and populate the shared state dicts instead of writing to file.
    """

    def __init__(self):
        # filename=None suppresses file output
        super().__init__(filename=None, logger=log)

    # FastF1 calls this for every decoded SignalR message
    def _on_message(self, msg):
        try:
            if not isinstance(msg, (list, tuple)) or len(msg) < 2:
                return
            topic, data = msg[0], msg[1]
            if topic not in HANDLED_TOPICS:
                return
            handler = getattr(self, f"_h_{topic.replace('.', '_').lower()}", None)
            if handler:
                handler(data)
        except Exception as exc:
            log.debug("message parse error: %s", exc)

    # ── Per-topic handlers ────────────────────────────────────────

    def _h_timingdata(self, data):
        lines = data.get("Lines", {})
        for num, info in lines.items():
            t = timing[str(num)]
            if "Position" in info:
                t["pos"] = info["Position"]
            gap = info.get("GapToLeader", None)
            if gap is not None:
                t["gap"] = gap
            itvl = info.get("IntervalToPositionAhead", {})
            if "Value" in itvl:
                t["interval"] = itvl["Value"]
            if "InPit"  in info: t["in_pit"]  = bool(info["InPit"])
            if "PitOut" in info: t["pit_out"] = bool(info["PitOut"])
            ll = info.get("LastLapTime", {})
            if "Value" in ll: t["last_lap"] = ll["Value"]
            bl = info.get("BestLapTime", {})
            if "Value" in bl: t["best_lap"] = bl["Value"]
            for i, s in enumerate((info.get("Sectors") or [])[:3]):
                if "Value" in s:
                    t[f"s{i+1}"] = s["Value"]

    def _h_timingappdata(self, data):
        lines = data.get("Lines", {})
        for num, info in lines.items():
            stints = info.get("Stints")
            if stints:
                latest = (
                    list(stints.values())[-1]
                    if isinstance(stints, dict)
                    else stints[-1]
                )
                timing[str(num)]["tyre"]      = latest.get("Compound", "")
                timing[str(num)]["tyre_laps"] = latest.get("TotalLaps", 0)

    def _h_position_z(self, data):
        entries = data.get("Entries", [])
        for entry in entries:
            for num, p in entry.get("Cars", {}).items():
                positions[str(num)].update({
                    "x": p.get("X", 0),
                    "y": p.get("Y", 0),
                    "z": p.get("Z", 0),
                })

    def _h_cardata_z(self, data):
        entries = data.get("Entries", [])
        for entry in entries:
            for num, car in entry.get("Cars", {}).items():
                ch = car.get("Channels", {})
                positions[str(num)].update({
                    "speed":    ch.get("2",  0),
                    "rpm":      ch.get("0",  0),
                    "gear":     ch.get("3",  0),
                    "throttle": ch.get("4",  0),
                    "brake":    ch.get("5",  0),
                    "drs":      ch.get("45", 0),
                })

    def _h_driverlist(self, data):
        for num, info in data.items():
            t = timing[str(num)]
            t["name"]  = info.get("FullName", "")
            t["abbr"]  = info.get("Tla", "")
            t["team"]  = info.get("TeamName", "")
            t["color"] = f"#{info.get('TeamColour', 'ffffff')}"
            t["num"]   = str(num)

    def _h_sessioninfo(self, data):
        session.update({
            "name":   data.get("Name", ""),
            "type":   data.get("Type", ""),
            "status": data.get("Status", ""),
        })
        log.info("Session: %s (%s)", session.get("name"), session.get("type"))

    def _h_racecontrolmessages(self, data):
        pass  # forward if needed later


# ── WebSocket server (server.js connects here) ────────────────────────────────

async def _ws_handler(websocket, path="/"):
    _upstream_clients.add(websocket)
    log.info("server.js connected (%d upstream)", len(_upstream_clients))
    try:
        async for _ in websocket:
            pass
    finally:
        _upstream_clients.discard(websocket)
        log.info("server.js disconnected")


async def _broadcast_loop():
    while True:
        await asyncio.sleep(BROADCAST_INTERVAL)
        if not _upstream_clients:
            continue
        payload = json.dumps({
            "type":      "live",
            "ts":        time.time(),
            "session":   session,
            "timing":    dict(timing),
            "positions": dict(positions),
        }, separators=(",", ":"))
        dead = set()
        for ws in _upstream_clients:
            try:
                await ws.send(payload)
            except Exception:
                dead.add(ws)
        _upstream_clients -= dead


# ── Entry point ───────────────────────────────────────────────────────────────

async def main():
    log.info("RaceNRoam Ingestor — broadcasting on ws://localhost:%d at %dHz", OUT_PORT, BROADCAST_HZ)
    server = await websockets.serve(_ws_handler, "127.0.0.1", OUT_PORT)
    asyncio.create_task(_broadcast_loop())
    log.info("Connecting to F1 live timing feed (data only flows during active F1 sessions)…")
    client = F1Ingestor()
    try:
        await client.start()
    except KeyboardInterrupt:
        log.info("Shutting down.")
    finally:
        server.close()

if __name__ == "__main__":
    asyncio.run(main())
