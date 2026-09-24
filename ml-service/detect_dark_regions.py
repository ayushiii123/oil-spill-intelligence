import rasterio
import numpy as np
from collections import deque

path = r".\sentinel1_vv_chip.tiff"

with rasterio.open(path) as src:
    data = src.read(1).astype(np.float32)

threshold = np.percentile(data, 10)
mask = data <= threshold

height, width = mask.shape
visited = np.zeros_like(mask, dtype=bool)

components = []

# 8-connected neighbourhood
neighbours = [
    (-1,-1), (-1,0), (-1,1),
    (0,-1),           (0,1),
    (1,-1),  (1,0),  (1,1)
]

for y in range(height):
    for x in range(width):

        if not mask[y, x] or visited[y, x]:
            continue

        queue = deque([(y, x)])
        visited[y, x] = True

        count = 0
        min_x = max_x = x
        min_y = max_y = y

        while queue:
            cy, cx = queue.popleft()
            count += 1

            min_x = min(min_x, cx)
            max_x = max(max_x, cx)
            min_y = min(min_y, cy)
            max_y = max(max_y, cy)

            for dy, dx in neighbours:
                ny = cy + dy
                nx = cx + dx

                if (
                    0 <= ny < height
                    and 0 <= nx < width
                    and mask[ny, nx]
                    and not visited[ny, nx]
                ):
                    visited[ny, nx] = True
                    queue.append((ny, nx))

        if count >= 20:
            components.append({
                "pixels": count,
                "width": max_x - min_x + 1,
                "height": max_y - min_y + 1,
                "min_x": min_x,
                "max_x": max_x,
                "min_y": min_y,
                "max_y": max_y
            })

components.sort(key=lambda c: c["pixels"], reverse=True)

print("THRESHOLD:", round(float(threshold), 2))
print("TOTAL DARK PIXELS:", int(mask.sum()))
print("CONNECTED REGIONS >= 20 PIXELS:", len(components))

print()
print("TOP 10 CONNECTED REGIONS:")

for i, c in enumerate(components[:10], 1):
    print(
        f"{i}. pixels={c['pixels']}, "
        f"bbox={c['width']}x{c['height']}, "
        f"x={c['min_x']}-{c['max_x']}, "
        f"y={c['min_y']}-{c['max_y']}"
    )
