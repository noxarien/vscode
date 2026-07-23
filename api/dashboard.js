import { buildDashboard } from "../lib/dashboard-data.js";

export default async function handler(request, response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  try {
    const tracker = Array.isArray(request.query?.tracker)
      ? request.query.tracker[0]
      : request.query?.tracker;
    response.setHeader("cache-control", "s-maxage=30, stale-while-revalidate=30");
    response.status(200).json(await buildDashboard({ tracker }));
  } catch (error) {
    response.status(500).json({ error: error.message || "Unexpected server error" });
  }
}
