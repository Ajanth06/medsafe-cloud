import type { ReactionPhase, SourceVerificationStatus, WindowReturns } from "@/lib/types/market";

export function classifyReactionPhase(input: {
  windowReturns?: WindowReturns;
  wtiReturns?: WindowReturns;
  brentReturns?: WindowReturns;
  hasNews: boolean;
  verification: SourceVerificationStatus;
}): ReactionPhase {
  const primaryChange = Math.max(
    Math.abs(input.windowReturns?.m10 ?? 0),
    Math.abs(input.wtiReturns?.m10 ?? 0),
    Math.abs(input.brentReturns?.m10 ?? 0),
  );

  if (input.verification === "CONFLICTING") return "REVERSAL_RISK";

  if (!input.hasNews && primaryChange < 0.3) return "PRE_REACTION";

  if (primaryChange >= 3) return "EXTENDED_MOVE";
  if (primaryChange >= 1.5) return "ACTIVE_REACTION";
  if (primaryChange >= 0.5) return "EARLY_REACTION";
  if (primaryChange >= 0.2 && input.hasNews) return "EARLY_REACTION";

  return "UNCERTAIN";
}
