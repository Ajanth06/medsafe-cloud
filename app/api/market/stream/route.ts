import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import {
  getQuotesSnapshotReady,
  startMarketStream,
} from "@/lib/market-intelligence/services/market-stream-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const limited = await withUserRateLimit(auth.userId, "stream");
  if (limited) return limited;

  startMarketStream();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const push = async () => {
        // Serve cache fast; background poll keeps it warm
        const state = await getQuotesSnapshotReady(1_500);
        send("quotes", {
          quotes: state.quotes,
          lastPollAt: state.lastPollAt,
          isDemo: state.isDemo,
          refreshing: state.refreshing,
        });
      };

      await push();
      const interval = setInterval(() => {
        void push();
      }, 1_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
