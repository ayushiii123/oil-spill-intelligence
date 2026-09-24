import rasterio
import numpy as np

path = r".\sentinel1_vv_chip.tiff"

with rasterio.open(path) as src:
    data = src.read(1).astype(np.float32)

data = data[np.isfinite(data)]

print("PIXELS:", data.size)
print("MIN:", float(data.min()))
print("MAX:", float(data.max()))
print("MEAN:", float(data.mean()))
print("MEDIAN:", float(np.median(data)))
print("P01:", float(np.percentile(data, 1)))
print("P05:", float(np.percentile(data, 5)))
print("P10:", float(np.percentile(data, 10)))
print("P25:", float(np.percentile(data, 25)))
print("P50:", float(np.percentile(data, 50)))
print("P75:", float(np.percentile(data, 75)))
print("P90:", float(np.percentile(data, 90)))
print("P95:", float(np.percentile(data, 95)))
print("P99:", float(np.percentile(data, 99)))

threshold = np.percentile(data, 10)
dark_pixels = np.sum(data <= threshold)
dark_percent = (dark_pixels / data.size) * 100

print()
print("DARK THRESHOLD (P10):", float(threshold))
print("DARK PIXELS:", int(dark_pixels))
print("DARK PIXEL %:", round(float(dark_percent), 2))
