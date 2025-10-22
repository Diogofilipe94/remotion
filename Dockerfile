FROM node:22-bookworm-slim

# Install Chrome dependencies and curl for health check
RUN apt-get update
RUN apt install -y \
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
  curl

# Install emoji fonts (optional)
RUN apt-get install fonts-noto-color-emoji

# Install CJK fonts for Japanese, Chinese, Korean support (optional)
RUN apt-get install fonts-noto-cjk

# Copy project files
COPY package.json package*.json yarn.lock* pnpm-lock.yaml* bun.lockb* bun.lock* tsconfig.json* remotion.config.* ./
COPY src ./src
COPY render.mjs ./

# Install dependencies
RUN npm i

# Install Chrome
RUN npx remotion browser ensure

# Create directories with correct permissions
RUN mkdir -p /app/output /app/uploads && \
    chown -R node:node /app

# Switch to node user
USER node

# Expose port
EXPOSE 3000

# Run your application
CMD ["node", "src/server.js"]