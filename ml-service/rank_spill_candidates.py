import rasterio
import numpy as np
from collections import deque

path = r".\sentinel1_vv_chip.tiff"

with rasterio.open(path) as src:
    data = src.read(1).astype(np.float32)

height, width = data.shape

threshold = np.percentile(data, 10)
mask = data <= threshold

visited = np.zeros_like(mask, dtype=bool)

neighbours = [
    (-1,-1), (-1,0), (-1,1),
    (0,-1),           (0,1),
    (1,-1),  (1,0),  (1,1)
]

regions = []

for y in range(height):
    for x in range(width):

        if not mask[y, x] or visited[y, x]:
            continue

        queue = deque([(y, x)])
        visited[y, x] = True

        pixels = []
        min_x = max_x = x
        min_y = max_y = y

        while queue:
            cy, cx = queue.popleft()
            pixels.append((cy, cx))

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

        count = len(pixels)

        # Ignore tiny regions
        if count < 100:
            continue

        # Ignore regions touching image boundary
        touches_edge = (
            min_x == 0 or
            min_y == 0 or
            max_x == width - 1 or
            max_y == height - 1
        )

        if touches_edge:
            continue

        region_values = np.array(
            [data[py, px] for py, px in pixels],
            dtype=np.float32
        )

        region_width = max_x - min_x + 1
        region_height = max_y - min_y + 1

        aspect_ratio = max(region_width, region_height) / max(
            1, min(region_width, region_height)
        )

        darkness = 1 - (
            float(region_values.mean()) /
            float(np.median(data))
        )

        darkness = max(0.0, min(1.0, darkness))

        # Shape factor: elongated regions get some preference,
        # but extreme thin noise is penalized.
        if aspect_ratio <= 8:
            shape_score = min(aspect_ratio / 3, 1.0)
        else:
            shape_score = 0.3

        size_score = min(count / 3000, 1.0)

        candidate_score = (
            size_score * 0.40 +
            darkness * 0.35 +
            shape_score * 0.25
        )

        regions.append({
            "pixels": count,
            "width": region_width,
            "height": region_height,
            "aspect_ratio": aspect_ratio,
            "mean": float(region_values.mean()),
            "darkness": darkness,
            "score": candidate_score,
            "center_x": (min_x + max_x) / 2,
            "center_y": (min_y + max_y) / 2
        })

regions.sort(key=lambda r: r["score"], reverse=True)

print("VV MEDIAN:", round(float(np.median(data)), 2))
print("DARK THRESHOLD:", round(float(threshold), 2))
print("EDGE-FILTERED CANDIDATES:", len(regions))

print()
print("TOP 10 OIL-SPILL CANDIDATE REGIONS")
print("-" * 75)

for i, r in enumerate(regions[:10], 1):
    print(
        f"{i}. "
        f"score={r['score']*100:.1f}% | "
        f"pixels={r['pixels']} | "
        f"bbox={r['width']}x{r['height']} | "
        f"aspect={r['aspect_ratio']:.2f} | "
        f"mean={r['mean']:.1f} | "
        f"darkness={r['darkness']*100:.1f}% | "
        f"center=({r['center_x']:.1f},{r['center_y']:.1f})"
    )
