import xml.etree.ElementTree as ET
import math

xml_path = r"C:\CS1\S1.zip\S1D_IW_GRDH_1SDV_20260913T005431_20260913T005456_004552_008782_7C5B.SAFE\annotation\s1d-iw-grd-vv-20260913t005431-20260913t005456-004552-008782-001.xml"

# Chip location inside original 25537 x 16736 raster
chip_x = 296.5
chip_y = 962.5

chip_top_left_x = 12256
chip_top_left_y = 7856

target_pixel = chip_top_left_x + chip_x
target_line = chip_top_left_y + chip_y

print("ORIGINAL RASTER PIXEL:", target_pixel)
print("ORIGINAL RASTER LINE:", target_line)

tree = ET.parse(xml_path)
root = tree.getroot()

points = []

for elem in root.iter():
    if elem.tag.endswith("geolocationGridPoint"):
        pixel = line = lat = lon = None

        for child in elem:
            name = child.tag.split("}")[-1]
            text = child.text.strip() if child.text else ""

            if name == "pixel":
                pixel = float(text)
            elif name == "line":
                line = float(text)
            elif name == "latitude":
                lat = float(text)
            elif name == "longitude":
                lon = float(text)

        if None not in (pixel, line, lat, lon):
            points.append((pixel, line, lat, lon))

if not points:
    raise RuntimeError("No geolocation grid points found.")

# Find nearest grid points
ranked = sorted(
    points,
    key=lambda p: math.hypot(
        p[0] - target_pixel,
        p[1] - target_line
    )
)

print()
print("NEAREST GEOLOCATION POINTS:")

for i, p in enumerate(ranked[:5], 1):
    pixel, line, lat, lon = p
    distance = math.hypot(
        pixel - target_pixel,
        line - target_line
    )

    print(
        f"{i}. pixel={pixel:.1f}, "
        f"line={line:.1f}, "
        f"distance={distance:.2f}, "
        f"lat={lat:.8f}, "
        f"lon={lon:.8f}"
    )

# Inverse-distance weighted estimate using nearest 4 points
nearest = ranked[:4]

weights = []
for pixel, line, lat, lon in nearest:
    d = math.hypot(
        pixel - target_pixel,
        line - target_line
    )

    # Avoid division by zero
    weight = 1 / max(d, 1e-6)
    weights.append(weight)

weight_sum = sum(weights)

latitude = sum(
    p[2] * w for p, w in zip(nearest, weights)
) / weight_sum

longitude = sum(
    p[3] * w for p, w in zip(nearest, weights)
) / weight_sum

print()
print("ESTIMATED CANDIDATE LOCATION:")
print(f"LATITUDE:  {latitude:.8f}")
print(f"LONGITUDE: {longitude:.8f}")
print()
print("CANDIDATE COORDINATES:")
print(f"{latitude:.6f}, {longitude:.6f}")
