"""Serve the exported GitHub Pages layout for local smoke checks only."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).resolve().parents[1] / '.next-pages'), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if not path.startswith('/sololevelup/'):
            self.send_error(404)
            return
        self.path = self.path[len('/sololevelup'):]
        super().do_GET()

ThreadingHTTPServer(('127.0.0.1', 3002), Handler).serve_forever()
