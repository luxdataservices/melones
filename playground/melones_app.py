#!/usr/bin/env python3
"""Melones Italo as a desktop app window.

Usage:
    pip install pywebview          (once; optional)
    python3 melones_app.py

With pywebview installed, the playground opens in its own window (WebKit on macOS, Edge WebView2 on Windows,
GTK/Qt WebKit on Linux). Without it, it opens in your default browser instead. Everything runs locally:
the synth engine is inside the HTML file. Only the fonts come from the web, and the page works without them.
"""
import pathlib
import sys
import webbrowser

PAGE = pathlib.Path(__file__).resolve().parent / "Melones Italo.html"


def main() -> int:
    if not PAGE.exists():
        print(f"Can't find {PAGE.name} next to this script.", file=sys.stderr)
        return 1
    try:
        import webview  # pywebview
    except ImportError:
        print("pywebview isn't installed, so opening your browser instead (pip install pywebview for a window).")
        webbrowser.open(PAGE.as_uri())
        return 0
    webview.create_window("Melones Italo", PAGE.as_uri(), width=1280, height=900, min_size=(400, 600))
    webview.start()
    return 0


if __name__ == "__main__":
    sys.exit(main())
