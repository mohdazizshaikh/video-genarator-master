"""Persistent Chatterbox TTS HTTP server.

Loads the Chatterbox Multilingual V3 model once, prepares the voice-cloning
conditionals from a reference clip once, then serves synthesis requests over
HTTP so Node can reuse the warm model across many scenes.

Protocol:
  GET  /health -> {"status":"ok"}
  POST /synthesize  body: {"text": "...", "language_id": "hi"|"en"}
       -> 200 audio/wav (raw WAV bytes, 24kHz mono f32)
          X-Duration-Us header with duration in microseconds
       -> 500 {"error": "..."} on failure
  POST /shutdown -> exits the process

The server binds to an ephemeral port (port 0) and prints "PORT=<n>" on a
single stdout line once the model is ready. All diagnostics go to stderr so
stdout stays parseable by the Node parent process.
"""
import argparse
import json
import logging
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

import torch
import torchaudio as ta

logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="%(asctime)s %(message)s")
log = logging.getLogger("chatterbox_server")

_generate_lock = Lock()
_model = None
_ref_exaggeration = 0.5
_sample_rate = 24000


def _patch_torch_load(device):
    torch_load_original = torch.load
    def patched(*args, **kwargs):
        if "map_location" not in kwargs:
            kwargs["map_location"] = torch.device(device)
        return torch_load_original(*args, **kwargs)
    torch.load = patched


def load_model(device, reference_path, t3_model):
    global _model
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    _patch_torch_load(device)
    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model=t3_model)
    log.info("model loaded in %.1fs", time.time() - t0)

    if reference_path:
        t0 = time.time()
        model.prepare_conditionals(reference_path, exaggeration=_ref_exaggeration)
        log.info("conditionals prepared in %.1fs", time.time() - t0)

    _model = model


def synthesize(text, language_id):
    global _model
    if _model is None:
        raise RuntimeError("model not loaded")
    with _generate_lock:
        wav = _model.generate(text, language_id=language_id)
        return wav


def _wav_bytes(wav, sr):
    import io
    buffer = io.BytesIO()
    ta.save(buffer, wav, sr, format="wav")
    return buffer.getvalue()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        log.info("%s %s", self.address_string(), fmt % args)

    def _send(self, code, body, content_type="application/json", extra_headers=None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, json.dumps({"status": "ok"}).encode("utf-8"))
        elif self.path == "/shutdown":
            self._shutdown_soon()
        else:
            self._send(404, json.dumps({"error": "not found"}).encode("utf-8"))

    def _shutdown_soon(self):
        import threading
        self._send(200, json.dumps({"status": "bye"}).encode("utf-8"))
        timer = threading.Timer(0.1, lambda: os._exit(0))
        timer.daemon = True
        timer.start()

    def do_POST(self):
        if self.path == "/synthesize":
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            text = payload.get("text", "")
            language_id = payload.get("language_id", "en")
            if not text:
                self._send(400, json.dumps({"error": "empty text"}).encode("utf-8"))
                return
            t0 = time.time()
            try:
                wav = synthesize(text, language_id)
            except Exception as exc:  # noqa: BLE001
                log.exception("synthesis failed")
                self._send(500, json.dumps({"error": str(exc)}).encode("utf-8"))
                return
            body = _wav_bytes(wav, _sample_rate)
            duration_us = int(wav.shape[1] / _sample_rate * 1_000_000)
            log.info("synthesized %.1fs audio in %.1fs", wav.shape[1] / _sample_rate, time.time() - t0)
            self._send(
                200,
                body,
                content_type="audio/wav",
                extra_headers={"X-Duration-Us": str(duration_us)},
            )
        elif self.path == "/shutdown":
            self._shutdown_soon()
        else:
            self._send(404, json.dumps({"error": "not found"}).encode("utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--reference", default="")
    parser.add_argument("--t3-model", default="v3")
    args = parser.parse_args()

    load_model(args.device, args.reference or None, args.t3_model)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    print(f"PORT={server.server_address[1]}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
