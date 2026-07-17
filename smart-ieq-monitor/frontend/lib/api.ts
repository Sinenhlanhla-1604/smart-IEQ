export interface Reading {
  id?: number;
  device_id: string;
  temp_bme: number | null;
  humidity_bme: number | null;
  pressure_hpa: number | null;
  gas_kohm: number | null;
  temp_dht: number | null;
  humidity_dht: number | null;
  light_lux: number | null;
  recorded_at: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchLatest(deviceId?: string): Promise<Reading | null> {
  const qs = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
  const json = await getJson<{ status: string; data: Reading | null }>(
    `/api/readings/latest${qs}`
  );
  return json.data;
}

export async function fetchHistory(
  limit: number,
  deviceId?: string
): Promise<Reading[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (deviceId) params.set("device_id", deviceId);
  const json = await getJson<{ status: string; data: Reading[] }>(
    `/api/readings?${params.toString()}`
  );
  // API returns newest-first; charts want oldest-first
  return [...json.data].reverse();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const json = await getJson<{ status: string }>("/health");
    return json.status === "ok";
  } catch {
    return false;
  }
}
