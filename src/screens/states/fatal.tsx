// src/screens/states/fatal.tsx
import type { FatalProps } from "@/interfaces/props/app.props";
import { ErrorState } from "@/screens/states/error";

export function Fatal({
  title = "PiVault can't start",
  description = "This browser is blocking the storage PiVault needs. Private browsing and some privacy settings prevent it. Try a normal window.",
}: FatalProps) {
  return <ErrorState title={title} description={description} />;
}
