from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image
import rasterio
import torch
import torch.nn as nn
from torchvision import transforms
import io
import os
import numpy as np
from rasterio.warp import transform as transform_coords
from rasterio.transform import xy


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Oil Spill Intelligence ML Service"
)


# =========================================================
# CONFIG
# =========================================================

MODEL_PATH = "models/oil_spill_classifier.pth"
IMAGE_SIZE = 128

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# =========================================================
# MODEL
# =========================================================

class OilSpillCNN(nn.Module):

    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(

            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1))
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(128, 64),

            nn.ReLU(),

            nn.Dropout(0.30),

            nn.Linear(64, 2)
        )

    def forward(self, x):

        x = self.features(x)

        x = self.classifier(x)

        return x


# =========================================================
# LOAD MODEL
# =========================================================

model = OilSpillCNN().to(DEVICE)

if not os.path.exists(MODEL_PATH):

    raise RuntimeError(
        f"Trained model not found at: {MODEL_PATH}"
    )


model.load_state_dict(
    torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )
)

model.eval()


# =========================================================
# IMAGE TRANSFORM
# =========================================================

transform = transforms.Compose([

    transforms.Grayscale(
        num_output_channels=1
    ),

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        (0.5,),
        (0.5,)
    )
])


# =========================================================
# SPILL GEOMETRY
# Image-space analysis only
# =========================================================

def calculate_spill_geometry(image):

    # Convert image to grayscale
    gray = image.convert("L")

    gray_array = np.array(gray, dtype=np.float32)

    height, width = gray_array.shape

    # -----------------------------------------------------
    # Adaptive threshold
    #
    # Oil-like regions in SAR imagery are generally darker.
    # We use a percentile-based threshold instead of a fixed
    # brightness value so different images can be handled.
    # -----------------------------------------------------

    threshold = float(
        np.percentile(gray_array, 30)
    )

    mask = gray_array <= threshold

    # -----------------------------------------------------
    # Remove very small isolated regions
    # -----------------------------------------------------

    min_pixels = max(
        20,
        int(height * width * 0.0005)
    )

    # Connected-component search
    visited = np.zeros(
        mask.shape,
        dtype=bool
    )

    components = []

    for y in range(height):

        for x in range(width):

            if not mask[y, x] or visited[y, x]:
                continue

            stack = [(y, x)]
            visited[y, x] = True

            pixels = []

            while stack:

                cy, cx = stack.pop()

                pixels.append(
                    (cy, cx)
                )

                for dy, dx in (
                    (-1, 0),
                    (1, 0),
                    (0, -1),
                    (0, 1)
                ):

                    ny = cy + dy
                    nx = cx + dx

                    if (
                        0 <= ny < height
                        and 0 <= nx < width
                        and mask[ny, nx]
                        and not visited[ny, nx]
                    ):

                        visited[ny, nx] = True

                        stack.append(
                            (ny, nx)
                        )

            if len(pixels) >= min_pixels:

                components.append(
                    pixels
                )

    # -----------------------------------------------------
    # No meaningful region found
    # -----------------------------------------------------

    if not components:

        return {
            "available": False,
            "reason": "No significant dark region detected."
        }

    # Largest connected dark region
    largest = max(
        components,
        key=len
    )

    points = np.array(
        largest,
        dtype=np.float32
    )

    # points columns:
    # 0 = y
    # 1 = x

    ys = points[:, 0]
    xs = points[:, 1]

    area_pixels = len(points)

    # -----------------------------------------------------
    # Bounding box
    # -----------------------------------------------------

    min_x = float(xs.min())
    max_x = float(xs.max())

    min_y = float(ys.min())
    max_y = float(ys.max())

    bbox_width = max_x - min_x + 1
    bbox_height = max_y - min_y + 1

    # -----------------------------------------------------
    # PCA for principal orientation
    # -----------------------------------------------------

    centered = np.column_stack(
        (
            xs - xs.mean(),
            ys - ys.mean()
        )
    )

    if len(centered) >= 2:

        covariance = np.cov(
            centered,
            rowvar=False
        )

        eigenvalues, eigenvectors = np.linalg.eigh(
            covariance
        )

        principal_vector = eigenvectors[
            :, np.argmax(eigenvalues)
        ]

        vx = principal_vector[0]
        vy = principal_vector[1]

        orientation = np.degrees(
            np.arctan2(
                vy,
                vx
            )
        )

        # Convert to 0-180°
        orientation = orientation % 180

    else:

        orientation = 0.0

    # -----------------------------------------------------
    # Approximate length / width in pixels
    # -----------------------------------------------------

    covariance_values = np.linalg.eigvalsh(
        covariance
    )

    covariance_values = np.maximum(
        covariance_values,
        0
    )

    # Standard deviation based dimensions
    dimensions = (
        4 * np.sqrt(covariance_values)
    )

    width_pixel = float(
        dimensions[0]
    )

    length_pixel = float(
        dimensions[1]
    )

    # Ensure length >= width
    if width_pixel > length_pixel:

        length_pixel, width_pixel = (
            width_pixel,
            length_pixel
        )

    # -----------------------------------------------------
    # Centroid
    # -----------------------------------------------------

    centroid_x = float(
        xs.mean()
    )

    centroid_y = float(
        ys.mean()
    )

    # -----------------------------------------------------
    # Relative area percentage
    # -----------------------------------------------------

    image_pixels = width * height

    area_percentage = (
        area_pixels / image_pixels
    ) * 100

    return {

        "available": True,

        "coordinateSystem": "image_pixels",

        "areaPixels": area_pixels,

        "areaPercentage": round(
            area_percentage,
            2
        ),

        "lengthPixels": round(
            length_pixel,
            2
        ),

        "widthPixels": round(
            width_pixel,
            2
        ),

        "orientationDegrees": round(
            float(orientation),
            2
        ),

        "centroidPixels": {

            "x": round(
                centroid_x,
                2
            ),

            "y": round(
                centroid_y,
                2
            )
        },

        "boundingBoxPixels": {

            "minX": round(
                min_x,
                2
            ),

            "minY": round(
                min_y,
                2
            ),

            "maxX": round(
                max_x,
                2
            ),

            "maxY": round(
                max_y,
                2
            )
        },

        "threshold": round(
            threshold,
            2
        ),

        "note":
            "Geometry is estimated in image pixels. "
            "Physical km and km² require georeferenced "
            "satellite scene metadata."
    }


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "oil-spill-ml-service",
        "model": "OilSpillCNN",
        "model_loaded": True,
        "device": str(DEVICE)
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": True,
        "device": str(DEVICE)
    }


# =========================================================
# DETECTION
# =========================================================
@app.post("/detect")
async def detect(
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    allowed_extensions = (
        ".jpg",
        ".jpeg",
        ".png",
        ".tif",
        ".tiff",
    )

    filename = (file.filename or "").lower()

    if not filename.endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, PNG and TIFF images are supported."
        )

    # -----------------------------------------------------
    # Read uploaded file
    # -----------------------------------------------------

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    # -----------------------------------------------------
    # Geospatial metadata defaults
    # -----------------------------------------------------

    source_crs = None
    source_transform = None
    source_bounds = None

    # -----------------------------------------------------
    # Read image
    # Supports normal images + Sentinel-1 TIFF
    # -----------------------------------------------------

    try:

        if filename.endswith((".tif", ".tiff")):

            with rasterio.MemoryFile(image_bytes) as memfile:

                with memfile.open() as dataset:

                    raster = dataset.read(1)

                    # Real Sentinel-1 geospatial metadata
                    source_crs = dataset.crs
                    source_transform = dataset.transform
                    source_bounds = dataset.bounds

                    # Convert scientific SAR values to
                    # 8-bit grayscale for CNN preprocessing.
                    raster = raster.astype(np.float32)

                    low = np.percentile(raster, 2)
                    high = np.percentile(raster, 98)

                    if high <= low:
                        raise ValueError(
                            "TIFF contains insufficient intensity variation."
                        )

                    raster = np.clip(
                        raster,
                        low,
                        high
                    )

                    raster = (
                        (raster - low)
                        / (high - low)
                        * 255.0
                    )

                    raster = raster.astype(np.uint8)

                    image = Image.fromarray(
                        raster,
                        mode="L"
                    )

        else:

            image = Image.open(
                io.BytesIO(image_bytes)
            )

            image.load()

    except Exception as error:

        print(
            "IMAGE READ ERROR:",
            repr(error)
        )

        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file: {error}"
        )

    # -----------------------------------------------------
    # Original image dimensions
    # -----------------------------------------------------

    original_width, original_height = image.size

    # -----------------------------------------------------
    # CNN preprocessing
    # -----------------------------------------------------

    tensor = transform(image)

    tensor = tensor.unsqueeze(0)

    tensor = tensor.to(DEVICE)

    # -----------------------------------------------------
    # MODEL PREDICTION
    # -----------------------------------------------------

    with torch.no_grad():

        outputs = model(tensor)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        confidence, predicted_class = torch.max(
            probabilities,
            dim=1
        )

    predicted_class = predicted_class.item()
    confidence = confidence.item()

    # class_0 = No Oil
    # class_1 = Oil

    if predicted_class == 1:

        detected = True
        classification = "oil_spill"

    else:

        detected = False
        classification = "no_oil"

    # -----------------------------------------------------
    # Probabilities
    # -----------------------------------------------------

    no_oil_probability = probabilities[
        0, 0
    ].item()

    oil_probability = probabilities[
        0, 1
    ].item()

    # -----------------------------------------------------
    # Spill geometry
    # Only calculate when CNN detects oil
    # -----------------------------------------------------

    if detected:

        geometry = calculate_spill_geometry(
            image
        )

    else:

        geometry = {
            "available": False,
            "reason": "Oil spill was not detected by the classifier."
        }

    # -----------------------------------------------------
    # Geospatial information
    # -----------------------------------------------------

    geospatial = {
        "available": source_crs is not None,
        "crs": str(source_crs) if source_crs else None,
        "bounds": None,
        "imageCenter": None,
        "spillCentroid": None,
    }

    # -----------------------------------------------------
    # Convert image center to WGS84
    # -----------------------------------------------------

    if source_crs is not None and source_bounds is not None:

        center_x = (
            source_bounds.left +
            source_bounds.right
        ) / 2

        center_y = (
            source_bounds.bottom +
            source_bounds.top
        ) / 2

        geospatial["bounds"] = {
            "left": float(source_bounds.left),
            "bottom": float(source_bounds.bottom),
            "right": float(source_bounds.right),
            "top": float(source_bounds.top),
        }

        try:

            center_lon, center_lat = transform_coords(
                source_crs,
                "EPSG:4326",
                [center_x],
                [center_y]
            )

            geospatial["imageCenter"] = {
                "latitude": float(center_lat[0]),
                "longitude": float(center_lon[0]),
            }

        except Exception as error:

            print(
                "CENTER COORDINATE ERROR:",
                repr(error)
            )

    # -----------------------------------------------------
    # Convert detected spill centroid to WGS84
    # -----------------------------------------------------

    if (
        detected
        and geometry.get("available")
        and source_crs is not None
        and source_transform is not None
    ):

        try:

            pixel_x = geometry["centroidPixels"]["x"]
            pixel_y = geometry["centroidPixels"]["y"]

            map_x, map_y = xy(
                source_transform,
                pixel_y,
                pixel_x,
                offset="center"
            )

            spill_lon, spill_lat = transform_coords(
                source_crs,
                "EPSG:4326",
                [map_x],
                [map_y]
            )

            geospatial["spillCentroid"] = {
                "latitude": float(spill_lat[0]),
                "longitude": float(spill_lon[0]),
            }

        except Exception as error:

            print(
                "SPILL CENTROID GEOLOCATION ERROR:",
                repr(error)
            )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {

        "success": True,

        "message":
            "Satellite SAR image analyzed using trained CNN model.",

        "model": {

            "name": "OilSpillCNN",

            "type": "binary_image_classifier",

            "device": str(DEVICE)
        },

        "image": {

            "filename": file.filename,

            "width": original_width,

            "height": original_height,

            "format": image.format
        },

        "detected": detected,

        "classification": classification,

        "confidence": round(
            confidence,
            4
        ),

        "probabilities": {

            "noOil": round(
                no_oil_probability,
                4
            ),

            "oil": round(
                oil_probability,
                4
            )
        },

        "geometry": geometry,

        "geospatial": geospatial
    }