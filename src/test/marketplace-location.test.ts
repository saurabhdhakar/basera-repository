import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

// The marketplace (public/basera.html) runs its logic inside an IIFE, so the test
// evaluates the real inline script in jsdom and exposes a small test hook inside it.
const html = readFileSync('public/basera.html', 'utf8');

type TestHook = {
  state: { city: string; location: { shortLabel?: string; address?: string; locality?: string; city?: string } | null };
  setAll: (listings: unknown[]) => void;
  setLoading: () => void;
  render: () => void;
};

let dom: JSDOM;
let hook: TestHook;

const LISTINGS = [
  { id: '1', status: 'active', title: 'Bilawali room', city: 'Indore', locality: 'Bilawali, Indore', price: 5000, category: 'room', createdAt: { toMillis: () => Date.now() } },
  { id: '2', status: 'active', title: 'Vijay Nagar room', city: 'Indore', locality: 'Vijay Nagar, Indore', price: 7000, category: 'room', createdAt: { toMillis: () => Date.now() - 1000 } },
  { id: '3', status: 'active', title: 'Bhopal flat', city: 'Bhopal', locality: 'Kolar Road, Bhopal', price: 9000, category: 'flat', createdAt: { toMillis: () => Date.now() - 2000 } },
];

const GPS_LOCATION = {
  address: 'Bilawali, Indore, Madhya Pradesh 452010, India',
  locality: 'Bilawali',
  city: 'Indore',
  state: 'Madhya Pradesh',
  latitude: 22.7196,
  longitude: 75.8577,
  shortLabel: 'Bilawali, Indore',
};

function selectLocation(detail: Record<string, unknown>) {
  dom.window.document.dispatchEvent(
    new (dom.window as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent('basera-location-selected', { detail }),
  );
}

function cardTitles(): string[] {
  const grid = dom.window.document.getElementById('grid')!;
  return Array.from(grid.querySelectorAll('.card .title')).map((el) => el.textContent?.trim() ?? '');
}

function countText(): string {
  return dom.window.document.getElementById('resultCount')!.textContent?.trim() ?? '';
}

beforeAll(() => {
  const stripped = html.replace(/<script[^>]*>\s*<\/script>/g, ''); // drop external firebase tags
  dom = new JSDOM(stripped, { url: 'http://localhost/basera.html', runScripts: 'outside-only' });

  const start = html.indexOf('<script>', html.indexOf('firebase-storage-compat.js'));
  const end = html.indexOf('</script>', start);
  let script = html.slice(start + '<script>'.length, end);
  const call = script.lastIndexOf('initFirebase();');
  expect(call).toBeGreaterThan(-1);
  script =
    script.slice(0, call) +
    `window.__test = {
      state: state,
      setAll: function(v){ ALL = v; },
      setLoading: function(){ listingsLoading = false; listingsError = null; },
      render: render
    }; initFirebase();` +
    script.slice(call + 'initFirebase();'.length);

  dom.window.eval(script);
  hook = (dom.window as unknown as { __test: TestHook }).__test;
});

describe('marketplace location badge and feed filtering', () => {
  it('starts at All India with a dropdown arrow in the badge', () => {
    expect(dom.window.document.getElementById('locLabel')!.textContent).toBe('All India');
    // arrow icon inside the badge, next to the label
    const arrow = dom.window.document.querySelector('#locBtn svg path[d^="M6 9l6 6"]');
    expect(arrow).not.toBeNull();
  });

  it('updates the badge to the short locality name and filters the feed to that locality', () => {
    hook.setAll(LISTINGS);
    hook.setLoading();
    selectLocation(GPS_LOCATION);

    expect(dom.window.document.getElementById('locLabel')!.textContent).toBe('Bilawali, Indore');
    expect(countText()).toContain('Bilawali, Indore');
    expect(cardTitles()).toEqual(['Bilawali room']);
  });

  it('falls back to the whole city when the selected locality has no listings yet', () => {
    selectLocation({ ...GPS_LOCATION, locality: 'Nipania', address: 'Nipania, Indore, Madhya Pradesh, India', shortLabel: 'Nipania, Indore' });

    expect(dom.window.document.getElementById('locLabel')!.textContent).toBe('Nipania, Indore');
    expect(cardTitles().sort()).toEqual(['Bilawali room', 'Vijay Nagar room']);
  });

  it('ignores selection events without valid coordinates', () => {
    const before = hook.state.city;
    selectLocation({ ...GPS_LOCATION, latitude: Number.NaN });
    expect(hook.state.city).toBe(before);
  });

  it('resetting to All India shows everything again and clears the badge', () => {
    dom.window.document.getElementById('locBtn')!.click();
    dom.window.document.getElementById('allIndiaBtn')!.click();

    expect(dom.window.document.getElementById('locLabel')!.textContent).toBe('All India');
    expect(cardTitles().sort()).toEqual(['Bhopal flat', 'Bilawali room', 'Vijay Nagar room']);
  });

  it('picking a city from the browse list filters by that city and clears the locality', () => {
    selectLocation(GPS_LOCATION);
    dom.window.document.querySelector('.city-item[data-city="Bhopal"]')!.dispatchEvent(new dom.window.Event('click', { bubbles: true }));

    expect(dom.window.document.getElementById('locLabel')!.textContent).toBe('Bhopal');
    expect(cardTitles()).toEqual(['Bhopal flat']);
  });
});
