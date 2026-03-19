FROM --platform=$BUILDPLATFORM denoland/deno:2.7.4 AS builder

WORKDIR /app
COPY deno.json ./
COPY src/ src/
RUN deno cache src/main.ts

FROM denoland/deno:2.7.4

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/ .
COPY --from=builder /root/.cache/deno /root/.cache/deno

ENTRYPOINT ["deno", "task", "record"]
