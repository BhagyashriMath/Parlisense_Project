"""Train the chamber person detector used by VisionTracker.

Dataset layout:
  ml/data/vision/images/train/*.jpg
  ml/data/vision/images/val/*.jpg
  ml/data/vision/labels/train/*.txt
  ml/data/vision/labels/val/*.txt

Each label uses YOLO format: ``class x_center y_center width height``.
Run after installing the ML requirements:
  python3 ml/train_vision.py --epochs 50
"""

import argparse
import os
import shutil


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--model", default="yolo11n.pt")
    args = parser.parse_args()

    dataset_root = os.path.join("ml", "data", "vision")
    required = [
        os.path.join(dataset_root, "images", "train"),
        os.path.join(dataset_root, "images", "val"),
        os.path.join(dataset_root, "labels", "train"),
        os.path.join(dataset_root, "labels", "val")
    ]
    missing = [path for path in required if not os.path.isdir(path)]
    if missing:
        raise SystemExit("Missing labelled vision folders:\n" + "\n".join(missing))

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise SystemExit("Install ml/requirements.txt before training the vision model") from exc

    model = YOLO(args.model)
    result = model.train(
        data=os.path.join(dataset_root, "..", "vision.yaml"),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=os.path.join("ml", "runs"),
        name="parliament-seat-detector",
        pretrained=True,
    )
    best = os.path.join(str(result.save_dir), "weights", "best.pt")
    destination = os.path.join("ml", "models", "yolo11n.pt")
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    shutil.copy2(best, destination)
    print(f"saved trained vision model to {destination}")


if __name__ == "__main__":
    main()
