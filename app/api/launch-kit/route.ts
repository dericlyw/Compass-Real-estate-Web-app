import JSZip from "jszip";
import { readStore } from "@/lib/data/store";
import { videoMap } from "@/lib/data/urban-forest";
import { README, rowsFor, toCsv } from "@/lib/engine/launchkit";
import type { Platform } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") as Platform | null;
  if (!platform || !(platform in PLATFORM_LABEL)) return new Response("Unknown platform", { status: 400 });
  const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const s = await readStore();
  const rows = rowsFor(s, platform, site);
  if (!rows.length) return new Response("No approved assets for this platform yet.", { status: 409 });

  const zip = new JSZip();
  zip.file("ads.csv", toCsv(rows));
  zip.file("manifest.json", JSON.stringify({ project: s.project.name, platform, exportedAt: new Date().toISOString(), count: rows.length, rows, video_map: videoMap.map(({ id, start, end, isRender }) => ({ id, start, end, isRender })) }, null, 2));
  zip.file("README.txt", README(PLATFORM_LABEL[platform], s.project.name));
  const body = await zip.generateAsync({ type: "uint8array" });
  return new Response(body as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${s.project.slug}_${platform}_launch-kit.zip"`,
    },
  });
}
