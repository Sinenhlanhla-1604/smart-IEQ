"""
IEQ Monitoring System - Flask API
---------------------------------
Receives sensor readings from the ESP32 over HTTP POST, validates the
payload, and stores it in Supabase PostgreSQL.

Endpoints:
    POST /api/readings       - insert a new sensor reading
    GET  /api/readings       - fetch recent readings (for the dashboard)
    GET  /api/readings/latest- fetch the most recent reading
    GET  /health             - simple health check

Environment variables required (see .env.example):
    SUPABASE_URL
    SUPABASE_KEY   (service role or anon key, depending on your RLS setup)
"""

import os
import logging
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("SUPABASE_URL / SUPABASE_KEY not set - API will fail on DB calls until configured.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

app = Flask(__name__)
CORS(app)  # Allows the Next.js dashboard (different origin) to read from this API

TABLE_NAME = "readings"

# Fields expected from the ESP32 firmware payload
REQUIRED_FIELDS = [
    "device_id",
    "temp_bme",
    "humidity_bme",
    "pressure_hpa",
    "gas_kohm",
    "temp_dht",
    "humidity_dht",
    "light_lux",
]


def validate_payload(data):
    """Returns (is_valid, error_message)."""
    if not isinstance(data, dict):
        return False, "Payload must be a JSON object."

    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    numeric_fields = [f for f in REQUIRED_FIELDS if f != "device_id"]
    for field in numeric_fields:
        value = data.get(field)
        if value is None:
            continue  # allow null for a failed sensor read, logged but not rejected
        if not isinstance(value, (int, float)):
            return False, f"Field '{field}' must be numeric."

    return True, None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "supabase_configured": supabase is not None}), 200


@app.route("/api/readings", methods=["POST"])
def create_reading():
    if supabase is None:
        return jsonify({"error": "Supabase not configured on server."}), 500

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    is_valid, error = validate_payload(data)
    if not is_valid:
        logger.warning("Rejected payload: %s", error)
        return jsonify({"error": error}), 400

    record = {
        "device_id": data["device_id"],
        "temp_bme": data.get("temp_bme"),
        "humidity_bme": data.get("humidity_bme"),
        "pressure_hpa": data.get("pressure_hpa"),
        "gas_kohm": data.get("gas_kohm"),
        "temp_dht": data.get("temp_dht"),
        "humidity_dht": data.get("humidity_dht"),
        "light_lux": data.get("light_lux"),
    }

    try:
        result = supabase.table(TABLE_NAME).insert(record).execute()
        logger.info("Inserted reading from %s", data["device_id"])
        return jsonify({"status": "success", "data": result.data}), 201
    except Exception as exc:
        logger.error("Supabase insert failed: %s", exc)
        return jsonify({"error": "Database insert failed.", "details": str(exc)}), 500


@app.route("/api/readings", methods=["GET"])
def list_readings():
    if supabase is None:
        return jsonify({"error": "Supabase not configured on server."}), 500

    limit = request.args.get("limit", default=100, type=int)
    device_id = request.args.get("device_id", default=None, type=str)

    try:
        query = supabase.table(TABLE_NAME).select("*").order("recorded_at", desc=True).limit(limit)
        if device_id:
            query = query.eq("device_id", device_id)
        result = query.execute()
        return jsonify({"status": "success", "data": result.data}), 200
    except Exception as exc:
        logger.error("Supabase query failed: %s", exc)
        return jsonify({"error": "Database query failed.", "details": str(exc)}), 500


@app.route("/api/readings/latest", methods=["GET"])
def latest_reading():
    if supabase is None:
        return jsonify({"error": "Supabase not configured on server."}), 500

    device_id = request.args.get("device_id", default=None, type=str)

    try:
        query = supabase.table(TABLE_NAME).select("*").order("recorded_at", desc=True).limit(1)
        if device_id:
            query = query.eq("device_id", device_id)
        result = query.execute()
        data = result.data[0] if result.data else None
        return jsonify({"status": "success", "data": data}), 200
    except Exception as exc:
        logger.error("Supabase query failed: %s", exc)
        return jsonify({"error": "Database query failed.", "details": str(exc)}), 500


if __name__ == "__main__":
    # host=0.0.0.0 so the ESP32 on the local network can reach it
    app.run(host="0.0.0.0", port=5000, debug=True)