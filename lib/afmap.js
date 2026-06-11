import { T } from "./teams";

// API-Football name aliases → our team ids
const ALIAS = {
  "south korea": "kor", "korea republic": "kor",
  "czech republic": "cze", "czechia": "cze",
  "usa": "usa", "united states": "usa",
  "ivory coast": "civ", "cote d'ivoire": "civ", "côte d'ivoire": "civ",
  "turkey": "tur", "türkiye": "tur", "turkiye": "tur",
  "bosnia and herzegovina": "bih", "bosnia & herzegovina": "bih", "bosnia-herzegovina": "bih",
  "cape verde islands": "cpv", "cape verde": "cpv", "cabo verde": "cpv",
  "dr congo": "cod", "congo dr": "cod", "democratic republic of congo": "cod", "dr. congo": "cod",
  "saudi arabia": "ksa", "south africa": "rsa", "new zealand": "nzl",
  "curacao": "cuw", "curaçao": "cuw",
  "ireland": null, // safety: never fuzzy-match similar names
};
const NAME = Object.fromEntries(T.map(t => [t.name.toLowerCase(), t.id]));

export function afTeamId(name) {
  const n = (name || "").toLowerCase().trim();
  if (!n || n.length < 4) return null;
  if (n in ALIAS) return ALIAS[n];
  if (NAME[n]) return NAME[n];
  for (const t of T) {
    const tn = t.name.toLowerCase();
    if (n === tn || n.includes(tn) || tn.includes(n)) return t.id;
  }
  return null;
}

// API-Football status → our status
export function afStatus(short) {
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"].includes(short)) return "live";
  if (["FT", "AET", "PEN"].includes(short)) return "ft";
  return "up";
}
