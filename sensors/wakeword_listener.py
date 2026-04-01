"""MAJEL wakeword listener — detects wakeword and triggers voice pipeline."""

from __future__ import annotations

import base64
import os
import subprocess
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
WAKEWORD_MODEL = "hey_jarvis_v0.1"
THRESHOLD = 0.5
SAMPLE_RATE = 16000
FRAME_SIZE = 1280  # 80ms at 16kHz
RECORD_SILENCE_TIMEOUT = 2.0  # seconds of silence to stop recording
RECORD_MAX_DURATION = 10.0  # max recording duration in seconds
VAD_ENERGY_THRESHOLD = 500  # RMS threshold for voice activity
PLAYBACK_COOLDOWN = 1.0  # seconds to discard mic input after TTS playback
FOLLOWUP_TIMEOUT = 5.0  # seconds to wait for follow-up speech after response
FOLLOWUP_MAX_TURNS = 5  # max follow-up turns before requiring wakeword again
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
WAV_OUTPUT = Path("/tmp/majel/wakeword_input.wav")
AUDIO_DEVICE = os.environ.get("ALSA_CAPTURE_DEVICE", "plughw:Device_1,0")


def open_mic_stream() -> alsaaudio.PCM:
    """Open ALSA mic stream for continuous monitoring."""
    import alsaaudio

    inp = alsaaudio.PCM(
        alsaaudio.PCM_CAPTURE,
        alsaaudio.PCM_NORMAL,
        device=AUDIO_DEVICE,
        channels=1,
        rate=SAMPLE_RATE,
        format=alsaaudio.PCM_FORMAT_S16_LE,
        periodsize=FRAME_SIZE,
    )
    return inp


def rms(data: bytes) -> float:
    """Calculate RMS energy of audio frame."""
    if len(data) < 2:
        return 0.0
    samples = np.frombuffer(data, dtype=np.int16)
    return float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))


def record_utterance(mic: alsaaudio.PCM, initial_frame: bytes | None = None) -> Path:
    """Record audio until silence is detected (VAD-based endpoint).

    If initial_frame is provided, it is prepended to the recording so that
    the first voiced frame (detected by the caller) is not lost.
    """
    print("[wakeword] Recording utterance...")
    frames: list[bytes] = []
    if initial_frame is not None:
        frames.append(initial_frame)
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


PLAYBACK_DEVICE = os.environ.get("ALSA_PLAYBACK_DEVICE", "softvol")
RESPONSE_WAV = Path("/tmp/majel/response.wav")


def play_wav(wav_path: Path) -> None:
    """Play WAV file through ALSA speaker."""
    try:
        subprocess.run(
            ["aplay", "-D", PLAYBACK_DEVICE, str(wav_path)],
            check=True,
            capture_output=True,
        )
        print("[wakeword] Played response audio")
    except subprocess.CalledProcessError as e:
        print(f"[wakeword] aplay error: {e.stderr.decode()}", file=sys.stderr)
    except FileNotFoundError:
        print("[wakeword] aplay not found, skipping playback", file=sys.stderr)


def drain_mic_buffer(mic: alsaaudio.PCM, model: Model, duration: float = 0) -> None:
    """Discard buffered audio and reset wakeword model.

    If duration > 0, keep draining for that many seconds to let speaker
    echo / reverb die out before resuming detection.
    """
    model.reset()
    deadline = time.monotonic() + duration
    while True:
        mic.read()
        if time.monotonic() >= deadline:
            break


def wait_for_followup(mic: alsaaudio.PCM) -> bytes | None:
    """Wait up to FOLLOWUP_TIMEOUT seconds for follow-up speech.

    Returns the first voiced audio frame if speech is detected within the
    timeout window, or None if no speech is detected.  The caller should
    pass the returned frame to record_utterance() so that the beginning of
    the utterance is not lost.
    """
    print(f"[wakeword] Waiting {FOLLOWUP_TIMEOUT}s for follow-up...")
    deadline = time.monotonic() + FOLLOWUP_TIMEOUT

    while time.monotonic() < deadline:
        length, data = mic.read()
        if length <= 0:
            continue
        if rms(data) >= VAD_ENERGY_THRESHOLD:
            print("[wakeword] Follow-up speech detected!")
            return data

    print("[wakeword] No follow-up detected")
    return None


def trigger_voice_pipeline(wav_path: Path) -> bool:
    """Send recorded WAV to app's voice endpoint and play response.

    Returns True if follow-up should be skipped (e.g. news playback started).
    """
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

            # Play TTS audio response
            audio_b64 = data.get("audio")
            if audio_b64:
                RESPONSE_WAV.parent.mkdir(parents=True, exist_ok=True)
                RESPONSE_WAV.write_bytes(base64.b64decode(audio_b64))
                play_wav(RESPONSE_WAV)

            return bool(data.get("skipFollowup", False))
        else:
            print(f"[wakeword] Voice API error: {resp.status_code}", file=sys.stderr)
    except httpx.HTTPError as e:
        print(f"[wakeword] Connection error: {e}", file=sys.stderr)
    return False


def main() -> None:
    print(f"[wakeword] Loading model: {WAKEWORD_MODEL}")
    model = Model(wakeword_models=[WAKEWORD_MODEL], inference_framework="onnx")
    model_name = list(model.models.keys())[0]
    print(f"[wakeword] Model loaded: {model_name}")

    mic = None
    for attempt in range(30):
        try:
            mic = open_mic_stream()
            break
        except Exception as e:
            print(
                f"[wakeword] Mic not available (attempt {attempt + 1}/30): {e}",
                file=sys.stderr,
            )
            time.sleep(2)
    if mic is None:
        print("[wakeword] Mic unavailable after retries, exiting", file=sys.stderr)
        sys.exit(1)

    print(f"[wakeword] Listening on {AUDIO_DEVICE} (threshold={THRESHOLD})...")

    while True:
        try:
            length, data = mic.read()
            if length <= 0:
                continue

            audio_array = np.frombuffer(data, dtype=np.int16)
            prediction = model.predict(audio_array)

            score = prediction[model_name]
            if score > THRESHOLD:
                print(f"[wakeword] Detected! (score={score:.3f})")

                # Conversation loop: process initial utterance, then
                # allow follow-up turns without requiring wakeword
                first_frame: bytes | None = None
                for turn in range(1 + FOLLOWUP_MAX_TURNS):
                    wav_path = record_utterance(mic, initial_frame=first_frame)
                    skip = trigger_voice_pipeline(wav_path)
                    drain_mic_buffer(mic, model, duration=PLAYBACK_COOLDOWN)

                    if skip:
                        print("[wakeword] Skipping follow-up (audio playback active)")
                        break
                    if turn >= FOLLOWUP_MAX_TURNS:
                        print("[wakeword] Max follow-up turns reached")
                        break
                    first_frame = wait_for_followup(mic)
                    if first_frame is None:
                        break

                print("[wakeword] Resuming listening...")

        except KeyboardInterrupt:
            print("[wakeword] Shutting down")
            break
        except Exception as e:
            print(f"[wakeword] Error: {e}", file=sys.stderr)
            time.sleep(1)


if __name__ == "__main__":
    main()
