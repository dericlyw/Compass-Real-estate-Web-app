"""PropVid video worker — Stage 1 (proxy), Stage 2 (video study) and Stage 5 (clip cutter).

Runs on a container host (Railway / Fly.io / Modal), never on Vercel serverless.
Idempotent: every output path is derived from the input hash, so re-running a stage is safe.

  python pipeline.py proxy  master.mp4 out/
  python pipeline.py study  master.mp4 out/            -> out/video_map.json (+ keyframes)
  python pipeline.py cut    master.mp4 kit.json out/   -> one MP4 per asset/aspect
  add --dry-run to print the ffmpeg commands instead of running them.

kit.json is the manifest.json from a Launch Kit export (rows carry `scenes`, `aspect`,
`hook`, `end_card`) plus a `video_map` array of scenes with start/end seconds.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shlex
import subprocess
import sys
from pathlib import Path

ASPECTS = {"9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350), "16:9": (1920, 1080)}
DURATIONS = {"Reel / TikTok 15s": 15, "Feed video 30s": 30}
FONT = "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"  # covers EN / BM / 中文


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def run(cmd: list[str], dry: bool) -> None:
    print("$", " ".join(shlex.quote(c) for c in cmd))
    if not dry:
        subprocess.run(cmd, check=True)


def esc(text: str) -> str:
    """Escape text for ffmpeg drawtext."""
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def proxy(src: Path, out: Path, dry: bool) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    dst = out / f"proxy_{sha256(src) if src.exists() else 'x'}_720p.mp4"
    if dst.exists():
        return dst
    run(["ffmpeg", "-y", "-i", str(src), "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-c:a", "aac", str(dst)], dry)
    return dst


def study(src: Path, out: Path, dry: bool) -> Path:
    """Scene detection + transcript + keyframes. Vision scoring is done by the web app's
    Study Agent (Claude) over the keyframes; this stage produces the raw material."""
    out.mkdir(parents=True, exist_ok=True)
    frames = out / "keyframes"
    frames.mkdir(exist_ok=True)
    if dry:
        print("# would run PySceneDetect ContentDetector + faster-whisper (en/ms/zh) on", src)
        return out / "video_map.json"

    from scenedetect import ContentDetector, detect  # type: ignore

    scenes = detect(str(src), ContentDetector(threshold=27.0))
    transcript: list[dict] = []
    try:
        from faster_whisper import WhisperModel  # type: ignore

        model = WhisperModel("large-v3", compute_type="int8")
        segments, info = model.transcribe(str(src), vad_filter=True)
        transcript = [{"start": s.start, "end": s.end, "text": s.text.strip(), "lang": info.language} for s in segments]
    except ImportError:
        print("faster-whisper not installed; transcript left empty", file=sys.stderr)

    out_scenes = []
    for i, (a, b) in enumerate(scenes, 1):
        start, end = a.get_seconds(), b.get_seconds()
        mid = (start + end) / 2
        frame = frames / f"s{i:02d}.jpg"
        run(["ffmpeg", "-y", "-ss", f"{mid:.2f}", "-i", str(src), "-frames:v", "1", "-q:v", "3", str(frame)], dry)
        line = " ".join(t["text"] for t in transcript if t["start"] < end and t["end"] > start)
        out_scenes.append({"id": f"s{i:02d}", "start": round(start, 2), "end": round(end, 2), "line": line, "keyframe": frame.name})

    dst = out / "video_map.json"
    dst.write_text(json.dumps({"source": src.name, "input_hash": sha256(src), "scenes": out_scenes, "transcript": transcript}, ensure_ascii=False, indent=2))
    return dst


def cut(src: Path, kit_path: Path, out: Path, dry: bool) -> None:
    kit = json.loads(kit_path.read_text())
    vmap = {s["id"]: s for s in kit["video_map"]}
    out.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    for row in kit["rows"]:
        if row["format"] not in DURATIONS:
            continue  # statics come from keyframes
        # One render per asset (variants share footage; only copy differs).
        asset_key = row["ad_name"].rsplit("_", 1)[0]
        if asset_key in seen:
            continue
        seen.add(asset_key)
        w, h = ASPECTS[row["aspect"]]
        target = DURATIONS[row["format"]]
        scenes = [vmap[s] for s in row["scenes"].split() if s in vmap]
        body = scenes[:-1] or scenes
        per = max(1.5, (target - 3) / max(1, len(body)))  # last 3 s = end card
        parts, filters = [], []
        for i, sc in enumerate(body):
            dur = min(per, sc["end"] - sc["start"])
            parts += ["-ss", f"{sc['start']:.2f}", "-t", f"{dur:.2f}", "-i", str(src)]
            filters.append(f"[{i}:v]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps=30[v{i}]")
        n = len(body)
        concat = "".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[base]"
        hook = esc(row["hook"])
        end_card = esc(row["end_card"])
        fs = int(w * 0.055)
        overlay = (
            f"[base]drawtext=fontfile={FONT}:text='{hook}':fontcolor=white:fontsize={fs}:box=1:boxcolor=black@0.45:boxborderw=24:"
            f"x=(w-text_w)/2:y=h*0.12:enable='lt(t,3)',"
            f"tpad=stop_mode=add:stop_duration=3:color=0x0B0B0C,"
            f"drawtext=fontfile={FONT}:text='{esc(row['headline'])}':fontcolor=0xC9A45C:fontsize={fs}:x=(w-text_w)/2:y=h*0.42:enable='gte(t,{target - 3})',"
            f"drawtext=fontfile={FONT}:text='{esc(row['cta'])}':fontcolor=white:fontsize={int(fs * 0.7)}:x=(w-text_w)/2:y=h*0.52:enable='gte(t,{target - 3})',"
            f"drawtext=fontfile={FONT}:text='{end_card}':fontcolor=white@0.8:fontsize={int(w * 0.018)}:x=(w-text_w)/2:y=h*0.92[out]"
        )
        dst = out / f"{asset_key}.mp4"
        run(["ffmpeg", "-y", *parts, "-filter_complex", ";".join(filters + [concat, overlay]), "-map", "[out]", "-t", str(target),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", str(dst)], dry)
        # Burned-in voice-over captions (from the transcript) are added as a second pass
        # with the subtitles filter once the master-file transcript exists.


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["proxy", "study", "cut"])
    ap.add_argument("args", nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.cmd == "proxy":
        print(proxy(Path(a.args[0]), Path(a.args[1]), a.dry_run))
    elif a.cmd == "study":
        print(study(Path(a.args[0]), Path(a.args[1]), a.dry_run))
    else:
        cut(Path(a.args[0]), Path(a.args[1]), Path(a.args[2]), a.dry_run)


if __name__ == "__main__":
    main()
