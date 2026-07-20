import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGuests from "./tools/list-guests";
import getGuest from "./tools/get-guest";
import listReservations from "./tools/list-reservations";
import getItinerary from "./tools/get-itinerary";
import listProperties from "./tools/list-properties";
import listMaintenance from "./tools/list-maintenance";
import createMaintenance from "./tools/create-maintenance";

// Use the direct Supabase issuer host so tokens verify against the discovery
// document. VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bellamare-concierge",
  title: "Bellamare Concierge",
  version: "0.1.0",
  instructions:
    "Tools for the Bellamare Concierge Property OS in Los Cabos. " +
    "Use these to inspect guests, reservations, itineraries, properties, and maintenance tickets, " +
    "and to open new maintenance tickets. Callers act as the signed-in staff user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listGuests,
    getGuest,
    listReservations,
    getItinerary,
    listProperties,
    listMaintenance,
    createMaintenance,
  ],
});
