FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.10 python3.10-venv python3-pip \
      espeak-ng libsndfile1 ffmpeg git wget curl \
      build-essential python3.10-dev \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1

WORKDIR /workspace

# Clone openwakeword-trainer (13-step pipeline with compat patches)
RUN git clone https://github.com/lgpearson1771/openwakeword-trainer.git /workspace/trainer

# Patch trainer: Piper model is ~195MB, not 600MB as the threshold assumes
RUN sed -i 's/600_000_000/200_000_000/' /workspace/trainer/train_wakeword.py

# Patch trainer: newer datasets library removed trust_remote_code parameter
RUN sed -i 's/, *trust_remote_code=True//' /workspace/trainer/train_wakeword.py

# Patch trainer: MIT RIR download fails with newer datasets lib; skip the check
RUN sed -i 's/"mit_rirs", "audioset_16k"/"audioset_16k"/' /workspace/trainer/train_wakeword.py

# Install PyTorch with CUDA 12.1
RUN pip install --no-cache-dir \
      torch==2.1.2+cu121 torchaudio==2.1.2+cu121 \
      --index-url https://download.pytorch.org/whl/cu121

# Install trainer dependencies
RUN pip install --no-cache-dir -r /workspace/trainer/requirements.txt

# Patch openwakeword train.py: add model= arg to generate_samples() calls
# (piper-sample-generator v2+ requires explicit model path)
RUN sed -i 's|generate_samples(text=|generate_samples(model=glob.glob(os.path.join(config["piper_sample_generator_path"], "models", "*.pt"))[0], text=|g' \
    /usr/local/lib/python3.10/dist-packages/openwakeword/train.py \
    && sed -i '670s|text=|model=glob.glob(os.path.join(config["piper_sample_generator_path"], "models", "*.pt"))[0], text=|' \
    /usr/local/lib/python3.10/dist-packages/openwakeword/train.py \
    && sed -i '1s|^|import glob\n|' \
    /usr/local/lib/python3.10/dist-packages/openwakeword/train.py

# Pin numpy<2 (torch 2.1.2 was compiled against NumPy 1.x)
# Pin onnxruntime for Piper TTS compatibility (>=1.17 has GatherElements errors)
# Pin onnx for export
# Install piper-tts for synthetic speech generation
RUN pip install --no-cache-dir "numpy<2" onnxruntime==1.16.3 onnx==1.17.0 piper-tts

# Download openwakeword preprocessor models (melspectrogram + embedding)
RUN python3 -c "import openwakeword; openwakeword.utils.download_models()"

# Copy config and entrypoint
COPY configs/hey_majel.yaml /workspace/trainer/configs/hey_majel.yaml
COPY train-official.sh /workspace/train-official.sh
RUN chmod +x /workspace/train-official.sh

VOLUME /output

ENTRYPOINT ["/workspace/train-official.sh"]
CMD ["hey_majel"]
