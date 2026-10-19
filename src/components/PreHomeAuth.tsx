import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Info,
  Smartphone,
  X,
  Eye,
  EyeOff,
  Home,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authenticationError, emailSchema, loginWithGoogle, resetEmailPassword, submitEmailAccount } from "@/lib/firebase-auth";
import splashLogo from "@/assets/branding/basera-splash-logo.png.asset.json";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import "./PreHomeAuth.css";

type AuthStage = "welcome" | "auth" | "opening" | "location";

type PreHomeAuthProps = {
  stage: AuthStage;
  onStageChange: (stage: AuthStage) => void;
};

export function PreHomeAuth({ stage, onStageChange }: PreHomeAuthProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signup, setSignup] = useState(false);
  const [pending, setPending] = useState<"google" | "apple" | "email" | "reset" | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [method, setMethod] = useState<"options" | "email">("options");
  const [hindi, setHindi] = useState(false);
  const [dialog, setDialog] = useState<"help" | "terms" | "privacy" | null>(null);
  const copy = (english: string, translated: string) => hindi ? translated : english;

  const selectMethod = (next: "options" | "email") => {
    setError("");
    setNotice(null);
    setMethod(next);
  };

  useEffect(() => {
    if (stage !== "welcome") return;
    const timer = window.setTimeout(() => onStageChange("auth"), 2500);
    return () => window.clearTimeout(timer);
  }, [stage, onStageChange]);

  const notify = (text: string, failed = false) => setNotice({ text, error: failed });

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    if (busy) return;
    setError("");
    setBusy(true);
    setPending(provider);
    try {
      if (provider === "google") {
        await loginWithGoogle();
        onStageChange("opening");
      } else {
        const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
        if (result.error) throw result.error;
        if (!result.redirected) {
          const { data, error: userError } = await supabase.auth.getUser();
          if (userError || !data.user) throw userError ?? new Error("Sign-in failed");
          onStageChange("opening");
        }
      }
    } catch (cause) {
      notify(provider === "google" ? authenticationError(cause) : "We couldn't sign in with Apple. Please try again.", true);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setPending("email");
    setNotice(null);
    try {
      await submitEmailAccount({ email, password, name: signup ? name : undefined }, signup);
      onStageChange("opening");
    } catch (cause) {
      notify(authenticationError(cause), true);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const handlePasswordReset = async () => {
    if (busy) return;
    if (!email.trim()) {
      notify("Please enter your email address first.", true);
      return;
    }
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      notify("Please enter a valid email address.", true);
      return;
    }
    setBusy(true);
    setPending("reset");
    try {
      await resetEmailPassword(parsed.data);
      notify("Password reset link sent successfully to your email!");
    } catch (cause) {
      notify(authenticationError(cause), true);
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (stage === "opening") {
    return (
      <main className="prehome-auth" aria-live="polite">
        <div className="prehome-opening">
          <LoaderCircle className="size-9 animate-spin text-primary" aria-hidden="true" />
          <p>Opening your Basera…</p>
        </div>
      </main>
    );
  }

  if (stage === "welcome") {
    return (
      <main className="prehome-auth prehome-splash">
        <section className="prehome-welcome" aria-labelledby="welcome-title">
          <img
            className="prehome-welcome-logo"
            src={splashLogo.url}
            alt="Basera — Find Your Next Home"
            width={768}
            height={768}
            fetchPriority="high"
          />
          <div className="prehome-welcome-copy">
            <h1 id="welcome-title">Apna Basera, Ab Aur Bhi Paas</h1>
            <p>Find a place that feels like home.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="prehome-auth prehome-auth-screen" lang={hindi ? "hi" : "en"}>
      <nav className="prehome-nav" aria-label="Sign-in navigation">
        <Button type="button" variant="ghost" size="icon" aria-label="Close sign-in" title="Close sign-in"
          onClick={() => { selectMethod("options"); onStageChange("location"); }}>
          <X aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" className="prehome-help" onClick={() => setDialog("help")}>
          <Info aria-hidden="true" /> {copy("Help", "सहायता")}
        </Button>
      </nav>
      <section className="prehome-login" aria-label="Sign in to Basera">
        <img className="prehome-auth-logo" src={splashLogo.url} alt="Basera — Find Your Next Home" width={512} height={512} />
        <Button type="button" variant="link" className="prehome-language" onClick={() => setHindi((value) => !value)}>
          {hindi ? "Browse in English" : "हिंदी में ब्राउज़ करें"}
        </Button>

        {error && <div className="prehome-error" role="alert">{error}</div>}
        {method === "options" && (
          <div className="prehome-options">
            <Button type="button" variant="outline" className="prehome-social prehome-phone" onClick={() => notify("Phone login is temporarily under maintenance. Please use Continue with Google or Email for an instant login!")}>
              <Smartphone aria-hidden="true" /> {copy("Continue with Phone", "फ़ोन से जारी रखें")}
            </Button>
            <div className="prehome-divider"><span>{copy("OR", "या")}</span></div>
            <Button type="button" variant="link" className="prehome-email-link" onClick={() => selectMethod("email")}>
              {copy("Login with Email", "ईमेल से लॉगिन करें")}
            </Button>
            <div className="prehome-social-actions">
              <Button type="button" variant="outline" className="prehome-social prehome-google" disabled={busy} onClick={() => void handleSocialSignIn("google")}>
                {pending === "google" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <GoogleMark />} {copy("Continue with Google", "Google से जारी रखें")}
              </Button>
              <Button type="button" variant="default" className="prehome-social prehome-apple" disabled={busy} onClick={() => void handleSocialSignIn("apple")}>
                {pending === "apple" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <AppleMark />} {copy("Continue with Apple", "Apple से जारी रखें")}
              </Button>
            </div>
          </div>
        )}
        {method !== "options" && (
          <Button type="button" variant="link" className="prehome-method-back" onClick={() => selectMethod("options")}>
            <ArrowLeft aria-hidden="true" /> {copy("All sign-in options", "सभी लॉगिन विकल्प")}
          </Button>
        )}
        {method === "email" && <>
        <h1 className="prehome-email-title">{signup ? copy("Create Account", "खाता बनाएँ") : copy("Login with Email", "ईमेल से लॉगिन करें")}</h1>
        <form className="prehome-form" onSubmit={(event) => void handleEmailSubmit(event)}>
          {signup && <label className="prehome-field">
            <span>Your name <small>(optional)</small></span>
            <span className="prehome-input-wrap">
              <Home size={18} aria-hidden="true" />
              <input
                autoComplete="name"
                maxLength={100}
                placeholder="Name for your profile"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </span>
          </label>}
          <label className="prehome-field">
            <span>Email Address</span>
            <span className="prehome-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                maxLength={254}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <label className="prehome-field">
            <span>Password</span>
            <span className="prehome-input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                maxLength={4096}
                minLength={6}
                placeholder="Enter your password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="prehome-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </span>
          </label>
          {!signup && <Button type="button" variant="link" className="prehome-forgot" disabled={busy} onClick={() => void handlePasswordReset()}>
            {pending === "reset" && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Forgot Password?
          </Button>}
          <Button type="submit" className="prehome-primary prehome-submit" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            {pending === "email" ? "Please wait…" : signup ? "Create Account / Sign Up" : "Login"}
          </Button>
          <Button type="button" variant="link" className="prehome-account-switch" disabled={busy} onClick={() => { setSignup((value) => !value); setNotice(null); setError(""); }}>
            {signup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </Button>
        </form>
        </>}
      </section>
      <footer className="prehome-legal">
        {copy("If you continue, you are accepting Basera", "जारी रखने पर आप Basera की")}{" "}
        <Button variant="link" className="prehome-legal-link" onClick={() => setDialog("terms")}>
          {copy("Terms and Conditions", "नियम और शर्तें")}
        </Button>{" "}{copy("and", "और")}{" "}
        <Button variant="link" className="prehome-legal-link" onClick={() => setDialog("privacy")}>
          {copy("Privacy Policy", "गोपनीयता नीति")}
        </Button>{hindi ? " स्वीकार करते हैं।" : ""}
      </footer>
      {notice && <div className="prehome-toast" role={notice.error ? "alert" : "status"}>
        <p>{notice.text}</p>
        <Button type="button" variant="ghost" size="icon" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X aria-hidden="true" /></Button>
      </div>}
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <DialogContent className="prehome-info-dialog">
          <DialogTitle>{dialog === "help" ? copy("Help with sign-in", "लॉगिन में सहायता") : dialog === "terms" ? copy("Terms and Conditions", "नियम और शर्तें") : copy("Privacy Policy", "गोपनीयता नीति")}</DialogTitle>
          <DialogDescription>
            {dialog === "help"
              ? copy("Sign in with Google or your email and password. Choose Sign Up to create an account, or Forgot Password? to request a reset email. Phone sign-in is temporarily under maintenance.", "अपने ईमेल और पासवर्ड से लॉगिन करें। नया खाता बनाने के लिए विवरण भरें और भेजे गए ईमेल से खाता सत्यापित करें। फ़ोन से लॉगिन अभी उपलब्ध नहीं है।")
              : copy("Basera has not published this document yet. Please check back later.", "Basera ने यह दस्तावेज़ अभी प्रकाशित नहीं किया है। कृपया बाद में देखें।")}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="prehome-google-mark">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.7-5c-1.8 1.2-4 1.9-6.8 1.9-5.3 0-9.8-3.6-11.4-8.4H5.7v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.7a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.7 15l6.9 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="prehome-apple-mark">
      <path fill="currentColor" d="M16.37 12.17c.02 2.15 1.88 2.87 1.9 2.88-.02.05-.3 1.05-.98 2.08-.59.88-1.2 1.75-2.16 1.77-.94.02-1.25-.57-2.34-.57-1.08 0-1.43.55-2.32.59-.93.04-1.64-.95-2.24-1.82-1.22-1.77-2.15-5-.9-7.18.62-1.08 1.72-1.77 2.9-1.79.9-.02 1.73.63 2.28.63.55 0 1.58-.78 2.67-.66.46.02 1.75.18 2.58 1.4-.07.05-1.54.9-1.52 2.67ZM14.6 6.98c.49-.59.82-1.41.73-2.22-.7.03-1.55.47-2.06 1.06-.45.51-.85 1.34-.74 2.13.78.06 1.58-.4 2.07-.97Z" />
    </svg>
  );
}