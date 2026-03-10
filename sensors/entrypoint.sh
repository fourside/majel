#!/bin/bash
set -e

# Start sensor reader in background
python main.py &
SENSOR_PID=$!

# Start wakeword listener in background
python wakeword_listener.py &
WAKEWORD_PID=$!

echo "Started sensor reader (PID=$SENSOR_PID) and wakeword listener (PID=$WAKEWORD_PID)"

# Wait for either process to exit
wait -n $SENSOR_PID $WAKEWORD_PID
EXIT_CODE=$?

echo "A process exited with code $EXIT_CODE, shutting down..."
kill $SENSOR_PID $WAKEWORD_PID 2>/dev/null || true
wait
exit $EXIT_CODE
