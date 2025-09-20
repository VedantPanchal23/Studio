# Java runtime container for code execution
FROM openjdk:17-alpine

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create workspace directory
RUN mkdir -p /workspace && \
    chown appuser:appgroup /workspace

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER appuser

# Set up environment
ENV JAVA_OPTS="-Xmx256m -Xms64m"
ENV HOME=/tmp
ENV USER=appuser

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["/bin/sh"]