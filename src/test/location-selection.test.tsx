import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationSelection } from "@/components/LocationSelection";
import { normalizeLocationDoc } from "@/data/locations";

vi.mock("@/lib/location-store", () => ({ fetchLocations: vi.fn() }));
afterEach(cleanup);

const doc = {
  states: [
    { name: "Madhya Pradesh", towns: [{ name: "Kailaras", district: "Morena" }, { name: "Bhopal", localities: ["Arera Colony", "MP Nagar"] }] },
    { name: "Bihar", towns: ["Patna"] },
  ],
};
const load = () => Promise.resolve(normalizeLocationDoc(doc));
const search = () => screen.getByRole("searchbox", { name: "Search city, area or neighbourhood" });

describe("Location selection (Firestore data)", () => {
  it("shows a loading state, then states only", async () => {
    render(<LocationSelection onDone={vi.fn()} load={load} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading locations");
    expect(await screen.findByRole("button", { name: "Bihar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Patna" })).not.toBeInTheDocument();
  });

  it("drills state → town → locality and stores the choice", async () => {
    const onDone = vi.fn();
    render(<LocationSelection onDone={onDone} load={load} />);
    fireEvent.click(await screen.findByRole("button", { name: "Madhya Pradesh" }));
    fireEvent.click(screen.getByRole("button", { name: "Bhopal" }));
    expect(screen.getByText("CHOOSE LOCALITY")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "MP Nagar" }));
    expect(window.localStorage.getItem("basera:location")).toBe("MP Nagar, Bhopal, Madhya Pradesh");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("finds Kailaras with district and state", async () => {
    render(<LocationSelection onDone={vi.fn()} load={load} />);
    await screen.findByRole("button", { name: "Bihar" });
    fireEvent.change(search(), { target: { value: "Kail" } });
    expect(screen.getByRole("button", { name: "Kailaras, Morena, Madhya Pradesh" })).toBeInTheDocument();
  });

  it("shows an error with retry when loading fails", async () => {
    render(<LocationSelection onDone={vi.fn()} load={() => Promise.reject(new Error("Location data has not been added yet."))} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Location data has not been added yet.");
  });
});
