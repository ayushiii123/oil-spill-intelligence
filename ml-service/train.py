import os
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms
from collections import Counter


# =========================================================
# CONFIG
# =========================================================

DATASET_DIR = "data/dataset"
MODEL_DIR = "models"
MODEL_PATH = "models/oil_spill_classifier.pth"

IMAGE_SIZE = 128
BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001

TEST_MODE = False
TEST_SUBSET_SIZE = 400

VALIDATION_SPLIT = 0.20
SEED = 42

# Best checkpoint tracking
BEST_F1 = -1.0
BEST_EPOCH = 0


# =========================================================
# REPRODUCIBILITY
# =========================================================

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


# =========================================================
# DEVICE
# =========================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 60)
print("OIL SPILL CLASSIFIER TRAINING")
print("=" * 60)
print("Device:", DEVICE)
print("Dataset:", DATASET_DIR)
print("Image size:", f"{IMAGE_SIZE}x{IMAGE_SIZE}")
print("Batch size:", BATCH_SIZE)
print("Epochs:", EPOCHS)


# =========================================================
# TRANSFORMS
# =========================================================

# Augmentation is used only during training.
train_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])


# Validation must remain deterministic.
validation_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])


# =========================================================
# DATASET
# =========================================================

train_full_dataset = datasets.ImageFolder(
    DATASET_DIR,
    transform=train_transform
)

validation_full_dataset = datasets.ImageFolder(
    DATASET_DIR,
    transform=validation_transform
)

# Keep this as the reference dataset for labels/classes.
dataset = train_full_dataset

print("\nClasses:")
print(dataset.class_to_idx)

total_images = len(dataset)

print("Total available images:", total_images)


# =========================================================
# CREATE WORKING SUBSET
# =========================================================

all_indices = list(range(total_images))

if TEST_MODE:

    print(
        f"\nTest mode enabled: using "
        f"{TEST_SUBSET_SIZE} images"
    )

    labels = np.array(
        dataset.targets
    )

    class_0_indices = np.where(
        labels == 0
    )[0].tolist()

    class_1_indices = np.where(
        labels == 1
    )[0].tolist()

    random.shuffle(class_0_indices)
    random.shuffle(class_1_indices)

    original_class_0 = len(
        class_0_indices
    )

    original_class_1 = len(
        class_1_indices
    )

    ratio_0 = (
        original_class_0 /
        (
            original_class_0 +
            original_class_1
        )
    )

    subset_class_0 = int(
        TEST_SUBSET_SIZE *
        ratio_0
    )

    subset_class_1 = (
        TEST_SUBSET_SIZE -
        subset_class_0
    )

    selected_indices = (
        class_0_indices[:subset_class_0]
        +
        class_1_indices[:subset_class_1]
    )

    random.shuffle(
        selected_indices
    )

    working_indices = selected_indices

else:

    working_indices = all_indices


# =========================================================
# STRATIFIED TRAIN / VALIDATION SPLIT
# =========================================================

labels = np.array(
    dataset.targets
)

class_0_indices = [
    i
    for i in working_indices
    if labels[i] == 0
]

class_1_indices = [
    i
    for i in working_indices
    if labels[i] == 1
]

random.shuffle(
    class_0_indices
)

random.shuffle(
    class_1_indices
)

validation_0_size = int(
    len(class_0_indices) *
    VALIDATION_SPLIT
)

validation_1_size = int(
    len(class_1_indices) *
    VALIDATION_SPLIT
)

validation_indices = (
    class_0_indices[:validation_0_size]
    +
    class_1_indices[:validation_1_size]
)

training_indices = (
    class_0_indices[validation_0_size:]
    +
    class_1_indices[validation_1_size:]
)

random.shuffle(
    training_indices
)

random.shuffle(
    validation_indices
)


# =========================================================
# CREATE SUBSETS
# =========================================================

train_dataset = Subset(
    train_full_dataset,
    training_indices
)

validation_dataset = Subset(
    validation_full_dataset,
    validation_indices
)

print(
    "Training images:",
    len(train_dataset)
)

print(
    "Validation images:",
    len(validation_dataset)
)


# =========================================================
# CLASS DISTRIBUTION
# =========================================================

train_labels = [
    dataset.targets[i]
    for i in training_indices
]

class_counts = Counter(
    train_labels
)

print(
    "\nTraining class distribution:"
)

print(
    "Class 0 (No Oil):",
    class_counts.get(0, 0)
)

print(
    "Class 1 (Oil):",
    class_counts.get(1, 0)
)


# =========================================================
# CLASS WEIGHTS
# =========================================================

num_class_0 = class_counts.get(
    0,
    0
)

num_class_1 = class_counts.get(
    1,
    0
)

if num_class_0 == 0 or num_class_1 == 0:
    raise RuntimeError(
        "Both classes must contain training samples."
    )

total_train = (
    num_class_0 +
    num_class_1
)

num_classes = 2

weight_0 = (
    total_train /
    (
        num_classes *
        num_class_0
    )
)

weight_1 = (
    total_train /
    (
        num_classes *
        num_class_1
    )
)

class_weights = torch.tensor(
    [
        weight_0,
        weight_1
    ],
    dtype=torch.float32
).to(DEVICE)

print(
    "\nClass weights:"
)

print(
    "Class 0:",
    round(weight_0, 4)
)

print(
    "Class 1:",
    round(weight_1, 4)
)


# =========================================================
# DATA LOADERS
# =========================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0
)

validation_loader = DataLoader(
    validation_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0
)


# =========================================================
# MODEL
# =========================================================

class OilSpillCNN(nn.Module):

    def __init__(self):
        super().__init__()

        self.features = nn.Sequential(

            nn.Conv2d(
                1,
                16,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(16),

            nn.ReLU(),

            nn.MaxPool2d(2),

            nn.Conv2d(
                16,
                32,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(32),

            nn.ReLU(),

            nn.MaxPool2d(2),

            nn.Conv2d(
                32,
                64,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(64),

            nn.ReLU(),

            nn.MaxPool2d(2),

            nn.Conv2d(
                64,
                128,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(128),

            nn.ReLU(),

            nn.AdaptiveAvgPool2d(
                (1, 1)
            )
        )

        self.classifier = nn.Sequential(

            nn.Flatten(),

            nn.Linear(
                128,
                64
            ),

            nn.ReLU(),

            nn.Dropout(0.30),

            nn.Linear(
                64,
                2
            )
        )

    def forward(self, x):

        x = self.features(x)

        x = self.classifier(x)

        return x


model = OilSpillCNN().to(
    DEVICE
)

print("\nModel:")
print(model)


# =========================================================
# LOSS + OPTIMIZER
# =========================================================

criterion = nn.CrossEntropyLoss(
    weight=class_weights
)

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE
)


# =========================================================
# TRAINING
# =========================================================

for epoch in range(EPOCHS):

    model.train()

    running_loss = 0.0

    correct = 0
    total = 0

    for images, batch_labels in train_loader:

        images = images.to(
            DEVICE
        )

        batch_labels = batch_labels.to(
            DEVICE
        )

        optimizer.zero_grad()

        outputs = model(
            images
        )

        loss = criterion(
            outputs,
            batch_labels
        )

        loss.backward()

        optimizer.step()

        running_loss += (
            loss.item()
        )

        _, predicted = torch.max(
            outputs,
            1
        )

        total += (
            batch_labels.size(0)
        )

        correct += (
            predicted ==
            batch_labels
        ).sum().item()

    training_accuracy = (
        100 *
        correct /
        total
    )

    average_loss = (
        running_loss /
        len(train_loader)
    )


    # =====================================================
    # VALIDATION
    # =====================================================

    model.eval()

    true_positive = 0
    true_negative = 0
    false_positive = 0
    false_negative = 0

    validation_correct = 0
    validation_total = 0

    with torch.no_grad():

        for images, batch_labels in validation_loader:

            images = images.to(
                DEVICE
            )

            batch_labels = batch_labels.to(
                DEVICE
            )

            outputs = model(
                images
            )

            _, predicted = torch.max(
                outputs,
                1
            )

            validation_total += (
                batch_labels.size(0)
            )

            validation_correct += (
                predicted ==
                batch_labels
            ).sum().item()


            # =================================================
            # CONFUSION MATRIX
            # =================================================

            true_positive += (
                (predicted == 1)
                &
                (batch_labels == 1)
            ).sum().item()

            true_negative += (
                (predicted == 0)
                &
                (batch_labels == 0)
            ).sum().item()

            false_positive += (
                (predicted == 1)
                &
                (batch_labels == 0)
            ).sum().item()

            false_negative += (
                (predicted == 0)
                &
                (batch_labels == 1)
            ).sum().item()


    validation_accuracy = (
        100 *
        validation_correct /
        validation_total
    )


    # =====================================================
    # PRECISION / RECALL / F1
    # =====================================================

    precision = (
        true_positive /
        (
            true_positive +
            false_positive
        )
        if (
            true_positive +
            false_positive
        ) > 0
        else 0
    )

    recall = (
        true_positive /
        (
            true_positive +
            false_negative
        )
        if (
            true_positive +
            false_negative
        ) > 0
        else 0
    )

    f1 = (
        2 *
        precision *
        recall /
        (
            precision +
            recall
        )
        if (
            precision +
            recall
        ) > 0
        else 0
    )


    # =====================================================
    # PRINT CURRENT EPOCH RESULTS
    # =====================================================

    print(
        "\n" + "-" * 60
    )

    print(
        f"Epoch {epoch + 1}/{EPOCHS}"
    )

    print(
        "-" * 60
    )

    print(
        f"Training Loss: "
        f"{average_loss:.4f}"
    )

    print(
        f"Training Accuracy: "
        f"{training_accuracy:.2f}%"
    )

    print(
        f"Validation Accuracy: "
        f"{validation_accuracy:.2f}%"
    )

    print(
        f"Precision (Oil): "
        f"{precision * 100:.2f}%"
    )

    print(
        f"Recall (Oil): "
        f"{recall * 100:.2f}%"
    )

    print(
        f"F1 Score (Oil): "
        f"{f1 * 100:.2f}%"
    )

    print(
        "\nConfusion Matrix:"
    )

    print(
        f"True Negative : "
        f"{true_negative}"
    )

    print(
        f"False Positive: "
        f"{false_positive}"
    )

    print(
        f"False Negative: "
        f"{false_negative}"
    )

    print(
        f"True Positive : "
        f"{true_positive}"
    )


    # =====================================================
    # BEST MODEL CHECKPOINT
    # =====================================================

    if f1 > BEST_F1:

        BEST_F1 = f1

        BEST_EPOCH = (
            epoch + 1
        )

        os.makedirs(
            MODEL_DIR,
            exist_ok=True
        )

        torch.save(
            model.state_dict(),
            MODEL_PATH
        )

        print(
            f"\n✅ Best model updated "
            f"at Epoch {BEST_EPOCH}"
        )

        print(
            f"Best Validation F1: "
            f"{BEST_F1 * 100:.2f}%"
        )


# =========================================================
# TRAINING COMPLETE
# =========================================================

print(
    "\n" + "=" * 60
)

print(
    "TRAINING COMPLETE"
)

print(
    "=" * 60
)

print(
    f"Best Epoch: "
    f"{BEST_EPOCH}"
)

print(
    f"Best Validation F1: "
    f"{BEST_F1 * 100:.2f}%"
)

print(
    "Best model saved at:"
)

print(
    MODEL_PATH
)