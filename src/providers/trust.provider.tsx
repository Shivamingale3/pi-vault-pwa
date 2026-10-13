// src/providers/trust.provider.tsx
import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { TrustContext } from "@/contexts/trust.context";
import type { TrustStatus } from "@/types/app.types";
import { Splash } from "@/screens/states/splash";
import { requestPersistence } from "@/lib/storage";
export function TrustProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<TrustStatus>("checking");
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  // Boot: read the trust store and decide where the user stands.
  // TODO(phase-3): replace with real trust-store reads.
  useEffect(() => {
    let active = true;

    void (async () => {
      await requestPersistence();

      // TODO(phase-3): read the trust store and derive the real status.
      const next: TrustStatus = "needs-login";
      if (active) setStatus(next);
    })();

    return () => {
      active = false;
    };
  }, []);

  const unlock = useCallback(async (_pin: string) => {
    // TODO(phase-8): derive the PIN key, unwrap device layer then PIN layer.
    throw new Error("unlock not implemented");
  }, []);

  const lock = useCallback(() => {
    setVaultKey(null);
    setStatus("locked");
  }, []);

  // Lock on hide. No timer — see the auto-lock decision.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) lock();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [lock]);

  if (status === "checking") return <Splash />;

  return (
    <TrustContext value={{ status, vaultKey, unlock, lock }}>
      {children}
    </TrustContext>
  );
}
