import xml.etree.ElementTree as ET
import math

xml_path = r"C:\CS1\S1.zip\S1D_IW_GRDH_1SDV_20260913T005431_20260913T005456_004552_008782_7C5B.SAFE\annotation\s1d-iw-grd-vv-20260913t005431-20260913t005456-004552-008782-001.xml"

# Original Sentinel-1 raster dimensions
raster_width = 25537
raster_height = 16736

# 1024x1024 chip was extracted from the center
chip_width = 1024
chip_height = 1024

chip_x = (raster_width - chip_width) // 2
chip_y = (raster_height - chip_height) // 2

# Center pixel of our chip
target_pixel = chip_x + chip_width / 2
target_line = chip_y + chip_height / 2

print("CHIP TOP-LEFT PIXEL:", chip_x, chip_y)
print("CHIP CENTER PIXEL:", target_pixel, target_line)

tree = ET.parse(xml_path)
root = tree.getroot()

points = []

for elem in root.iter():
    if elem.tag.endswith("geolocationGridPoint"):
        pixel = None
        line = None
        lat = None
        lon = None

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

nearest = min(
    points,
    key=lambda p: math.hypot(
        p[0] - target_pixel,
        p[1] - target_line
    )
)

pixel, line, lat, lon = nearest

print()
print("GELOCATION GRID POINTS:", len(points))
print("NEAREST GRID PIXEL:", pixel)
print("NEAREST GRID LINE:", line)
print("CHIP CENTER LATITUDE:", lat)
print("CHIP CENTER LONGITUDE:", lon)
print()
print("SENTINEL-1 CHIP LOCATION:")
print(f"{lat:.6f}, {lon:.6f}")
