import csv
import json
import math
import os
import subprocess

LAT0 = 28.89022528829614
LON0 = -88.99413154267471
RADIUS_KM = 50

# Approximate bounding box for 50 km radius
LAT_DELTA = RADIUS_KM / 111.0
LON_DELTA = RADIUS_KM / (
    111.0 * math.cos(math.radians(LAT0))
)

MIN_LAT = LAT0 - LAT_DELTA
MAX_LAT = LAT0 + LAT_DELTA
MIN_LON = LON0 - LON_DELTA
MAX_LON = LON0 + LON_DELTA

Z7 = r"C:\Program Files\7-Zip\7z.exe"
ZST_FILE = r"C:\Users\hp\Downloads\ais-2018-09-26.csv.zst"

OUTPUT_DIR = r"C:\Users\hp\OneDrive\Desktop\oil-spill-intelligence\backend\data"
OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "noaa_ais_2018_09_26_gulf.jsonl"
)


def distance_km(lat1, lon1, lat2, lon2):
    radius = 6371.0

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dlon / 2) ** 2
    )

    return 2 * radius * math.asin(math.sqrt(a))


os.makedirs(OUTPUT_DIR, exist_ok=True)

process = subprocess.Popen(
    [
        Z7,
        "e",
        ZST_FILE,
        "-so",
    ],
    stdout=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="ignore",
)

reader = csv.DictReader(process.stdout)

rows_checked = 0
points_saved = 0
vessels = set()

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as output:

    for row in reader:

        rows_checked += 1

        # Show progress every 500,000 rows
        if rows_checked % 500000 == 0:
            print(
                f"Rows checked: {rows_checked:,} | "
                f"Points saved: {points_saved:,}"
            )

        try:
            latitude = float(row["latitude"])
            longitude = float(row["longitude"])
        except (ValueError, TypeError):
            continue

        # Fast bounding-box filter
        if not (
            MIN_LAT <= latitude <= MAX_LAT
            and MIN_LON <= longitude <= MAX_LON
        ):
            continue

        # Accurate distance check
        distance = distance_km(
            latitude,
            longitude,
            LAT0,
            LON0
        )

        if distance > RADIUS_KM:
            continue

        record = {
            "mmsi": row["mmsi"],
            "baseDateTime": row["base_date_time"],
            "latitude": latitude,
            "longitude": longitude,
            "sog": float(row["sog"]) if row["sog"] else None,
            "cog": float(row["cog"]) if row["cog"] else None,
            "heading": float(row["heading"]) if row["heading"] else None,
            "vesselName": row["vessel_name"],
            "imo": row["imo"],
            "callSign": row["call_sign"],
            "vesselType": row["vessel_type"],
            "status": row["status"],
            "length": row["length"],
            "width": row["width"],
            "draft": row["draft"],
            "cargo": row["cargo"],
            "transceiver": row["transceiver"],
            "distanceKm": round(distance, 3),
        }

        output.write(
            json.dumps(
                record,
                separators=(",", ":")
            ) + "\n"
        )

        points_saved += 1
        vessels.add(row["mmsi"])


process.wait()

print()
print("===================================")
print("NOAA AIS EXTRACTION COMPLETE")
print("===================================")
print(f"Rows checked: {rows_checked:,}")
print(f"AIS points saved: {points_saved:,}")
print(f"Unique vessels: {len(vessels):,}")
print(f"Output: {OUTPUT_FILE}")