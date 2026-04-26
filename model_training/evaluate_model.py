from pathlib import Path

import numpy as np
from tensorflow.keras.models import load_model


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "backend" / "trained_models" / "lstm_deepfake_detector.keras"


def main() -> None:
	if not MODEL_PATH.exists():
		print(f"Model not found: {MODEL_PATH}")
		return

	model = load_model(MODEL_PATH)
	x = np.random.random((16, 20, 2048)).astype(np.float32)
	y = np.random.randint(0, 2, size=(16,)).astype(np.float32)
	metrics = model.evaluate(x, y, verbose=0)
	print("Evaluation metrics:", metrics)
	print("Model summary:")
	model.summary()


if __name__ == "__main__":
	main()

