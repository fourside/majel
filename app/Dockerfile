FROM denoland/deno:2.7.4

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends alsa-utils \
    && rm -rf /var/lib/apt/lists/*

COPY deno.json deno.lock ./
RUN deno install

COPY src/ src/
COPY static/ static/
RUN deno cache src/main.ts

USER deno
EXPOSE 3000

CMD ["deno", "task", "start"]
