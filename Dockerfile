# syntax=docker/dockerfile:1.7

FROM golang:1.26-bookworm AS gobuild
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=gobuild /out/server /app/server
COPY migrations /app/migrations

EXPOSE 10000
CMD ["/app/server"]
