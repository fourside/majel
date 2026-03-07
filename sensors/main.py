"""MAJEL sensor reader — I2C sensors → JSON file.

Skeleton: writes stub data until Phase 3 implementation.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

SENSOR_FILE = Path("/tmp/majel/majel_sensors.json")
POLL_INTERVAL = 30


def main() -> None:
    SENSOR_FILE.parent.mkdir(parents=True, exist_ok=True)
    print(f"Sensor stub started, writing to {SENSOR_FILE}")

    while True:
        data = {
            "temperature": None,
            "humidity": None,
            "pressure": None,
            "light": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        SENSOR_FILE.write_text(json.dumps(data))
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
