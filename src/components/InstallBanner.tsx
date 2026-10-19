import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "basera-install-dismissed";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari never fires beforeinstallprompt — show manual hint instead.
    if (isIosSafari()) {
      const t = setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-background p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <img
          src="/icons/icon-192.png"
          alt="Basera"
          width={44}
          height={44}
          className="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Install Basera app
          </p>
          {showIosHint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap the <span className="font-medium">Share</span> button, then
              choose <span className="font-medium">"Add to Home Screen"</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add Basera to your home screen for one-tap access.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Close"
          className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent"
        >
          ✕
        </button>
      </div>
      {!showIosHint && deferredPrompt && (
        <button
          onClick={install}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add to Home Screen
        </button>
      )}
    </div>
  );
}
