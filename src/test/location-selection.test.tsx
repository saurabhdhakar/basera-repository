import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocationSelection } from '@/components/LocationSelection';
import { LocationProvider } from '@/components/LocationState';
import { normalizeOlaPlace } from '@/lib/ola-location';

const mocks = vi.hoisted(() => ({ autocomplete: vi.fn(), resolve: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/ola-location.functions', () => ({ autocompleteLocations: mocks.autocomplete, resolveLocation: mocks.resolve }));
afterEach(() => { cleanup(); vi.clearAllMocks(); window.sessionStorage.clear(); });
const selected = { address: 'Bhopal, Madhya Pradesh, India', city: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 };
const show = () => render(<LocationProvider><LocationSelection onDone={vi.fn()} /></LocationProvider>);

describe('Ola location selection', () => {
  it('keeps room selections separate from the browsing location and clears edited coordinates', async () => {
    window.sessionStorage.setItem('basera:selected-location', JSON.stringify({ ...selected, city: 'Delhi' }));
    mocks.autocomplete.mockResolvedValue({ data: [{ placeId: 'bhopal', address: selected.address, title: 'Bhopal', subtitle: '' }], error: null });
    mocks.resolve.mockResolvedValue({ data: selected, error: null });
    const onSelect = vi.fn();
    render(<LocationProvider><LocationSelection inline onDone={vi.fn()} onSelect={onSelect} /></LocationProvider>);
    expect(screen.getByRole('combobox')).toHaveValue('');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Bhopal' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Bhopal' }));
    await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith(selected));
    expect(JSON.parse(window.sessionStorage.getItem('basera:selected-location') || '{}').city).toBe('Delhi');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Another address' } });
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
  it('resolves an autocomplete selection and synchronizes address, city, state and coordinates', async () => {
    mocks.autocomplete.mockResolvedValue({ data: [{ placeId: 'bhopal', address: selected.address, title: 'Bhopal', subtitle: 'Madhya Pradesh, India' }], error: null });
    mocks.resolve.mockResolvedValue({ data: selected, error: null });
    show();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Bhopal' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Bhopal Madhya Pradesh, India' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(selected.address));
    expect(mocks.resolve).toHaveBeenCalledWith({ data: { kind: 'place', placeId: 'bhopal' } });
    expect(JSON.parse(window.sessionStorage.getItem('basera:selected-location') || '{}')).toEqual(selected);
  });
  it('passes actual GPS coordinates to reverse geocoding and stores the returned address', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 23.2599, longitude: 77.4126 } } as GeolocationPosition));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    mocks.resolve.mockResolvedValue({ data: selected, error: null });
    show(); fireEvent.click(screen.getByRole('button', { name: 'Use current location Enable Location' }));
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue(selected.address));
    expect(mocks.resolve).toHaveBeenCalledWith({ data: { kind: 'gps', latitude: 23.2599, longitude: 77.4126 } });
    expect(JSON.parse(window.sessionStorage.getItem('basera:selected-location') || '{}')).toEqual(selected);
  });
  it('does not save a fabricated location when GPS permission is denied', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn((_success, failure) => failure({ code: 1 })) } });
    show(); fireEvent.click(screen.getByRole('button', { name: 'Use current location Enable Location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('permission was denied');
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem('basera:selected-location')).toBeNull();
  });
  it('ignores stale autocomplete responses after the query changes', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.autocomplete.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    show(); fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Bhopal' } });
    await waitFor(() => expect(mocks.autocomplete).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    finish?.({ data: [{ placeId: 'old', address: 'Old address', title: 'Old address', subtitle: '' }], error: null });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Old address' })).not.toBeInTheDocument());
  });
  it('extracts city and state and rejects invalid coordinates', () => {
    const place = { formatted_address: selected.address, address_components: [{ long_name: 'Bhopal', types: ['locality'] }, { long_name: 'Madhya Pradesh', types: ['administrative_area_level_1'] }], geometry: { location: { lat: 23.2599, lng: 77.4126 } } };
    expect(normalizeOlaPlace(place)).toEqual(selected);
    expect(normalizeOlaPlace({ ...place, geometry: { location: { lat: 200, lng: 77.4126 } } })).toBeNull();
  });
  it('uses the named locality when Ola city details omit its locality component', () => {
    expect(normalizeOlaPlace({ name: 'Bhopal', types: ['locality'], formatted_address: selected.address, address_components: [{ long_name: 'Madhya Pradesh', types: ['administrative_area_level_1'] }], geometry: { location: { lat: 23.2599, lng: 77.4126 } } })).toEqual(selected);
  });
});