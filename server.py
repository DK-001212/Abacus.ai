import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
INDEX_PATH = ROOT / 'index.html'
API_ROUTE = '/api/chat'


def send_json(handler, status, payload):
    body = json.dumps(payload).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_static_file(path: str):
    candidate = ROOT / path.lstrip('/')
    if candidate.exists() and candidate.is_file():
        return candidate.read_bytes(), candidate.suffix.lstrip('.') or 'html'
    return None, None


def fallback_response(prompt: str, task: str):
    templates = {
        'summarize': 'Summary: This workflow reviews the key ideas, groups themes, and surfaces the most useful takeaways with an actionable summary for decision-makers.',
        'explain': 'Explanation: The concept is best framed as a workflow that converts an input into structured steps, tools, and outputs while keeping human oversight in the loop.',
        'ideas': 'Ideas: 1) automate a recurring reporting workflow, 2) create a research brief, 3) turn customer support notes into action lists.',
        'analyze': 'Analysis: Emerging patterns show speed, volume, and repetition as the highest-ROI opportunities for automation and optimization.',
        'code': 'Code example: const summarize = (items) => items.map(item => item.trim()).filter(Boolean).join(" | ");',
        'content': 'Content draft: A practical AI strategy should combine data, expert review, and human-centered workflow design for reliable outcomes.',
    }
    return templates.get(task, templates['summarize'])


def query_ai(prompt: str, task: str):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('Gemini API key is not configured. Add GEMINI_API_KEY.')

    import urllib.request

    payload = {
        'systemInstruction': {
            'parts': [{
                'text': f'You are a helpful AI assistant for an AI SaaS website. {task}. Keep responses concise, practical, and professional.'
            }]
        },
        'contents': [{
            'role': 'user',
            'parts': [{'text': prompt}]
        }]
    }
    request = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode('utf-8'))
    parts = data['candidates'][0]['content']['parts']
    return ''.join(part.get('text', '') for part in parts).strip()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/':
            file_path = INDEX_PATH
        elif parsed.path == '/api/chat':
            self.send_response(405)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Method not allowed. Use POST.'}).encode('utf-8'))
            return
        else:
            file_path = ROOT / parsed.path.lstrip('/')
            if not file_path.exists() or not file_path.is_file():
                target = ROOT / 'index.html'
                if target.exists():
                    file_path = target
                else:
                    self.send_response(404)
                    self.end_headers()
                    return

        try:
            content = file_path.read_bytes()
            mime = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.svg': 'image/svg+xml',
            }.get(file_path.suffix.lower(), 'application/octet-stream')
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_response(500)
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != API_ROUTE:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Endpoint not found.'}).encode('utf-8'))
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length)
            payload = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            send_json(self, 400, {'error': 'Request body must be valid JSON.'})
            return

        prompt = str(payload.get('prompt', '')).strip()
        task = str(payload.get('task', 'answer')).strip().lower()
        if not prompt:
            send_json(self, 400, {'error': 'A prompt is required.'})
            return

        try:
            answer = query_ai(prompt, task)
            send_json(self, 200, {'answer': answer, 'task': task, 'prompt': prompt})
        except Exception as exc:
            answer = fallback_response(prompt, task)
            send_json(self, 500, {
                'error': str(exc),
                'fallback': answer,
                'task': task,
                'prompt': prompt,
            })

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Serving AI site on http://127.0.0.1:{port}')
    server.serve_forever()
