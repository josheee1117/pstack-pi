#!/usr/bin/env python3
"""
lean-probe.py: Lightweight diff-scoped deterministic structural probe for pstack-lean & review/代码.
Flags structural readability hazards on methods added/modified in git diff (or explicit files):
  1. effective_lines > max_lines (default 30)
  2. max_nesting > max_nesting (default 3)
  3. outer_try_ratio >= max_outer_try (default 0.70, for methods with >= 12 effective lines)
  4. null_sentinel (returning a record/object with trailing null status/outcome or branching on outcome/status/result == null)
"""
import sys

sys.dont_write_bytecode = True

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

BRACE_PATTERNS = {
    ".java": re.compile(
        r"^[ \t]{2,8}(?:(?:public|private|protected|static|final|synchronized|default)\s+)*"
        r"(?:<[^>]+>\s+)?[\w<>\[\], ?]+\s+([a-z][A-Za-z0-9_]*)\s*\("
    ),
    ".ts": re.compile(
        r"^[ \t]{0,6}(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\("
    ),
    ".js": re.compile(
        r"^[ \t]{0,6}(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\("
    ),
}
PY_DEF_RE = re.compile(r"^([ \t]{0,8})(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(")
HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")
CONTROL_KEYWORDS = {"if", "for", "while", "switch", "catch", "else", "return", "throw", "new"}


def strip_comments_line(line: str, ext: str) -> str:
    s = line.strip()
    if not s:
        return ""
    if ext == ".py":
        return "" if s.startswith("#") else s
    if s.startswith("//") or s.startswith("/*") or s.startswith("*") or s.startswith("*/"):
        return ""
    return s


def has_null_sentinel(clean: str, ext: str) -> bool:
    if ext == ".py":
        return bool(
            re.search(r"\breturn\s+\w+\([^#\n]*,\s*None\s*\)", clean)
            or re.search(r"\b(?:outcome|status|result)\s+is\s+None\b", clean)
        )
    return bool(
        re.search(r"\breturn\s+new\s+\w+\([^;]*,\s*null\s*\)", clean)
        or re.search(r"\b(?:outcome|status|result)\s*==\s*null\b", clean)
    )


def parse_brace_methods(text: str, ext: str):
    lines = text.splitlines()
    pat = BRACE_PATTERNS[ext]
    methods = []
    i = 0
    n = len(lines)
    while i < n:
        m = pat.match(lines[i])
        if not m or m.group(1) in CONTROL_KEYWORDS:
            i += 1
            continue
        name = m.group(1)
        sig_start = i
        k = i
        brace_found = False
        while k < min(n, i + 6):
            if ";" in lines[k] and "{" not in lines[k]:
                break
            if "{" in lines[k]:
                brace_found = True
                break
            k += 1
        if not brace_found:
            i += 1
            continue

        depth = 0
        for idx in range(sig_start, k + 1):
            depth += lines[idx].count("{") - lines[idx].count("}")
        j = k + 1
        eff_lines = 0
        max_nest = 0
        outer_try_lines = 0
        in_outer_try = False
        outer_try_base = None
        sentinels = []

        while j < n and depth > 0:
            raw = lines[j]
            clean = strip_comments_line(raw, ext)
            inner_depth = max(0, depth - 1)
            if clean and clean not in ("}", "};"):
                eff_lines += 1
                if inner_depth > max_nest:
                    max_nest = inner_depth
                if re.match(r"^try\b", clean) and inner_depth <= 1 and not in_outer_try:
                    in_outer_try = True
                    outer_try_base = depth
                if in_outer_try:
                    outer_try_lines += 1
                if has_null_sentinel(clean, ext):
                    sentinels.append(f"L{j + 1}: {clean[:80]}")

            depth += raw.count("{") - raw.count("}")
            if in_outer_try and outer_try_base is not None and depth <= outer_try_base:
                in_outer_try = False
            j += 1

        methods.append({
            "name": name,
            "start_line": sig_start + 1,
            "end_line": j,
            "effective_lines": eff_lines,
            "max_nesting": max_nest,
            "outer_try_lines": outer_try_lines,
            "outer_try_ratio": round(outer_try_lines / eff_lines, 2) if eff_lines else 0.0,
            "sentinels": sentinels,
        })
        i = max(i + 1, j)
    return methods


def parse_py_methods(text: str):
    lines = text.splitlines()
    methods = []
    i = 0
    n = len(lines)
    while i < n:
        m = PY_DEF_RE.match(lines[i])
        if not m:
            i += 1
            continue
        base_indent = len(m.group(1).expandtabs(4))
        name = m.group(2)
        sig_start = i
        k = i
        while k < min(n, i + 6) and not lines[k].rstrip().endswith(":"):
            k += 1
        j = k + 1
        eff_lines = 0
        max_nest = 0
        outer_try_lines = 0
        outer_try_indent = None
        sentinels = []
        body_indent = base_indent + 4

        while j < n:
            raw = lines[j]
            clean = strip_comments_line(raw, ".py")
            if not clean:
                j += 1
                continue
            indent = len(raw[: len(raw) - len(raw.lstrip())].expandtabs(4))
            if indent <= base_indent:
                break
            eff_lines += 1
            nest = max(0, (indent - body_indent) // 4)
            if nest > max_nest:
                max_nest = nest
            if outer_try_indent is not None and indent <= outer_try_indent and not re.match(r"^(?:except|finally)\b", clean):
                outer_try_indent = None
            if re.match(r"^try\s*:", clean) and nest <= 1 and outer_try_indent is None:
                outer_try_indent = indent
            if outer_try_indent is not None and indent >= outer_try_indent:
                outer_try_lines += 1
            if has_null_sentinel(clean, ".py"):
                sentinels.append(f"L{j + 1}: {clean[:80]}")
            j += 1

        methods.append({
            "name": name,
            "start_line": sig_start + 1,
            "end_line": j,
            "effective_lines": eff_lines,
            "max_nesting": max_nest,
            "outer_try_lines": outer_try_lines,
            "outer_try_ratio": round(outer_try_lines / eff_lines, 2) if eff_lines else 0.0,
            "sentinels": sentinels,
        })
        i = max(i + 1, j)
    return methods


def analyze_file(path: Path, text: str, touched_ranges=None, max_lines=30, max_nesting=3, max_outer_try=0.70):
    ext = path.suffix
    if ext in BRACE_PATTERNS:
        methods = parse_brace_methods(text, ext)
    elif ext == ".py":
        methods = parse_py_methods(text)
    else:
        return []
    out = []
    for m in methods:
        if touched_ranges is not None:
            if not any(m["end_line"] >= lo and m["start_line"] <= hi for lo, hi in touched_ranges):
                continue
        flags = []
        if m["effective_lines"] > max_lines:
            flags.append(f"effective_lines={m['effective_lines']}>{max_lines}")
        if m["max_nesting"] > max_nesting:
            flags.append(f"max_nesting={m['max_nesting']}>{max_nesting}")
        if m["effective_lines"] >= 12 and m["outer_try_ratio"] >= max_outer_try:
            flags.append(f"outer_try={int(m['outer_try_ratio'] * 100)}%>=70%" if max_outer_try == 0.70 else f"outer_try={int(m['outer_try_ratio'] * 100)}%>={int(max_outer_try * 100)}%")
        if m["sentinels"]:
            flags.append(f"null_sentinel({len(m['sentinels'])})")
        m["flags"] = flags
        m["file"] = str(path)
        out.append(m)
    return out


def collect_diff_ranges(diff_target: str | None) -> dict[Path, list[tuple[int, int]]]:
    cmd = ["git", "diff", "-U0"]
    if diff_target:
        cmd.append(diff_target)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git diff exited {r.returncode}")
    touched: dict[Path, list[tuple[int, int]]] = {}
    cur_file: Path | None = None
    for line in r.stdout.splitlines():
        if line.startswith("+++ b/"):
            rel = line[6:].strip()
            p = Path(rel)
            if p.suffix in (".java", ".ts", ".js", ".py") and not re.search(r"(?:Test|Tests|\.test|\.spec)\.", p.name):
                cur_file = p
                touched.setdefault(cur_file, [])
            else:
                cur_file = None
        elif cur_file is not None and line.startswith("@@"):
            m = HUNK_RE.match(line)
            if m:
                start = int(m.group(1))
                count = int(m.group(2)) if m.group(2) is not None else 1
                if count > 0:
                    touched[cur_file].append((start, start + count - 1))
    return {p: rngs for p, rngs in touched.items() if rngs and p.is_file()}


def run_self_test() -> int:
    clean_java = """
public class SyncService {
    public SyncResult sync(SyncCommand cmd) {
        if (cmd.singleDoc()) {
            return syncSingleDoc(cmd.docId());
        }
        return scanAllCategories(cmd);
    }
    private SyncResult syncSingleDoc(String docId) {
        return SyncResult.ok(docId);
    }
}
"""
    flat_java = """
public class FlatSyncService {
    public WriteAttempt syncAll(List<Item> items) {
        try {
            int ok = 0;
            for (Item a : items) {
                if (a != null) {
                    for (String tag : a.tags()) {
                        if (!tag.isEmpty()) {
                            if (tag.startsWith("x")) {
                                ok++;
                            }
                        }
                    }
                }
            }
            int l01 = 1;
            int l02 = 2;
            int l03 = 3;
            int l04 = 4;
            int l05 = 5;
            int l06 = 6;
            int l07 = 7;
            int l08 = 8;
            int l09 = 9;
            int l10 = 10;
            int l11 = 11;
            int l12 = 12;
            int l13 = 13;
            int l14 = 14;
            int l15 = 15;
            int l16 = 16;
            int l17 = 17;
            int l18 = 18;
            int l19 = 19;
            int l20 = 20;
            int l21 = 21;
            int l22 = 22;
            int l23 = 23;
            int l24 = 24;
            return new WriteAttempt(ok, null);
        } catch (Exception e) {
            return new WriteAttempt(0, null);
        }
    }
}
"""
    with tempfile.TemporaryDirectory(prefix="lean-probe-test-") as td:
        p_clean = Path(td) / "SyncService.java"
        p_clean.write_text(clean_java, encoding="utf-8")
        res_clean = analyze_file(p_clean, clean_java)
        assert len(res_clean) == 2 and all(not m["flags"] for m in res_clean), res_clean

        p_flat = Path(td) / "FlatSyncService.java"
        p_flat.write_text(flat_java, encoding="utf-8")
        res_flat = analyze_file(p_flat, flat_java)
        assert len(res_flat) == 1, res_flat
        flags = " ".join(res_flat[0]["flags"])
        for expected in ("effective_lines=", "max_nesting=", "outer_try=", "null_sentinel("):
            assert expected in flags, (expected, flags)
    print("lean-probe self-test: ok")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Diff-scoped structural readability probe for pstack-lean")
    ap.add_argument("files", nargs="*")
    ap.add_argument("--diff", nargs="?", const="", default=None, help="Scan methods touched in git diff [optional rev/range]")
    ap.add_argument("--max-lines", type=int, default=30)
    ap.add_argument("--max-nesting", type=int, default=3)
    ap.add_argument("--max-outer-try", type=float, default=0.70)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        raise SystemExit(run_self_test())

    all_methods = []
    if args.diff is not None and not args.files:
        touched = collect_diff_ranges(args.diff or None)
        for p, ranges in sorted(touched.items()):
            all_methods.extend(
                analyze_file(p, p.read_text(encoding="utf-8", errors="replace"), ranges, args.max_lines, args.max_nesting, args.max_outer_try)
            )
    else:
        for f in args.files:
            p = Path(f)
            if p.is_file():
                all_methods.extend(
                    analyze_file(p, p.read_text(encoding="utf-8", errors="replace"), None, args.max_lines, args.max_nesting, args.max_outer_try)
                )

    flagged = [m for m in all_methods if m["flags"]]
    if args.json:
        print(json.dumps({"total_methods": len(all_methods), "flagged_count": len(flagged), "methods": all_methods}, ensure_ascii=False, indent=2))
        return
    print(f"lean-probe: scanned {len(all_methods)} methods, flagged {len(flagged)}")
    for m in all_methods:
        mark = "HOTSPOT " + ", ".join(m["flags"]) if m["flags"] else "OK"
        print(f"  {Path(m['file']).name}:{m['start_line']}-{m['end_line']} {m['name']}() | eff={m['effective_lines']} nest={m['max_nesting']} try={int(m['outer_try_ratio'] * 100)}% | {mark}")


if __name__ == "__main__":
    main()
