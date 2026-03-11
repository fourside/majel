#!/bin/bash
set -euo pipefail

CONFIG_NAME="${1:-hey_majel}"
CONFIG_FILE="/workspace/trainer/configs/${CONFIG_NAME}.yaml"

echo "=== openWakeWord Official Pipeline ==="
echo "Config: ${CONFIG_FILE}"
echo ""

cd /workspace/trainer

# Run the 13-step pipeline (download, generate, augment, train, export)
python3 train_wakeword.py --config "${CONFIG_FILE}"

# Copy exported model to output volume
EXPORT_DIR="/workspace/trainer/export"
if [ -d "${EXPORT_DIR}" ]; then
    echo ""
    echo "[copy] Copying exported model to /output..."
    cp -v "${EXPORT_DIR}"/*.onnx* /output/ 2>/dev/null || true
fi

echo ""
echo "=== Training complete ==="
echo "Output files:"
ls -la /output/
