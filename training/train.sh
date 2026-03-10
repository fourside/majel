#!/bin/bash
set -euo pipefail

TARGET_PHRASE="${1:-hey majel}"
N_SAMPLES="${N_SAMPLES:-2000}"
STEPS="${STEPS:-500}"
OUTPUT_DIR="/output"
WORK_DIR="/workspace/workdir"

echo "=== openWakeWord Training ==="
echo "Target phrase: ${TARGET_PHRASE}"
echo "Samples: ${N_SAMPLES}, Steps: ${STEPS}"
echo "Output: ${OUTPUT_DIR}"
echo ""

mkdir -p "${WORK_DIR}" "${OUTPUT_DIR}"

# Step 1: Generate synthetic positive samples with multiple Piper TTS voices
echo "[1/6] Generating synthetic positive samples..."
POSITIVE_DIR="${WORK_DIR}/positive_samples"
mkdir -p "${POSITIVE_DIR}"

python3 <<PYEOF
import wave
import itertools as it
from pathlib import Path
from piper import PiperVoice, SynthesisConfig

TARGET = "${TARGET_PHRASE}"
N_SAMPLES = ${N_SAMPLES}
POSITIVE_DIR = Path("${POSITIVE_DIR}")

voices_info = [
    "/workspace/voices/en_US-lessac-medium.onnx",
    "/workspace/voices/en_US-amy-medium.onnx",
    "/workspace/voices/en_US-ryan-medium.onnx",
    "/workspace/voices/en_GB-alba-medium.onnx",
]

length_scales = [0.8, 1.0, 1.2]
noise_scales = [0.667, 0.8]
noise_ws = [0.8]

voices = []
for vp in voices_info:
    try:
        v = PiperVoice.load(vp)
        voices.append(v)
        print(f"  Loaded: {Path(vp).stem}")
    except Exception as e:
        print(f"  Failed to load {vp}: {e}")

if not voices:
    print("ERROR: No voices loaded!")
    exit(1)

settings = list(it.product(voices, length_scales, noise_scales, noise_ws))
sample_idx = 0

for voice, ls, ns, nw in it.cycle(settings):
    if sample_idx >= N_SAMPLES:
        break
    out_path = POSITIVE_DIR / f"{sample_idx:05d}.wav"
    try:
        with wave.open(str(out_path), "wb") as wf:
            voice.synthesize_wav(
                TARGET, wf,
                syn_config=SynthesisConfig(
                    length_scale=ls, noise_scale=ns, noise_w_scale=nw
                ),
            )
        sample_idx += 1
        if sample_idx % 200 == 0:
            print(f"  {sample_idx}/{N_SAMPLES}")
    except Exception as e:
        # Some parameter combinations may produce empty audio
        pass

print(f"  Generated {sample_idx} positive clips")
PYEOF

# Step 2: Generate negative samples (different phrases)
echo "[2/6] Generating negative samples..."
NEGATIVE_DIR="${WORK_DIR}/negative_samples"
mkdir -p "${NEGATIVE_DIR}"

python3 <<PYEOF
import wave
from pathlib import Path
from piper import PiperVoice, SynthesisConfig

NEGATIVE_DIR = Path("${NEGATIVE_DIR}")
voice = PiperVoice.load("/workspace/voices/en_US-lessac-medium.onnx")

phrases = [
    "hello world", "good morning", "hey google", "ok computer",
    "turn on lights", "play music", "hey siri", "alexa",
    "hey model", "hey rachel", "hey angel", "hey michael",
]

sample_idx = 0
for phrase in phrases:
    phrase_dir = NEGATIVE_DIR / phrase.replace(" ", "_")
    phrase_dir.mkdir(parents=True, exist_ok=True)
    for i in range(200):
        out_path = phrase_dir / f"{i:04d}.wav"
        try:
            with wave.open(str(out_path), "wb") as wf:
                voice.synthesize_wav(phrase, wf)
            sample_idx += 1
        except Exception:
            pass

print(f"  Generated {sample_idx} negative clips")
PYEOF

# Step 3: Feature extraction and training
echo "[3/6] Extracting features..."
echo "[4/6] Training model..."
echo "[5/6] Exporting..."

MODEL_NAME=$(echo "${TARGET_PHRASE}" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')

python3 <<PYEOF
import os
import sys
import glob
import numpy as np
import torch
import torchaudio
import onnxruntime as ort

POSITIVE_DIR = "${POSITIVE_DIR}"
NEGATIVE_DIR = "${NEGATIVE_DIR}"
WORK_DIR = "${WORK_DIR}"
MODEL_NAME = "${MODEL_NAME}"
STEPS = ${STEPS}

# Collect audio files
pos_files = glob.glob(f"{POSITIVE_DIR}/**/*.wav", recursive=True)
neg_files = glob.glob(f"{NEGATIVE_DIR}/**/*.wav", recursive=True)

print(f"  Positive samples: {len(pos_files)}")
print(f"  Negative samples: {len(neg_files)}")

if len(pos_files) == 0:
    print("ERROR: No positive samples found!")
    sys.exit(1)

# Load ONNX feature extraction models
mel_session = ort.InferenceSession("/workspace/models/melspectrogram.onnx")
emb_session = ort.InferenceSession("/workspace/models/embedding_model.onnx")

def extract_embedding(wav_path):
    waveform, sr = torchaudio.load(wav_path)
    if sr != 16000:
        waveform = torchaudio.functional.resample(waveform, sr, 16000)
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    audio = waveform.squeeze().numpy()
    # Pad/trim to 1 second
    target_len = 16000
    if len(audio) < target_len:
        audio = np.pad(audio, (0, target_len - len(audio)))
    else:
        audio = audio[:target_len]
    # Mel spectrogram: output shape (1, 1, 97, 32)
    mel = mel_session.run(None, {"input": audio.reshape(1, -1).astype(np.float32)})[0]
    # Embedding model expects (batch, 76, 32, 1) — take first 76 frames
    mel_input = mel[0, 0, :76, :].reshape(1, 76, 32, 1)
    emb = emb_session.run(None, {"input_1": mel_input})[0]
    return emb.flatten()

MAX_SAMPLES = 2000

print("  Extracting positive embeddings...")
pos_embeddings = []
for i, f in enumerate(pos_files[:MAX_SAMPLES]):
    try:
        emb = extract_embedding(f)
        pos_embeddings.append(emb)
    except Exception:
        pass
    if (i + 1) % 500 == 0:
        print(f"    {i + 1}/{min(len(pos_files), MAX_SAMPLES)}")

print("  Extracting negative embeddings...")
neg_embeddings = []
for i, f in enumerate(neg_files[:MAX_SAMPLES]):
    try:
        emb = extract_embedding(f)
        neg_embeddings.append(emb)
    except Exception:
        pass
    if (i + 1) % 500 == 0:
        print(f"    {i + 1}/{min(len(neg_files), MAX_SAMPLES)}")

X_pos = np.array(pos_embeddings)
X_neg = np.array(neg_embeddings)
X = np.vstack([X_pos, X_neg])
y = np.concatenate([np.ones(len(X_pos)), np.zeros(len(X_neg))])

print(f"  Training set: {X.shape[0]} samples, {X.shape[1]} features")

# DNN classifier
import torch.nn as nn
import torch.optim as optim

class WakewordModel(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"  Training on: {device}")

model = WakewordModel(X.shape[1]).to(device)
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.BCELoss()

X_t = torch.FloatTensor(X).to(device)
y_t = torch.FloatTensor(y).unsqueeze(1).to(device)

model.train()
for step in range(STEPS):
    idx = np.random.choice(len(X), min(64, len(X)), replace=False)
    batch_x = X_t[idx]
    batch_y = y_t[idx]

    optimizer.zero_grad()
    output = model(batch_x)
    loss = criterion(output, batch_y)
    loss.backward()
    optimizer.step()

    if (step + 1) % 100 == 0:
        model.eval()
        with torch.no_grad():
            pred = model(X_t)
            acc = ((pred > 0.5).float() == y_t).float().mean()
        print(f"  Step {step + 1}/{STEPS} — loss: {loss.item():.4f}, acc: {acc.item():.4f}")
        model.train()

# Export to ONNX
model.eval()
model.cpu()
dummy = torch.randn(1, X.shape[1])
out_dir = f"{WORK_DIR}/trained_model"
os.makedirs(out_dir, exist_ok=True)
onnx_path = f"{out_dir}/{MODEL_NAME}.onnx"
torch.onnx.export(
    model, dummy, onnx_path,
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
)
print(f"  Saved ONNX model to {onnx_path}")

# Convert to tflite
try:
    import onnx2tf
    tflite_dir = f"{out_dir}/tflite"
    onnx2tf.convert(input_onnx_file_path=onnx_path, output_folder_path=tflite_dir)
    print(f"  Saved TFLite model to {tflite_dir}")
except Exception as ex:
    print(f"  TFLite conversion skipped: {ex}")

print("  Training complete!")
PYEOF

# Step 6: Copy output
echo "[6/6] Copying results to output..."
if [ -d "${WORK_DIR}/trained_model" ]; then
  cp -r "${WORK_DIR}/trained_model/"* "${OUTPUT_DIR}/" 2>/dev/null || true
fi

echo ""
echo "=== Training complete ==="
echo "Output files:"
ls -la "${OUTPUT_DIR}/"
