"""MAJEL wakeword listener — detects 'hey majel' and triggers voice pipeline."""

from __future__ import annotations

import os
import sys
import time
import wave
from pathlib import Path
from typing import TYPE_CHECKING

import httpx
import numpy as np
from openwakeword.model import Model

if TYPE_CHECKING:
    import alsaaudio

# ── Settings ──
WAKEWORD_MODEL = Path("/app/models/hey_majel.onnx")
THRESHOLD = 0.5
SAMPLE_RATE = 16000
FRAME_SIZE = 1280  # 80ms at 16kHz
RECORD_SILENCE_TIMEOUT = 2.0  # seconds of silence to stop recording
RECORD_MAX_DURATION = 10.0  # max recording duration in seconds
VAD_ENERGY_THRESHOLD = 500  # RMS threshold for voice activity
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
WAV_OUTPUT = Path("/tmp/majel/wakeword_input.wav")
AUDIO_DEVICE = os.environ.get("ALSA_CAPTURE_DEVICE", "plughw:3,0")


def open_mic_stream() -> alsaaudio.PCM:
    """Open ALSA mic stream for continuous monitoring."""
    import alsaaudio

    inp = alsaaudio.PCM(
        alsaaudio.PCM_CAPTURE,
        alsaaudio.PCM_NORMAL,
        device=AUDIO_DEVICE,
    )
    inp.setchannels(1)
    inp.setrate(SAMPLE_RATE)
    inp.setformat(alsaaudio.PCM_FORMAT_S16_LE)
    inp.setperiodsize(FRAME_SIZE)
    return inp


def rms(data: bytes) -> float:
    """Calculate RMS energy of audio frame."""
    if len(data) < 2:
        return 0.0
    samples = np.frombuffer(data, dtype=np.int16)
    return float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))


def record_utterance(mic: alsaaudio.PCM) -> Path:
    """Record audio until silence is detected (VAD-based endpoint)."""
    print("[wakeword] Recording utterance...")
    frames = []
    silence_start = None
    start_time = time.monotonic()

    while True:
        elapsed = time.monotonic() - start_time
        if elapsed > RECORD_MAX_DURATION:
            print(f"[wakeword] Max duration reached ({RECORD_MAX_DURATION}s)")
            break

        length, data = mic.read()
        if length <= 0:
            continue

        frames.append(data)
        energy = rms(data)

        if energy < VAD_ENERGY_THRESHOLD:
            if silence_start is None:
                silence_start = time.monotonic()
            elif time.monotonic() - silence_start > RECORD_SILENCE_TIMEOUT:
                print(f"[wakeword] Silence detected, stopping ({elapsed:.1f}s)")
                break
        else:
            silence_start = None

    # Write WAV
    WAV_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(WAV_OUTPUT), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(frames))

    print(f"[wakeword] Saved {WAV_OUTPUT} ({len(frames)} frames)")
    return WAV_OUTPUT


def trigger_voice_pipeline(wav_path: Path) -> None:
    """Send recorded WAV to app's voice endpoint."""
    try:
        print(f"[wakeword] Triggering voice pipeline: {wav_path}")
        resp = httpx.post(
            f"{APP_URL}/api/voice",
            json={"wav_path": str(wav_path)},
            timeout=30,
        )
        if resp.is_success:
            data = resp.json()
            print(f"[wakeword] Response: {data.get('response', '')[:80]}")
        else:
            print(f"[wakeword] Voice API error: {resp.status_code}", file=sys.stderr)
    except httpx.HTTPError as e:
        print(f"[wakeword] Connection error: {e}", file=sys.stderr)


def main() -> None:
    if not WAKEWORD_MODEL.exists():
        print(f"[wakeword] Model not found: {WAKEWORD_MODEL}", file=sys.stderr)
        print("[wakeword] Running in stub mode (no wakeword detection)")
        while True:
            time.sleep(60)

    print(f"[wakeword] Loading model: {WAKEWORD_MODEL}")
    model = Model(wakeword_models=[str(WAKEWORD_MODEL)], inference_framework="onnxruntime")
    model_name = list(model.models.keys())[0]
    print(f"[wakeword] Model loaded: {model_name}")

    try:
        mic = open_mic_stream()
    except Exception as e:
        print(f"[wakeword] Mic not available: {e}", file=sys.stderr)
        print("[wakeword] Running in stub mode (no microphone)")
        while True:
            time.sleep(60)

    print(f"[wakeword] Listening on {AUDIO_DEVICE} (threshold={THRESHOLD})...")

    while True:
        try:
            length, data = mic.read()
            if length <= 0:
                continue

            # Feed audio to wakeword model
            audio_array = np.frombuffer(data, dtype=np.int16)
            prediction = model.predict(audio_array)

            score = prediction[model_name]
            if score > THRESHOLD:
                print(f"[wakeword] Detected! (score={score:.3f})")

                # Reset model to avoid re-triggering
                model.reset()

                # Record the utterance
                wav_path = record_utterance(mic)

                # Trigger voice pipeline
                trigger_voice_pipeline(wav_path)

                print("[wakeword] Resuming listening...")

        except KeyboardInterrupt:
            print("[wakeword] Shutting down")
            break
        except Exception as e:
            print(f"[wakeword] Error: {e}", file=sys.stderr)
            time.sleep(1)


if __name__ == "__main__":
    main()
