# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS webuild
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web .
ENV NEXT_STANDALONE=1
RUN npm run build
# standalone output includes only what's needed to run
RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

FROM golang:1.26-bookworm AS gobuild
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM node:20-alpine
WORKDIR /app
COPY --from=gobuild /out/server /app/server
COPY --from=webuild /web/.next/standalone /app/web
COPY migrations /app/migrations

# start.sh: launch Next.js then Go (Go is the public-facing server)
RUN printf '#!/bin/sh\ncd /app/web && node server.js &\nexec /app/server\n' > /app/start.sh && \
    chmod +x /app/start.sh

ENV NEXT_URL=http://localhost:3000
ENV PORT=10000
EXPOSE 10000
CMD ["/app/start.sh"]
