// Location data is loaded from Firestore (location_data/all_states); nothing is hard-coded here.
export type Town = { name: string; district?: string; localities: string[]; arrow: boolean };
export type StateEntry = { name: string; towns: Town[]; selectionHeading?: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Accepts { states: [...] } or a map { "Bihar": { towns: [...] } }; towns may be strings or objects. */
export function normalizeLocationDoc(doc: unknown): StateEntry[] {
  if (!doc || typeof doc !== "object") return [];
  const raw = (doc as Record<string, unknown>).states;
  const entries: [string | undefined, unknown][] = Array.isArray(raw)
    ? raw.map((s) => [undefined, s])
    : Object.entries(doc as Record<string, unknown>);
  const states: StateEntry[] = [];
  for (const [key, value] of entries) {
    const obj = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
    const name = str(obj.name) ?? key;
    if (!name) continue;
    const list = Array.isArray(value) ? value : Array.isArray(obj.towns) ? obj.towns : Array.isArray(obj.cities) ? obj.cities : [];
    const towns: Town[] = [];
    for (const t of list) {
      if (typeof t === "string") { if (str(t)) towns.push({ name: t.trim(), localities: [], arrow: false }); continue; }
      if (!t || typeof t !== "object") continue;
      const o = t as Record<string, unknown>;
      const tn = str(o.name);
      if (!tn) continue;
      const localities = Array.isArray(o.localities) ? o.localities.map(str).filter((x): x is string => !!x) : [];
      towns.push({ name: tn, district: str(o.district), localities, arrow: o.arrow === true || localities.length > 0 });
    }
    states.push({ name, towns, selectionHeading: str(obj.selectionHeading) });
  }
  return states.sort((a, b) => a.name.localeCompare(b.name));
}

export type SearchHit = { town: string; state: string; label: string; locality?: string };

export function searchLocations(states: StateEntry[], query: string, stateName?: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const s of states) {
    if (stateName && s.name !== stateName) continue;
    if (!stateName && s.name.toLowerCase().includes(q)) hits.push({ town: "", state: s.name, label: s.name });
    for (const t of s.towns) {
      if (t.name.toLowerCase().includes(q)) {
        hits.push({ town: t.name, state: s.name, label: [t.name, t.district, s.name].filter(Boolean).join(", ") });
      }
      for (const l of t.localities) {
        if (l.toLowerCase().includes(q)) hits.push({ town: t.name, state: s.name, locality: l, label: [l, t.name, s.name].join(", ") });
      }
    }
  }
  return hits.slice(0, 50);
}
