"""静态站点服务：为所有响应添加 no-store，避免 CDN/浏览器缓存旧构建。"""

import functools
import http.server
import os
import sys

WEB_PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 1689
ROOT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """禁用缓存的静态文件处理器。"""

    def end_headers(self):
        """写入禁止缓存的响应头。"""
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=os.path.abspath(ROOT))
    http.server.ThreadingHTTPServer(('0.0.0.0', WEB_PORT), handler).serve_forever()
