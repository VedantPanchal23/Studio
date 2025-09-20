#!/bin/bash

# Build script for IDE runtime containers
set -e

echo "Building IDE runtime containers..."

# Define image names
IMAGES=(
    "ide-node:latest"
    "ide-python:latest" 
    "ide-java:latest"
    "ide-cpp:latest"
    "ide-go:latest"
    "ide-rust:latest"
)

DOCKERFILES=(
    "Dockerfile.node"
    "Dockerfile.python"
    "Dockerfile.java"
    "Dockerfile.cpp"
    "Dockerfile.go"
    "Dockerfile.rust"
)

# Build each image
for i in "${!IMAGES[@]}"; do
    image="${IMAGES[$i]}"
    dockerfile="${DOCKERFILES[$i]}"
    
    echo "Building $image from $dockerfile..."
    docker build -f "$dockerfile" -t "$image" .
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully built $image"
    else
        echo "✗ Failed to build $image"
        exit 1
    fi
done

echo "All images built successfully!"

# List the built images
echo "Built images:"
docker images | grep "ide-"