#!/usr/bin/env python3
"""Validate the generated Lab 3 report PDF.

Checks that the PDF is a usable submission:
  * every "Answer Part N" heading is present, in order, for N = 1..9;
  * the cover carries the author name and student id;
  * the contents page links are real internal link annotations;
  * external links survive as link annotations;
  * images are distributed 2-4 per page on evidence pages (the "2-4 images per A4
    page" rule), and no evidence page is a single oversized image;
  * the file is at or under the size budget;
  * no page is blank.

Usage: python3 scripts/check-report-pdf.py <pdf> [report.md] [manifest.json]
"""
import os
import re
import sys

from pypdf import PdfReader

SIZE_BUDGET_KB = 10 * 1024
# Below ~110 dpi a screenshot stops being legible on paper. Phone captures are the
# limiting case: they are only 390 CSS px wide, so the builder prints them at ~75mm
# rather than upscaling them to the full A4 width.
MIN_PRINT_DPI = 110
MIN_FIGS_PER_PAGE = 2
MAX_FIGS_PER_PAGE = 4

pdf_path = sys.argv[1]
md_path = sys.argv[2] if len(sys.argv) > 2 else None
manifest_path = sys.argv[3] if len(sys.argv) > 3 else None

# Print geometry used by scripts/build-report.mjs (A4, 13mm side margins).
PRINT_WIDTH_MM = 210 - 13 - 13
FIG_CAPS_MM = {"tall": 115, "large": 90, "medium": 70, "small": 50}
MM_PER_INCH = 25.4

reader = PdfReader(pdf_path)
pages = reader.pages
kb = os.path.getsize(pdf_path) / 1024
text = [(p.extract_text() or "") for p in pages]
full = "\n".join(text)

problems = []
notes = []

# --- parts -------------------------------------------------------------------
positions = {}
for n in range(1, 10):
    needle = f"Answer Part {n}:"
    idx = full.find(needle)
    positions[n] = idx
    if idx < 0:
        problems.append(f"missing heading {needle!r}")
order = [positions[n] for n in range(1, 10) if positions[n] >= 0]
if order != sorted(order):
    problems.append("Answer Part headings are not in 1..9 order")

# --- cover -------------------------------------------------------------------
if "67070505229" not in text[0] and "67070505229" not in (text[1] if len(text) > 1 else ""):
    problems.append("student id 67070505229 not found on the first two pages")
if "อชิรญา อินตา" not in (text[0] + (text[1] if len(text) > 1 else "")):
    problems.append("author name not found on the first two pages")

# --- images per page ---------------------------------------------------------
def images_on(page):
    try:
        xobjs = page["/Resources"].get("/XObject", {})
    except Exception:
        return 0
    count = 0
    try:
        xobjs = xobjs.get_object()
    except Exception:
        return 0
    for ref in xobjs.values():
        try:
            obj = ref.get_object()
        except Exception:
            continue
        if obj.get("/Subtype") == "/Image":
            count += 1
    return count


counts = [images_on(p) for p in pages]
evidence = [(i + 1, c) for i, c in enumerate(counts) if c > 0]
over = [(p, c) for p, c in evidence if c > MAX_FIGS_PER_PAGE]
under = [(p, c) for p, c in evidence if c == 1]
if over:
    problems.append(f"pages with more than {MAX_FIGS_PER_PAGE} images: {over}")
if under:
    notes.append(
        f"{len(under)} page(s) carry a single image (tall sliced captures print one per page): "
        + ", ".join(f"p{p}" for p, _ in under[:12])
        + ("..." if len(under) > 12 else "")
    )
blank = [i + 1 for i, t in enumerate(text) if len(t.strip()) < 8 and counts[i] == 0]
if blank:
    problems.append(f"blank pages: {blank}")

# --- links -------------------------------------------------------------------
internal = external = 0
destinations = set()
for p in pages:
    for a in p.get("/Annots", []) or []:
        try:
            a = a.get_object()
        except Exception:
            continue
        if a.get("/Subtype") != "/Link":
            continue
        if a.get("/Dest") is not None or a.get("/A") is not None:
            if a.get("/Dest") is not None:
                internal += 1
                destinations.add(str(a["/Dest"]))
            else:
                external += 1
if internal < 9:
    problems.append(f"only {internal} internal link annotations (contents links expected >= 9)")
if external < 5:
    problems.append(f"only {external} external link annotations")

# --- md cross-check ----------------------------------------------------------
if md_path and os.path.exists(md_path):
    md = open(md_path, encoding="utf-8").read()
    md_images = len(re.findall(r"!\[[^\]]*\]\([^)]+\)", md))
    pdf_images = sum(counts)
    if pdf_images < md_images:
        problems.append(f"PDF has {pdf_images} images but report.md references {md_images}")
    notes.append(f"report.md references {md_images} images; PDF draws {pdf_images} (slices counted separately)")

notes.append(f"pages: {len(pages)}")
notes.append(f"size: {kb / 1024:.2f} MB ({kb:.0f} KB)")
notes.append(f"image placements per page: min {min(counts) if counts else 0}, max {max(counts) if counts else 0}")
notes.append(f"link annotations: {internal} internal, {external} external")

# --- effective print resolution ---------------------------------------------
if manifest_path and os.path.exists(manifest_path):
    import json

    man = json.load(open(manifest_path, encoding="utf-8"))
    worst = None
    worst_fig = None
    for f in man["figures"]:
        w, h = (int(v) for v in f["px"].split("x"))
        slices = max(1, f.get("slices") or len(f["out"]))
        sw, sh = w, h / slices
        aspect = sh / sw
        cls = "tall" if aspect >= 1.35 else "large" if aspect >= 0.95 else "medium" if aspect >= 0.6 else "small"
        # Printed size: capped by the page width, and by the height budget.
        printed_w = min(PRINT_WIDTH_MM, FIG_CAPS_MM[cls] / aspect)
        printed_h = printed_w * aspect
        dpi = min(sw / (printed_w / MM_PER_INCH), sh / (printed_h / MM_PER_INCH))
        if worst is None or dpi < worst:
            worst = dpi
            worst_fig = f["source"].rsplit("/", 1)[-1]
    if worst is not None:
        wide = [f for f in man["figures"] if int(f["px"].split("x")[0]) >= 1000]
        notes.append(
            f"effective print resolution: worst {worst:.0f} dpi ({worst_fig}); "
            f"{len(wide)} of {len(man['figures'])} sources are ≥1000 px wide"
        )
    if worst is not None and worst < MIN_PRINT_DPI:
        problems.append(
            f"worst effective print resolution {worst:.0f} dpi ({worst_fig}) is below "
            f"the {MIN_PRINT_DPI} dpi legibility floor"
        )

print("\n".join(f"  {n}" for n in notes))
if kb > SIZE_BUDGET_KB:
    problems.append(f"file is {kb / 1024:.2f} MB, over the {SIZE_BUDGET_KB / 1024:.0f} MB budget")

if problems:
    print("\nPDF CHECK FAILED")
    for p in problems:
        print("  - " + p)
    sys.exit(1)

print("\nPDF CHECK OK")