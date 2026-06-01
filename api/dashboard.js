import { buildDashboard } from "../lib/dashboard-data.js";

export default async function handler(request, response) {
  try {
    response.setHeader("cache-control", "s-maxage=30, stale-while-revalidate=30");
    response.status(200).json(await buildDashboard());
  } catch (error) {
    response.status(500).json({ error: error.message || "Unexpected server error" });
  }
}
