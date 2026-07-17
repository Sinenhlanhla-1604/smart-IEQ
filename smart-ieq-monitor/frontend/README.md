# Smart IEQ Monitor - Frontend

Next.js dashboard for the Smart Indoor Environmental Quality monitoring
system. Polls the Flask API for live and historical sensor readings and
displays them as an instrument panel with threshold-based status.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your Flask API's local
network address (the same one the ESP32 firmware posts to) - for example:

```
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000
```

## Run

```bash
npm run dev
```

Open http://localhost:3000 (or your machine's LAN IP:3000 to view from
another device on the same network).

## What it shows

- Live tiles for temperature, humidity, pressure, gas resistance, and
  light, each with a threshold "zone bar" (normal / caution / out of
  range)
- Alert banner when any metric is currently outside its normal range
- Historical chart per metric with selectable time range
- Device online/offline status based on how recently a reading arrived

Threshold bands are defined in `lib/thresholds.ts` - see that file's
comments and the report (Chapter 4/5) for justification, since they are
indicative comfort ranges rather than calibrated air-quality standards.

## Requires

The Flask API (`backend/`) running with the following endpoints:
`GET /api/readings`, `GET /api/readings/latest`, `GET /health`.
