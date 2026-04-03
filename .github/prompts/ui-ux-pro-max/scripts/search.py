#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Search - BM25 search engine for UI/UX style guides
Usage: python search.py "<query>" [--domain <domain>] [--stack <stack>] [--max-results 3]
       python search.py "<query>" --design-system [-p "Project Name"]
       python search.py "<query>" --design-system --persist [-p "Project Name"] [--page "dashboard"]

Domains: style, prompt, color, chart, landing, product, ux, typography
Stacks: html-tailwind, react, nextjs

Persistence (Master + Overrides pattern):
  --persist    Save design system to docs/design-system/MASTER.md
  --page       Also create a page-specific override file in docs/design-system/pages/
"""

import argparse
import sys
import io
import re
from pathlib import Path
from core import CSV_CONFIG, AVAILABLE_STACKS, MAX_RESULTS, search, search_stack
from design_system import generate_design_system, persist_design_system

# Force UTF-8 for stdout/stderr to handle emojis on Windows (cp1252 default)
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def sanitize_path_component(value, field_name):
    """Sanitize path-like CLI component to prevent path traversal."""
    if value is None:
        return None

    sanitized = value.strip()
    if not sanitized:
        return None

    if "\x00" in sanitized:
        raise ValueError(f"Invalid {field_name}: null byte is not allowed")
    if "/" in sanitized or "\\" in sanitized:
        raise ValueError(f"Invalid {field_name}: path separators are not allowed")
    if ".." in sanitized:
        raise ValueError(f"Invalid {field_name}: path traversal is not allowed")

    return sanitized


def sanitize_output_dir(value):
    """Allow only safe output paths constrained to current working directory.
    
    Returns an absolute resolved Path object (already validated), never a raw user string.
    Callers must use the returned Path directly — never use the raw CLI argument after this point.
    """
    base_dir = Path.cwd().resolve()

    if value is None:
        return base_dir

    # Accept already-sanitized Path values (e.g. argparse type output) and re-validate confinement.
    if isinstance(value, Path):
        resolved_output_dir = value.resolve()
        try:
            resolved_output_dir.relative_to(base_dir)
        except ValueError:
            raise ValueError("Invalid output_dir: path traversal is not allowed")
        return resolved_output_dir

    raw_value = str(value).strip()
    if not raw_value or raw_value == ".":
        return base_dir

    if "\x00" in raw_value:
        raise ValueError("Invalid output_dir: null byte is not allowed")

    normalized_input = raw_value.replace("\\", "/")
    if normalized_input.startswith("~"):
        raise ValueError("Invalid output_dir: home expansion is not allowed")

    # Explicit absolute-path checks (POSIX + Windows + UNC)
    if normalized_input.startswith("/") or normalized_input.startswith("//") or bool(re.match(r"^[A-Za-z]:", normalized_input)):
        raise ValueError("Invalid output_dir: absolute paths are not allowed")

    if not re.fullmatch(r"[A-Za-z0-9._/-]+", normalized_input):
        raise ValueError("Invalid output_dir: only letters, numbers, slash, dot, underscore and hyphen are allowed")

    segments = [part for part in normalized_input.split("/") if part not in ("", ".")]
    if any(part == ".." for part in segments):
        raise ValueError("Invalid output_dir: path traversal is not allowed")

    if not segments:
        return base_dir

    # Build the path exclusively from the validated segments list — never from the raw user string.
    # This breaks the taint chain from the CLI argument to the open() call.
    safe_relative = Path(*segments)
    resolved_output_dir = (base_dir / safe_relative).resolve()

    try:
        resolved_output_dir.relative_to(base_dir)
    except ValueError:
        raise ValueError("Invalid output_dir: path traversal is not allowed")

    # Final guard: re-verify no segment in the resolved path escapes the base directory.
    if not str(resolved_output_dir).startswith(str(base_dir)):
        raise ValueError("Invalid output_dir: path traversal is not allowed")

    return resolved_output_dir


def sanitize_slug(value, field_name):
    """Convert a display name into a safe slug for use in file paths.
    
    Allows only alphanumeric characters, hyphens and underscores.
    Raises ValueError if the resulting slug is empty.
    """
    import re
    if not value:
        return "default"

    slug = value.lower().strip()
    # Replace spaces and common separators with hyphen
    slug = slug.replace(" ", "-")
    # Remove any character that is not alphanumeric, hyphen or underscore
    slug = re.sub(r"[^a-z0-9\-_]", "", slug)
    # Collapse consecutive hyphens
    slug = re.sub(r"-{2,}", "-", slug)
    slug = slug.strip("-_")

    if not slug:
        raise ValueError(f"Invalid {field_name}: results in an empty slug after sanitization")

    return slug


def parse_project_slug_arg(value):
    """Argparse type wrapper for --project-name."""
    try:
        return sanitize_slug(value, "project_name")
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error))


def parse_page_slug_arg(value):
    """Argparse type wrapper for --page."""
    try:
        return sanitize_slug(value, "page")
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error))


def parse_output_dir_arg(value):
    """Argparse type wrapper for --output-dir."""
    try:
        return sanitize_output_dir(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error))


def enforce_runtime_sanitization(project_name, page, output_dir):
    """Revalida entradas do CLI antes de qualquer operação de persistência em disco."""
    safe_project_name = sanitize_slug(project_name, "project_name") if project_name else None
    safe_page = sanitize_slug(page, "page") if page else None
    safe_output_dir = sanitize_output_dir(output_dir)

    return safe_project_name, safe_page, safe_output_dir


def format_output(result):
    """Format results for Claude consumption (token-optimized)"""
    if "error" in result:
        return f"Error: {result['error']}"

    output = []
    if result.get("stack"):
        output.append(f"## UI Pro Max Stack Guidelines")
        output.append(f"**Stack:** {result['stack']} | **Query:** {result['query']}")
    else:
        output.append(f"## UI Pro Max Search Results")
        output.append(f"**Domain:** {result['domain']} | **Query:** {result['query']}")
    output.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")

    for i, row in enumerate(result['results'], 1):
        output.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if len(value_str) > 300:
                value_str = value_str[:300] + "..."
            output.append(f"- **{key}:** {value_str}")
        output.append("")

    return "\n".join(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="UI Pro Max Search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Search domain")
    parser.add_argument("--stack", "-s", choices=AVAILABLE_STACKS, help="Stack-specific search (html-tailwind, react, nextjs)")
    parser.add_argument("--max-results", "-n", type=int, default=MAX_RESULTS, help="Max results (default: 3)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    # Design system generation
    parser.add_argument("--design-system", "-ds", action="store_true", help="Generate complete design system recommendation")
    parser.add_argument("--project-name", "-p", type=parse_project_slug_arg, default=None, help="Project name for design system output")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii", help="Output format for design system")
    # Persistence (Master + Overrides pattern)
    parser.add_argument("--persist", action="store_true", help="Save design system to docs/design-system/MASTER.md (creates hierarchical structure)")
    parser.add_argument("--page", type=parse_page_slug_arg, default=None, help="Create page-specific override file in docs/design-system/pages/")
    parser.add_argument("--output-dir", "-o", type=parse_output_dir_arg, default=None, help="Output directory for persisted files (default: current directory)")

    args = parser.parse_args()

    safe_project_name, safe_page, safe_output_dir = enforce_runtime_sanitization(
        args.project_name,
        args.page,
        args.output_dir
    )

    # Design system takes priority
    if args.design_system:
        result = generate_design_system(
            args.query,
            safe_project_name,
            args.format,
            persist=args.persist,
            page=safe_page,
            output_dir=safe_output_dir
        )
        print(result)
        
        # Print persistence confirmation
        if args.persist:
            project_slug = safe_project_name or "default"
            print("\n" + "=" * 60)
            print(f"✅ Design system persisted to docs/design-system/{project_slug}/")
            print(f"   📄 docs/design-system/{project_slug}/MASTER.md (Global Source of Truth)")
            if safe_page:
                page_filename = safe_page
                print(f"   📄 docs/design-system/{project_slug}/pages/{page_filename}.md (Page Overrides)")
            print("")
            print(f"📖 Usage: When building a page, check docs/design-system/{project_slug}/pages/[page].md first.")
            print(f"   If exists, its rules override MASTER.md. Otherwise, use MASTER.md.")
            print("=" * 60)
    # Stack search
    elif args.stack:
        result = search_stack(args.query, args.stack, args.max_results)
        if args.json:
            import json
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result))
    # Domain search
    else:
        result = search(args.query, args.domain, args.max_results)
        if args.json:
            import json
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            print(format_output(result))
