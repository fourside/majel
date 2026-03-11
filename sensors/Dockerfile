FROM python:3.12-slim AS build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# System deps for pyalsaaudio build
RUN apt-get update && apt-get install -y --no-install-recommends \
      libasound2-dev gcc libc6-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Download openwakeword preprocessor models (melspectrogram + embedding)
RUN .venv/bin/python -c "import openwakeword; openwakeword.utils.download_models()"

FROM python:3.12-slim

# Runtime deps: ALSA libs for pyalsaaudio
RUN apt-get update && apt-get install -y --no-install-recommends \
      libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app /app
ENV PATH="/app/.venv/bin:$PATH"

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
