import { doc, getDoc, getFirestore } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase-auth";
import { normalizeLocationDoc, type StateEntry } from "@/data/locations";

let cache: Promise<StateEntry[]> | null = null;

/** Fetches the single nested document location_data/all_states once per session. */
export function fetchLocations(): Promise<StateEntry[]> {
  cache ??= getDoc(doc(getFirestore(firebaseApp()), "location_data", "all_states"))
    .then((snap) => {
      if (!snap.exists()) throw new Error("Location data has not been added yet.");
      return normalizeLocationDoc(snap.data());
    })
    .catch((error: unknown) => {
      cache = null;
      throw error;
    });
  return cache;
}
