import type { TrustStatus } from "@/types/app.types";

export interface RouterContext {
  trust: {
    status: TrustStatus;
  };
}
