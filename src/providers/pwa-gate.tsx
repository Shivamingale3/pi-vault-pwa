// src/providers/pwa-gate.tsx
import { useEffect, useState, type PropsWithChildren } from "react";

import { isInstalled, isIos, isInAppBrowser } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function PwaGate({ children }: PropsWithChildren) {
  const [installed] = useState(isInstalled);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return children;

  if (isInAppBrowser()) {
    return <div>open in Safari or Chrome</div>;
  }

  if (isIos()) {
    return <div>Share → Add to Home Screen</div>;
  }

  return (
    <div>
      <p>PiVAULT must be installed</p>
      {prompt && (
        <button type="button" onClick={() => void prompt.prompt()}>
          Install
        </button>
      )}
    </div>
  );
}