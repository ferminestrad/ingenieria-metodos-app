"""Ejecuta la aplicación ASGI sin abrir puertos ni instalar un cliente HTTP."""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from main import app


async def request(path, data=None):
    body = b'' if data is None else json.dumps(data).encode()
    sent = []
    consumed = False

    async def receive():
        nonlocal consumed
        if not consumed:
            consumed = True
            return {'type': 'http.request', 'body': body, 'more_body': False}
        return {'type': 'http.disconnect'}

    async def send(message):
        sent.append(message)

    await app({
        'type': 'http', 'asgi': {'version': '3.0', 'spec_version': '2.4'},
        'http_version': '1.1', 'method': 'GET' if data is None else 'POST',
        'scheme': 'http', 'path': path, 'raw_path': path.encode(),
        'query_string': b'', 'root_path': '',
        'headers': [(b'content-type', b'application/json')],
        'server': ('testserver', 80), 'client': ('127.0.0.1', 1234),
    }, receive, send)
    status = next(m['status'] for m in sent if m['type'] == 'http.response.start')
    raw = b''.join(m.get('body', b'') for m in sent if m['type'] == 'http.response.body')
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        result = raw.decode()
    return status, result


if __name__ == '__main__':
    incoming = json.load(sys.stdin)
    status, body = asyncio.run(request(incoming['path'], incoming.get('data')))
    print(json.dumps({'status': status, 'body': body}, ensure_ascii=False))
