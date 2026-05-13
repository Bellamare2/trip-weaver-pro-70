import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface PlaceResult {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
}

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ results: PlaceResult[]; error: string | null }> => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", data.query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("extratags", "1");
      url.searchParams.set("limit", "8");

      const res = await fetch(url, {
        headers: {
          "User-Agent": "ConciergeItineraryStudio/1.0",
          "Accept-Language": "en",
        },
      });
      if (!res.ok) {
        return { results: [], error: `Search failed (${res.status})` };
      }
      const json = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
        name?: string;
        extratags?: Record<string, string>;
      }>;
      const results: PlaceResult[] = json.map((r) => ({
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name,
        phone: r.extratags?.phone || r.extratags?.["contact:phone"] || null,
        website: r.extratags?.website || r.extratags?.["contact:website"] || null,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      }));
      return { results, error: null };
    } catch (err) {
      console.error("Place search failed:", err);
      return { results: [], error: "Lookup unavailable" };
    }
  });
