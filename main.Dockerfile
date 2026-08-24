FROM ubuntu:22.04 AS install-whisper
ENV DEBIAN_FRONTEND=noninteractive
RUN apt update
# whisper install dependencies
RUN apt install -y \
    git \
    build-essential \
    wget \
    cmake \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /whisper
RUN git clone https://github.com/ggml-org/whisper.cpp.git .
RUN git checkout v1.7.1
RUN make MK_CFLAGS='-std=c11 -fPIC -O3' \
    MK_CXXFLAGS='-std=c++11 -fPIC -O3' \
    LDFLAGS='-fopenmp'
WORKDIR /whisper/models
RUN sh ./download-ggml-model.sh base.en

FROM node:22-bookworm-slim AS base
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app
RUN apt update
RUN apt install -y \
      # whisper dependencies
      git \
      wget \
      cmake \
      ffmpeg \
      curl \
      make \
      libsdl2-dev \
      # remotion dependencies
      libnss3 \
      libdbus-1-3 \
      libatk1.0-0 \
      libgbm-dev \
      libasound2 \
      libxrandr2 \
      libxkbcommon-dev \
      libxfixes3 \
      libxcomposite1 \
      libxdamage1 \
      libatk-bridge2.0-0 \
      libpango-1.0-0 \
      libcairo2 \
      libcups2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml* .pnpmfile.cjs /app/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm install --prefer-offline --no-cache --prod

FROM prod-deps AS build
ENV DOCKER=true
ENV DATA_DIR_PATH=/app/data
ENV WHISPER_INSTALL_PATH=/app/libs/whisper
ENV PUPPETEER_CACHE_DIR=/app/cache/puppeteer
ENV HF_HOME=/app/cache/huggingface
COPY tsconfig.json /app
COPY tsconfig.build.json /app
COPY vite.config.ts /app
COPY .pnpmfile.cjs /app
COPY src /app/src
COPY scripts/copy-edge-tts-script.js /app/scripts/copy-edge-tts-script.js
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build
RUN mkdir -p /app/cache /app/cache/puppeteer /app/cache/huggingface
COPY --from=install-whisper /whisper /app/libs/whisper
RUN pnpm exec ts-node src/scripts/install.ts
RUN mkdir -p /app/cache /app/cache/puppeteer /app/cache/huggingface && touch /app/cache/.keep

FROM base
ENV PUPPETEER_CACHE_DIR=/app/cache/puppeteer
ENV HF_HOME=/app/cache/huggingface
COPY static /app/static
COPY docker-entrypoint.js /app/docker-entrypoint.js
COPY --from=install-whisper /whisper /app/libs/whisper
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/cache /app/cache
COPY --from=build /app/cache /app/cache-seed
COPY package.json /app/

# app configuration via environment variables
ENV DATA_DIR_PATH=/app/data
ENV DOCKER=true
ENV WHISPER_MODEL=base.en
ENV WHISPER_INSTALL_PATH=/app/libs/whisper
# number of chrome tabs to use for rendering
ENV CONCURRENCY=1
# video cache - 2000MB
ENV VIDEO_CACHE_SIZE_IN_BYTES=2097152000

ENTRYPOINT ["node", "/app/docker-entrypoint.js"]
