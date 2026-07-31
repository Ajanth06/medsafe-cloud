import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Hosts we will fetch on behalf of the browser (hotlink / referrer issues). */
const ALLOWED_HOSTS = [
  /^images\.tagesschau\.de$/i,
  /^ichef\.bbci\.co\.uk$/i,
  /^www\.aljazeera\.com$/i,
  /^cdn\.aljazeera\.net$/i,
  /^aljazeera\.com$/i,
  /^static\.reuters\.com$/i,
  /^www\.reuters\.com$/i,
  /\.cloudfront\.net$/i,
  /\.bbcimg\.co\.uk$/i,
  /\.bbci\.co\.uk$/i,
  /^i\.guim\.co\.uk$/i,
  /^media\.cnn\.com$/i,
  /^cdn\.cnn\.com$/i,
  /^dims\.apnews\.com$/i,
  /^assets\.apnews\.com$/i,
  /^static01\.nyt\.com$/i,
];

function isAllowedImageUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Proxies news lead images so the browser isn't blocked by CDN referrer rules.
 * GET /api/market/news/image?u=<encoded https url>
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "missing u" }, { status: 400 });
  }

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }

  const target = isAllowedImageUrl(decoded);
  if (!target) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; AARYX/1.0; +https://aaryx.app)",
        Referer: `${target.origin}/`,
      },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `upstream ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "not an image" }, { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "proxy failed",
      },
      { status: 502 },
    );
  }
}
