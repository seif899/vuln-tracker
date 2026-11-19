#!/usr/bin/env bash
# ==============================================================================
# Helper script to run Trivy scanner and ingest results into Vulnerability Tracker
# Usage:
#   ./scripts/scan_and_upload.sh <PROJECT_ID> <IMAGE_OR_PATH> [API_URL]
# Example:
#   ./scripts/scan_and_upload.sh 1 node:18-alpine http://localhost:8000/api/v1
# ==============================================================================

set -euo pipefail

PROJECT_ID="${1:-}"
TARGET="${2:-}"
API_URL="${3:-http://localhost:8000/api/v1}"

if [ -z "$PROJECT_ID" ] || [ -z "$TARGET" ]; then
    echo "Usage: $0 <PROJECT_ID> <TARGET_IMAGE_OR_DIR> [API_URL]"
    echo "Example: $0 1 python:3.10-alpine"
    exit 1
fi

SCAN_OUTPUT="/tmp/trivy_scan_$$.json"

echo "[*] Scanning target '$TARGET' using Trivy..."
if command -v trivy &> /dev/null; then
    trivy image --format json -o "$SCAN_OUTPUT" "$TARGET" 2>/dev/null || \
    trivy fs --format json -o "$SCAN_OUTPUT" "$TARGET"
elif command -v docker &> /dev/null; then
    echo "[*] Trivy binary not found locally; running via official Docker container..."
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        aquasec/trivy:latest image --format json "$TARGET" > "$SCAN_OUTPUT"
else
    echo "Error: Neither 'trivy' nor 'docker' is installed."
    exit 1
fi

echo "[*] Ingesting scan findings into Vulnerability Tracker at $API_URL..."
curl -s -X POST "$API_URL/scans/upload" \
    -F "project_id=$PROJECT_ID" \
    -F "file=@$SCAN_OUTPUT" | jq .

rm -f "$SCAN_OUTPUT"
echo "[+] Scan completed and ingested successfully!"
