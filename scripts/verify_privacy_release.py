"""Cross-check a privacy RC across the static site and backend worktrees."""

from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
from pathlib import Path


VERSION = "draft-2026-11-08-v3"
LEAD_ENDPOINT = "https://api.alpool.ru/api/leads"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def one_match(pattern: str, text: str, label: str) -> str:
    matches = re.findall(pattern, text)
    require(len(matches) == 1, f"expected one {label}, found {len(matches)}")
    return matches[0]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-root", required=True, type=Path)
    args = parser.parse_args()

    site_root = Path(__file__).resolve().parents[1]
    backend_root = args.backend_root.resolve()
    consent_page = (site_root / "consent.html").read_text(encoding="utf-8")
    consent_archive_path = (
        site_root / "consent-versions" / f"{VERSION}.html"
    )
    consent_archive = consent_archive_path.read_text(encoding="utf-8")
    main_js = (site_root / "assets/js/main.js").read_text(encoding="utf-8")
    home = (site_root / "index.html").read_text(encoding="utf-8")
    technical_task = (site_root / "tehnicheskoe-zadanie/index.html").read_text(
        encoding="utf-8"
    )
    backend_privacy = (backend_root / "app/core/privacy.py").read_text(
        encoding="utf-8"
    )

    frontend_versions = [
        one_match(
            r"var consentTextVersion = '([^']+)';",
            main_js,
            "shared frontend consent version",
        ),
        one_match(
            r'name="consent_text_version" value="([^"]+)"',
            home,
            "homepage consent version",
        ),
        one_match(
            r'id="technical-task-consent-version" value="([^"]+)"',
            technical_task,
            "technical-task consent version",
        ),
        one_match(r"Проект версии ([^<]+)", consent_page, "document version"),
        one_match(r"<code>(draft-[^<]+)</code>", consent_page, "form version text"),
    ]
    backend_version = one_match(
        r'CONSENT_TEXT_VERSION = "([^"]+)"',
        backend_privacy,
        "backend consent version",
    )
    require(all(version == VERSION for version in frontend_versions), "frontend version mismatch")
    require(backend_version == VERSION, "backend version mismatch")
    require(consent_archive == consent_page, "archived consent copy differs from consent.html")

    manifest_path = consent_archive_path.with_suffix(".html.sha256")
    manifest_hash = manifest_path.read_text(encoding="ascii").split()[0].lower()
    actual_hash = hashlib.sha256(consent_archive_path.read_bytes()).hexdigest()
    require(manifest_hash == actual_hash, "consent archive SHA-256 mismatch")

    tracked_html = subprocess.check_output(
        ["git", "ls-files", "--", "*.html"], cwd=site_root, text=True
    ).splitlines()
    lead_pages = 0
    metrika_pages = 0
    for relative_path in tracked_html:
        page = (site_root / relative_path).read_text(encoding="utf-8")
        if LEAD_ENDPOINT in page and relative_path != "tehnicheskoe-zadanie/index.html":
            lead_pages += 1
            require("main.js" in page, f"lead form page lacks shared handler: {relative_path}")
        if "111538149" in page and "ym(" in page:
            metrika_pages += 1
            require(
                re.search(r"webvisor\s*:\s*false", page) is not None,
                f"Webvisor is not disabled: {relative_path}",
            )
            require(
                re.search(r"clickmap\s*:\s*true", page) is not None,
                f"main Metrika clickmap config changed unexpectedly: {relative_path}",
            )
            require(
                re.search(r"webvisor\s*:\s*true", page) is None,
                f"Webvisor remains enabled: {relative_path}",
            )

    require(lead_pages > 0, "no API lead-form pages found")
    require(metrika_pages > 0, "no Metrika pages found")
    require("checkbox.required = true" in main_js, "shared checkbox is not required")
    require("if (!consentCheckbox.checked)" in main_js, "shared submit guard is missing")
    require("/consent.html" in main_js and "/privacy.html" in main_js, "shared document links missing")
    require(
        'id="technical-task-personal-data-consent" required' in technical_task,
        "technical-task consent checkbox must be required",
    )
    require(
        "if(!consent || !consent.checked)" in technical_task,
        "technical-task submit guard is missing",
    )
    require(
        'href="/consent.html"' in technical_task and 'href="/privacy.html"' in technical_task,
        "technical-task document links missing",
    )
    require(
        'name="personal_data_consent" value="true" required' in home,
        "homepage consent checkbox must be required",
    )
    require(
        "CONSENT_TEXT_VERSION" in (backend_root / "app/models/lead.py").read_text(
            encoding="utf-8"
        ),
        "backend request validator does not use the shared consent constant",
    )

    print(f"PASS: consent version synchronized: {VERSION}")
    print(f"PASS: archived consent and SHA-256 verified: {consent_archive_path.relative_to(site_root)}")
    print(f"PASS: linked lead-form pages with shared JS: {lead_pages}")
    print(f"PASS: Metrika pages keep counter/clickmap and disable Webvisor: {metrika_pages}")
    print("PASS: homepage and technical-task checkbox guards and document links")


if __name__ == "__main__":
    main()
