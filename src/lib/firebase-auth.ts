import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile,
  onAuthStateChanged, type User,
} from "firebase/auth";
import { z } from "zod";

const config = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  appId: import.meta.env['VITE_FIREBASE_APP_ID'],
};
export const firebaseConfigured = Object.values(config).every((value) => typeof value === "string" && value.trim().length > 0);
export const emailSchema = z.string().trim().email("Please enter a valid email address.").max(254);
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must contain at least 6 characters.").max(4096),
  name: z.string().trim().max(100).optional(),
});

export function firebaseApp() {
  if (!firebaseConfigured) throw new Error("Firebase is not configured yet. Please try again after setup is complete.");
  return getApps().length ? getApp() : initializeApp(config);
}

function auth() {
  return getAuth(firebaseApp());
}

export function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth(), provider);
}

export async function submitEmailAccount(input: z.input<typeof credentialsSchema>, signup: boolean) {
  const { email, password, name } = credentialsSchema.parse(input);
  const client = auth();
  if (!signup) return signInWithEmailAndPassword(client, email, password);
  const result = await createUserWithEmailAndPassword(client, email, password);
  if (name) {
    // Profile failures must not turn a successfully created account into a retry.
    await updateProfile(result.user, { displayName: name }).catch(() => undefined);
  }
  return result;
}

export function resetEmailPassword(email: string) {
  return sendPasswordResetEmail(auth(), emailSchema.parse(email));
}

export function subscribeFirebaseSession(callback: (user: User | null) => void, onError: () => void) {
  return onAuthStateChanged(auth(), callback, onError);
}

export function authenticationError(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Please check your details.";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Your email or password is incorrect. Please try again.",
    "auth/email-already-in-use": "An account with this email already exists. Please log in instead.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled. Please try again.",
    "auth/popup-blocked": "Please allow popups in your browser to sign in with Google.",
    "auth/unauthorized-domain": "Google sign-in is not enabled for this website yet.",
    "auth/operation-not-allowed": "This sign-in method has not been enabled yet.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/network-request-failed": "Please check your internet connection and try again.",
    "auth/weak-password": "Please choose a stronger password.",
    "auth/invalid-email": "Please enter a valid email address.",
  };
  if (messages[code]) return messages[code];
  if (!firebaseConfigured) return "Firebase sign-in is not configured yet. Please try again after setup is complete.";
  return "We couldn't complete your request. Please try again.";
}