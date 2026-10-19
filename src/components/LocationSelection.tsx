import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Crosshair, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { searchLocations, type StateEntry } from "@/data/locations";
import { fetchLocations } from "@/lib/location-store";
import "./PreHomeAuth.css";

function save(value: string) {
  try {
    window.localStorage.setItem("basera:location", value);
  } catch {
    // Location memory is a convenience; ignore storage failures.
  }
}

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; states: StateEntry[] };

export function LocationSelection({ onDone, load = fetchLocations }: { onDone: () => void; load?: () => Promise<StateEntry[]> }) {
  const [data, setData] = useState<Load>({ status: "loading" });
  const [stateName, setStateName] = useState<string | null>(null);
  const [townIndex, setTownIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [notice, setNotice] = useState("");

  const run = useCallback(() => {
    let alive = true;
    setData({ status: "loading" });
    load()
      .then((states) => alive && setData({ status: "ready", states }))
      .catch((e: unknown) => alive && setData({ status: "error", message: e instanceof Error ? e.message : "Could not load locations." }));
    return () => { alive = false; };
  }, [load]);
  useEffect(run, [run]);

  const pick = (value: string) => {
    save(value);
    onDone();
  };

  const detect = () => {
    if (detecting) return;
    setNotice("");
    if (!("geolocation" in navigator)) {
      setNotice("Location is not supported on this device. Please choose below.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      () => pick("Near me"),
      () => {
        setDetecting(false);
        setNotice("We couldn't detect your location. Please choose below.");
      },
      { timeout: 10000 },
    );
  };

  const states = data.status === "ready" ? data.states : [];
  const current = stateName ? states.find((s) => s.name === stateName) : undefined;
  const town = current && townIndex !== null ? current.towns[townIndex] : undefined;
  const hits = searchLocations(states, query, stateName ?? undefined);
  const searching = query.trim().length > 0;

  const back = () => {
    setQuery("");
    if (town) setTownIndex(null);
    else setStateName(null);
  };
  const openTown = (index: number) => {
    const t = current?.towns[index];
    if (!current || !t) return;
    if (t.localities.length) { setTownIndex(index); setQuery(""); }
    else pick(`${t.name}, ${current.name}`);
  };

  let body;
  if (data.status === "loading") {
    body = <p className="loc-notice" role="status"><LoaderCircle className="animate-spin" size={18} aria-hidden="true" /> Loading locations…</p>;
  } else if (data.status === "error") {
    body = (
      <div className="loc-notice" role="alert">
        <p>{data.message}</p>
        <button type="button" className="loc-row loc-blue" onClick={run}>Try again</button>
      </div>
    );
  } else if (searching) {
    body = (
      <ul className="loc-list" aria-label="Search results">
        {hits.length === 0 && <li className="loc-empty">No matches for “{query.trim()}”.</li>}
        {hits.map((h, index) => (
          <li key={`${h.label}-${index}`}>
            <button
              type="button"
              className="loc-row"
              onClick={() => (h.town ? pick(h.label) : (setStateName(h.state), setTownIndex(null), setQuery("")))}
            >
              <MapPin size={16} aria-hidden="true" />
              <span>{h.label}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (current && town) {
    body = (
      <>
        <button type="button" className="loc-row loc-blue" onClick={() => pick(`${town.name}, ${current.name}`)}>All in {town.name}</button>
        <p className="loc-heading">CHOOSE LOCALITY</p>
        <ul className="loc-list">
          {town.localities.map((l, index) => (
            <li key={`${l}-${index}`}>
              <button type="button" className="loc-row" onClick={() => pick(`${l}, ${town.name}, ${current.name}`)}><span>{l}</span></button>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (current) {
    body = (
      <>
        <button type="button" className="loc-row loc-blue" onClick={() => pick(current.name)}>All in {current.name}</button>
        <p className="loc-heading">{current.selectionHeading ?? "CHOOSE CITY"}</p>
        <ul className="loc-list">
          {current.towns.length === 0 && <li className="loc-empty">No towns added yet.</li>}
          {current.towns.map((t, index) => (
            <li key={`${t.name}-${index}`}>
              <button type="button" className="loc-row" onClick={() => openTown(index)}>
                <span>{t.name}</span>
                {t.arrow && <ChevronRight size={18} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    body = (
      <>
        <p className="loc-heading">CHOOSE STATE</p>
        <ul className="loc-list">
          {states.length === 0 && <li className="loc-empty">No states added yet.</li>}
          {states.map((s) => (
            <li key={s.name}>
              <button type="button" className="loc-row" onClick={() => setStateName(s.name)}>
                <span>{s.name}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <main className="prehome-auth loc-screen" aria-label="Select your location">
      <section className="loc-panel">
        <header className="loc-header">
          {current ? (
            <button type="button" className="loc-icon" aria-label={town ? "Back to towns" : "Back to states"} onClick={back}>
              <ArrowLeft />
            </button>
          ) : (
            <button type="button" className="loc-icon" aria-label="Close" onClick={onDone}>
              <X />
            </button>
          )}
          <h1>{town ? town.name : current ? current.name : "Location"}</h1>
        </header>

        <label className="loc-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            maxLength={60}
            placeholder="Search city, area or neighbourhood"
            aria-label="Search city, area or neighbourhood"
            value={query}
            disabled={data.status !== "ready"}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {!current && (
          <>
            <button type="button" className="loc-row loc-blue loc-gps" onClick={detect}>
              {detecting ? <LoaderCircle className="animate-spin" size={20} /> : <Crosshair size={20} />}
              <span className="loc-gps-text">
                <strong>Use current location</strong>
                <small>{detecting ? "Detecting…" : "Enable Location"}</small>
              </span>
            </button>
            {notice && <p className="loc-notice" role="alert">{notice}</p>}
          </>
        )}
        {body}
      </section>
    </main>
  );
}
