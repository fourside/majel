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

# Install PyTorch with CUDA 12.1
RUN pip install --no-cache-dir \
      torch==2.1.2+cu121 torchaudio==2.1.2+cu121 \
      --index-url https://download.pytorch.org/whl/cu121

# Install trainer dependencies
RUN pip install --no-cache-dir -r /workspace/trainer/requirements.txt

# Pin onnxruntime for Piper TTS compatibility (>=1.17 has GatherElements errors)
RUN pip install --no-cache-dir onnxruntime==1.16.3

# ONNX export tools
RUN pip install --no-cache-dir onnx==1.17.0

# Copy config and entrypoint
COPY configs/hey_majel.yaml /workspace/trainer/configs/hey_majel.yaml
COPY train-official.sh /workspace/train-official.sh
RUN chmod +x /workspace/train-official.sh

VOLUME /output

ENTRYPOINT ["/workspace/train-official.sh"]
CMD ["hey_majel"]
