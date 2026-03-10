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

# Clone openwakeword-trainer (has compatibility patches built-in)
RUN git clone https://github.com/lgpearson1771/openwakeword-trainer.git /workspace/trainer

# Install PyTorch with CUDA 12.1
RUN pip install --no-cache-dir \
      torch==2.1.2+cu121 torchaudio==2.1.2+cu121 \
      --index-url https://download.pytorch.org/whl/cu121

# Install training dependencies
RUN pip install --no-cache-dir \
      openwakeword \
      speechbrain==0.5.14 \
      audiomentations==0.33.0 \
      torch-audiomentations==0.11.0 \
      acoustics==0.2.6 \
      mutagen==1.47.0 \
      torchinfo==1.8.0 \
      torchmetrics==1.2.0 \
      pronouncing==0.2.0 \
      datasets==2.14.6 \
      deep-phonemizer==0.0.19 \
      librosa \
      soundfile \
      scipy \
      numpy

# Install ONNX conversion tools
RUN pip install --no-cache-dir \
      onnx==1.17.0 \
      tensorflow-cpu==2.15.0 \
      onnx2tf

# Install piper TTS and piper-sample-generator for synthetic data
# Pin onnxruntime==1.16.3 LAST — Piper models have GatherElements errors on >=1.17
RUN pip install --no-cache-dir piper-tts \
    && git clone https://github.com/rhasspy/piper-sample-generator.git /workspace/piper-sample-generator \
    && cd /workspace/piper-sample-generator \
    && pip install --no-cache-dir -e . \
    && pip install --no-cache-dir onnxruntime==1.16.3

# Download pre-trained feature extraction models
RUN mkdir -p /workspace/models \
    && wget -q -O /workspace/models/embedding_model.onnx \
       https://github.com/dscripka/openWakeWord/releases/download/v0.5.1/embedding_model.onnx \
    && wget -q -O /workspace/models/melspectrogram.onnx \
       https://github.com/dscripka/openWakeWord/releases/download/v0.5.1/melspectrogram.onnx

# Download English Piper voice models for synthetic data generation (multiple for diversity)
RUN mkdir -p /workspace/voices \
    && wget -q -O /workspace/voices/en_US-lessac-medium.onnx \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx \
    && wget -q -O /workspace/voices/en_US-lessac-medium.onnx.json \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json \
    && wget -q -O /workspace/voices/en_US-amy-medium.onnx \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx \
    && wget -q -O /workspace/voices/en_US-amy-medium.onnx.json \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json \
    && wget -q -O /workspace/voices/en_US-ryan-medium.onnx \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx \
    && wget -q -O /workspace/voices/en_US-ryan-medium.onnx.json \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/medium/en_US-ryan-medium.onnx.json \
    && wget -q -O /workspace/voices/en_GB-alba-medium.onnx \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx \
    && wget -q -O /workspace/voices/en_GB-alba-medium.onnx.json \
       https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json

COPY train.sh /workspace/train.sh
RUN chmod +x /workspace/train.sh

VOLUME /output

ENTRYPOINT ["/workspace/train.sh"]
CMD ["hey majel"]
