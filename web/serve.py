"""Serve this folder only, with no-store on HTML/JS so ?v= matches disk."""
from __future__ import print_function

import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 8765


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html") or path.endswith(".html") or path.startswith("/js/"):
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
        super(Handler, self).end_headers()


def build_label():
    try:
        html = open(os.path.join(HERE, "index.html"), "r", encoding="utf-8").read()
        m = re.search(r"game\.js\?v=(\d+)", html)
        return m.group(1) if m else "?"
    except Exception:
        return "?"


if __name__ == "__main__":
    os.chdir(HERE)
    ver = build_label()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("Twisted Speed  BUILD %s" % ver)
    print("Folder: %s" % HERE)
    print("Open:   http://127.0.0.1:%s/?v=%s" % (PORT, ver))
    print("Title screen must say BUILD %s. Ctrl+C to stop." % ver)
    httpd.serve_forever()
