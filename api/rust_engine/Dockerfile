# 1. Build Stage
FROM rust:bookworm as builder

# Create a new empty shell project
WORKDIR /usr/src/rust_engine
COPY Cargo.toml Cargo.lock ./

# This is a dummy build to get the dependencies compiled and cached
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release

# Now copy the actual source code
RUN rm -rf src
COPY src ./src

# Build the real application
RUN touch src/main.rs && cargo build --release

# 2. Runtime Stage
FROM debian:bookworm-slim

# Install FFMPEG (required for frame extraction) and SSL certificates (for reqwest/Firestore)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /usr/src/rust_engine/target/release/rust_engine ./rust_engine

# Expose the API port
EXPOSE 3000

# Run the application
CMD ["./rust_engine"]
