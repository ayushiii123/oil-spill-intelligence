import csv
import math
import subprocess

LAT0 = 28.890225
LON0 = -88.994132
RADIUS_KM = 50
Z7 = r"C:\Program Files\7-Zip\7z.exe"
ZST = r"C:\Users\hp\Downloads\ais-2018-09-26.csv.zst"

def distance_km(lat1, lon1, lat2, lon2):
    R = 6371.0

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = (
        math.sin(dp / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dl / 2) ** 2
    )

    return 2 * R * math.asin(math.sqrt(a))

process = subprocess.Popen(
    [Z7, "x", ZST, "-so"],
    stdout=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="ignore"
)

reader = csv.DictReader(process.stdout)

found = {}
rows_checked = 0

for row in reader:
    rows_checked += 1

    try:
        lat = float(row["latitude"])
        lon = float(row["longitude"])
    except (ValueError, TypeError):
        continue

    distance = distance_km(
        lat,
        lon,
        LAT0,
        LON0
    )

    if distance <= RADIUS_KM:
        mmsi = row["mmsi"]

        if mmsi not in found:
            found[mmsi] = {
                "distance": distance,
                "time": row["base_date_time"],
                "name": row["vessel_name"],
                "imo": row["imo"],
                "lat": lat,
                "lon": lon,
                "sog": row["sog"],
                "cog": row["cog"],
                "heading": row["heading"],
                "type": row["vessel_type"],
            }

process.wait()

print("ROWS CHECKED:", rows_checked)
print("VESSELS FOUND:", len(found))
print()

for vessel in sorted(
    found.values(),
    key=lambda x: x["distance"]
)[:20]:

    print(
        f'{vessel["distance"]:.2f} km | '
        f'{vessel["time"]} | '
        f'{vessel["name"]} | '
        f'IMO={vessel["imo"]} | '
        f'lat={vessel["lat"]} | '
        f'lon={vessel["lon"]} | '
        f'SOG={vessel["sog"]} | '
        f'COG={vessel["cog"]}'
    )
