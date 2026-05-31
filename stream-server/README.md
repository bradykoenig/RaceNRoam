# RaceNRoam Stream Server

Run this on your streaming PC during F1 sessions.

## Setup (one time)

```bash
# Python ingestor
pip install fastf1 websockets

# Node.js server
cd stream-server
npm install
```

## Run (every stream)

Open TWO terminals:

**Terminal 1 — Python ingestor**
```bash
python ingestor.py
```

**Terminal 2 — Node.js fan-out server**
```bash
cd stream-server
npm start
```

Then open **racenroam.com/stream?series=f1** in your browser.

## Adjust stream delay

Edit `STREAM_DELAY_MS` in `server.js` to match your broadcast latency:
- TikTok Live: ~5000ms (default)
- Twitch: ~8000–12000ms
- YouTube Live: ~15000–30000ms

## Sessions streamed

All five sessions are shown in the schedule:
1. Free Practice 1
2. Free Practice 2  
3. Free Practice 3
4. Qualifying
5. Race

Data only flows during **active F1 sessions** — FastF1 connects to F1's
official live timing feed which is only available when a session is running.
