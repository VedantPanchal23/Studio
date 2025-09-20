# C++ runtime container for code execution
FROM gcc:latest

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -r -u 1001 -g appgroup appuser

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create workspace directory
RUN mkdir -p /workspace && \
    chown appuser:appgroup /workspace

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER appuser

# Set up environment
ENV HOME=/tmp
ENV USER=appuser

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["/bin/sh"]