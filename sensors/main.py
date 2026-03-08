"""MAJEL sensor reader — HTU21D, BMP180, BH1750 via I2C."""

import json
import time
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

SENSOR_FILE = Path("/tmp/majel/majel_sensors.json")
INTERVAL = 30
JST = timezone(timedelta(hours=9))

# ── I2C アドレス ──
HTU21D_ADDR = 0x40
BMP180_ADDR = 0x77
BH1750_ADDR = 0x23


def create_bus():
    try:
        import smbus2
        return smbus2.SMBus(1)
    except (ImportError, FileNotFoundError, OSError) as e:
        print(f"I2C not available: {e}", file=sys.stderr)
        return None


# ── HTU21D (温度・湿度) ──
def read_htu21d(bus):
    try:
        bus.write_byte(HTU21D_ADDR, 0xF3)
        time.sleep(0.1)
        data = bus.read_i2c_block_data(HTU21D_ADDR, 0x00, 3)
        raw_temp = (data[0] << 8) + data[1]
        temp = -46.85 + 175.72 * (raw_temp / 65536.0)

        bus.write_byte(HTU21D_ADDR, 0xF5)
        time.sleep(0.1)
        data = bus.read_i2c_block_data(HTU21D_ADDR, 0x00, 3)
        raw_hum = (data[0] << 8) + data[1]
        hum = -6.0 + 125.0 * (raw_hum / 65536.0)
        hum = max(0.0, min(100.0, hum))

        return round(temp, 1), round(hum, 1)
    except Exception as e:
        print(f"HTU21D error: {e}", file=sys.stderr)
        return None, None


# ── BMP180 (温度・気圧) ──
def read_bmp180_calibration(bus):
    data = bus.read_i2c_block_data(BMP180_ADDR, 0xAA, 22)
    return {
        "AC1": int.from_bytes(data[0:2], "big", signed=True),
        "AC2": int.from_bytes(data[2:4], "big", signed=True),
        "AC3": int.from_bytes(data[4:6], "big", signed=True),
        "AC4": int.from_bytes(data[6:8], "big", signed=False),
        "AC5": int.from_bytes(data[8:10], "big", signed=False),
        "AC6": int.from_bytes(data[10:12], "big", signed=False),
        "B1": int.from_bytes(data[12:14], "big", signed=True),
        "B2": int.from_bytes(data[14:16], "big", signed=True),
        "MB": int.from_bytes(data[16:18], "big", signed=True),
        "MC": int.from_bytes(data[18:20], "big", signed=True),
        "MD": int.from_bytes(data[20:22], "big", signed=True),
    }


_bmp180_cal = None


def read_bmp180(bus):
    global _bmp180_cal
    try:
        if _bmp180_cal is None:
            _bmp180_cal = read_bmp180_calibration(bus)
        cal = _bmp180_cal
        oss = 1

        bus.write_byte_data(BMP180_ADDR, 0xF4, 0x2E)
        time.sleep(0.005)
        data = bus.read_i2c_block_data(BMP180_ADDR, 0xF6, 2)
        ut = (data[0] << 8) + data[1]

        bus.write_byte_data(BMP180_ADDR, 0xF4, 0x34 + (oss << 6))
        time.sleep(0.01)
        data = bus.read_i2c_block_data(BMP180_ADDR, 0xF6, 3)
        up = ((data[0] << 16) + (data[1] << 8) + data[2]) >> (8 - oss)

        x1 = (ut - cal["AC6"]) * cal["AC5"] / (1 << 15)
        x2 = cal["MC"] * (1 << 11) / (x1 + cal["MD"])
        b5 = x1 + x2
        temp = (b5 + 8) / (1 << 4) / 10.0

        b6 = b5 - 4000
        x1 = (cal["B2"] * (b6 * b6 / (1 << 12))) / (1 << 11)
        x2 = cal["AC2"] * b6 / (1 << 11)
        x3 = x1 + x2
        b3 = (((cal["AC1"] * 4 + int(x3)) << oss) + 2) / 4
        x1 = cal["AC3"] * b6 / (1 << 13)
        x2 = (cal["B1"] * (b6 * b6 / (1 << 12))) / (1 << 16)
        x3 = (x1 + x2 + 2) / (1 << 2)
        b4 = cal["AC4"] * (x3 + 32768) / (1 << 15)
        b7 = (up - b3) * (50000 >> oss)
        if b7 < 0x80000000:
            p = (b7 * 2) / b4
        else:
            p = (b7 / b4) * 2
        x1 = (p / 256) * (p / 256)
        x1 = (x1 * 3038) / (1 << 16)
        x2 = (-7357 * p) / (1 << 16)
        pressure = p + (x1 + x2 + 3791) / (1 << 4)
        pressure_hpa = pressure / 100.0

        return round(temp, 1), round(pressure_hpa, 2)
    except Exception as e:
        print(f"BMP180 error: {e}", file=sys.stderr)
        return None, None


# ── BH1750 (照度) ──
def read_bh1750(bus):
    try:
        bus.write_byte(BH1750_ADDR, 0x10)
        time.sleep(0.2)
        data = bus.read_i2c_block_data(BH1750_ADDR, 0x00, 2)
        lux = (data[0] << 8 | data[1]) / 1.2
        return round(lux, 1)
    except Exception as e:
        print(f"BH1750 error: {e}", file=sys.stderr)
        return None


# ── メインループ ──
def main():
    SENSOR_FILE.parent.mkdir(parents=True, exist_ok=True)
    bus = create_bus()

    if bus is None:
        print(f"Running in stub mode (no I2C), writing to {SENSOR_FILE}")
    else:
        print(f"Sensor reader started (interval={INTERVAL}s)")

    while True:
        if bus is not None:
            temp_htu, humidity = read_htu21d(bus)
            temp_bmp, pressure = read_bmp180(bus)
            light = read_bh1750(bus)
            temperature = temp_htu if temp_htu is not None else temp_bmp
        else:
            temperature = humidity = pressure = light = None

        data = {
            "temperature": temperature,
            "humidity": humidity,
            "pressure": pressure,
            "light": light,
            "timestamp": datetime.now(JST).isoformat(),
        }

        SENSOR_FILE.write_text(json.dumps(data))
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
