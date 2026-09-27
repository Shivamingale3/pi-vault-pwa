// src/providers/error-boundary.tsx
import { Component, type ErrorInfo, type PropsWithChildren } from "react";

import type { ErrorBoundaryState } from "@/interfaces/props/app.props";
import { Fatal } from "@/screens/states/fatal";

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Unhandled error",
      error.name,
      error.message,
      info.componentStack,
    );
  }

  render() {
    if (this.state.crashed) {
      return (
        <Fatal
          title="Something broke"
          description="PiVault hit an error it could not recover from. Close and reopen the app."
        />
      );
    }
    return this.props.children;
  }
}
