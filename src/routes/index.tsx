import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { WishlistNavigation } from "@/components/WishlistNavigation";
import { PreHomeAuth } from "@/components/PreHomeAuth";
import { LocationSelection } from "@/components/LocationSelection";
import { RoomLocationBridge } from '@/components/RoomLocationBridge';
import { firebaseConfigured, subscribeFirebaseSession } from "@/lib/firebase-auth";
import { supabase } from "@/integrations/supabase/client";
import { LocationProvider, useLocationState } from '@/components/LocationState';
import type { SelectedLocation } from '@/lib/ola-location';

type AppStage = "checking" | "welcome" | "auth" | "opening" | "location" | "home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Basera — Rooms & Flats, All India" },
      { name: "description", content: "Find and list rooms, flats and PGs across India with Basera." },
      { property: "og:title", content: "Basera — Rooms & Flats, All India" },
      { property: "og:description", content: "Find and list rooms, flats and PGs across India with Basera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LocationProvider><Index /></LocationProvider>,
});

function Index() {
  const [stage, setStage] = useState<AppStage>("checking");
  const openingTimer = useRef<number | null>(null);

  const enterHome = useCallback(() => {
    if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    setStage("opening");
    openingTimer.current = window.setTimeout(() => {
      setStage("home");
      openingTimer.current = null;
    }, 420);
  }, []);

  useEffect(() => {
    let active = true;
    if (firebaseConfigured) {
      const unsubscribe = subscribeFirebaseSession((user) => {
        if (!active) return;
        if (user) setStage((current) => current === "checking" ? "home" : current === "home" ? current : "opening");
        else setStage((current) => current === "checking" || current === "home" ? "welcome" : current);
      }, () => { if (active) setStage("welcome"); });
      return () => {
        active = false;
        unsubscribe();
        if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
      };
    }
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        if (event === "SIGNED_IN") enterHome();
        else setStage((current) => current === "checking" ? "home" : current);
      } else if (event === "SIGNED_OUT") {
        setStage("welcome");
      }
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setStage(data.user && !error ? "home" : "welcome");
    }).catch(() => {
      if (active) setStage("welcome");
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      if (openingTimer.current !== null) window.clearTimeout(openingTimer.current);
    };
  }, [enterHome]);

  useEffect(() => {
    if (stage !== "opening") return;
    const timer = window.setTimeout(() => setStage("home"), 420);
    return () => window.clearTimeout(timer);
  }, [stage]);

  if (stage === "checking") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background" aria-label="Checking your account">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
      </main>
    );
  }

  if (stage === "location") {
    return <LocationSelection onDone={enterHome} />;
  }

  if (stage !== "home") {
    return <PreHomeAuth stage={stage} onStageChange={setStage} />;
  }

  return <Marketplace />;
}

function Marketplace() {
  const [locationOpen, setLocationOpen] = useState(false);
  const { location } = useLocationState();
  const [embeddedDocument, setEmbeddedDocument] = useState<Document | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const locationTrigger = useRef<HTMLElement | null>(null);
  const applyLocation = useCallback((value: SelectedLocation) => {
    embeddedDocument?.dispatchEvent(new CustomEvent('basera-location-selected', { detail: value }));
  }, [embeddedDocument]);
  useEffect(() => {
    if (!embeddedDocument) return;
    if (location) applyLocation(location);
    const button = embeddedDocument.getElementById('locBtn');
    const open = (event: Event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      locationTrigger.current = button;
      setLocationOpen(true);
    };
    button?.addEventListener('click', open, true);
    return () => button?.removeEventListener('click', open, true);
  }, [embeddedDocument, location, applyLocation]);
  const closeLocation = () => { setLocationOpen(false); locationTrigger.current?.focus(); };
  useEffect(() => {
    const timer = window.setInterval(() => {
      const doc = frameRef.current?.contentDocument;
      if (doc?.getElementById('reactHeaderTools')) {
        setEmbeddedDocument(doc);
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <>
    <iframe
      ref={frameRef}
      src="/basera.html"
      title="Basera"
      className="fixed inset-0 h-full w-full border-0"
      onLoad={(event) => setEmbeddedDocument(event.currentTarget.contentDocument)}
    />
    {embeddedDocument && <><WishlistNavigation document={embeddedDocument} /><RoomLocationBridge document={embeddedDocument} /></>}
    {locationOpen && <div className="fixed inset-0 z-50 overflow-auto bg-background" onKeyDown={e => { if (e.key === 'Escape') closeLocation(); }}><LocationSelection onDone={closeLocation} onSelect={value => { if (value) applyLocation(value); }} /></div>}
    </>
  );
}
