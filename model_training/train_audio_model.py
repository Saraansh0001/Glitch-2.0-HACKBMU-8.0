from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Dense, Dropout, Input
from tensorflow.keras.models import Sequential


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_OUT = PROJECT_ROOT / "backend" / "trained_models" / "audio_anomaly_model.keras"


def build_audio_classifier(input_dim: int = 1024):
	model = Sequential(
		[
			Input(shape=(input_dim,)),
			Dense(256, activation="relu"),
			Dropout(0.3),
			Dense(64, activation="relu"),
			Dropout(0.2),
			Dense(1, activation="sigmoid"),
		]
	)
	model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
	return model


def main() -> None:
	rng = np.random.default_rng(7)
	x_real = rng.normal(0.3, 0.2, size=(200, 1024)).astype(np.float32)
	x_fake = rng.normal(0.7, 0.2, size=(200, 1024)).astype(np.float32)
	x = np.concatenate([x_real, x_fake], axis=0)
	y = np.concatenate([np.zeros(200), np.ones(200)], axis=0).astype(np.float32)

	model = build_audio_classifier(1024)
	model.fit(x, y, epochs=8, batch_size=16, validation_split=0.2, verbose=1)
	MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
	model.save(MODEL_OUT)
	print(f"Saved audio model to: {MODEL_OUT}")


if __name__ == "__main__":
	main()

