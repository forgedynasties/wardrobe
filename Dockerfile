# syntax=docker/dockerfile:1.7

FROM golang:1.26-bookworm AS gobuild
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM python:3.11-slim-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libglib2.0-0 libgl1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir "rembg[cli]"

# Pre-download the default u2net model so first request isn't slow.
RUN python -c "from rembg import new_session; new_session('u2net')"

WORKDIR /app
COPY --from=gobuild /out/server /app/server
COPY migrations /app/migrations

EXPOSE 10000
CMD ["/app/server"]
