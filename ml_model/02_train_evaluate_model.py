from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import joblib
import lightgbm as lgb
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 42
TEST_SIZE = 0.2
TARGET_COLUMN = "converted"

DATA_DIR = Path(__file__).resolve().parent
DATA_PATH = DATA_DIR / "synthetic_sales_leads.csv"
ROC_PLOT_PATH = DATA_DIR / "roc_curve.png"
FEATURE_IMPORTANCE_PLOT_PATH = DATA_DIR / "lightgbm_feature_importance.png"
MODEL_OUTPUT_PATH = DATA_DIR / "lightgbm_model.pkl"
METRICS_OUTPUT_PATH = DATA_DIR / "model_metrics.csv"

NUMERIC_FEATURES = [
    "rating",
    "user_ratings_total",
    "deal_value",
    "time_in_pipeline",
    "documents_verified_count",
    "contacts_count",
]
CATEGORICAL_FEATURES = [
    "business_type",
    "priority",
]


def build_one_hot_encoder() -> OneHotEncoder:
    """Build an OneHotEncoder that returns dense arrays across sklearn versions."""
    try:  # scikit-learn >= 1.2
        return OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:  # scikit-learn < 1.2
        return OneHotEncoder(handle_unknown="ignore", sparse=False)


def build_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(steps=[("scaler", StandardScaler())])
    categorical_transformer = build_one_hot_encoder()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )
    preprocessor.set_output(transform="pandas")
    return preprocessor


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            "Dataset not found. Please run 01_generate_dataset.py before training."
        )
    return pd.read_csv(path)


def evaluate_model(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> Tuple[Dict[str, float], np.ndarray]:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1_score": f1_score(y_test, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_test, y_prob),
    }
    return metrics, y_prob


def plot_roc_curves(roc_data: Dict[str, Tuple[np.ndarray, np.ndarray, float]]) -> None:
    plt.figure(figsize=(8, 6))
    for label, (fpr, tpr, auc_score) in roc_data.items():
        plt.plot(fpr, tpr, label=f"{label} (AUC = {auc_score:.3f})")

    plt.plot([0, 1], [0, 1], "k--", label="Chance")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curves")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(ROC_PLOT_PATH, dpi=300)
    plt.close()


def plot_feature_importance(model: Pipeline) -> pd.DataFrame:
    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["classifier"]

    feature_names = preprocessor.get_feature_names_out()
    importances = classifier.feature_importances_

    feature_importance_df = (
        pd.DataFrame({"feature": feature_names, "importance": importances})
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )

    top_n = feature_importance_df.head(20)

    plt.figure(figsize=(10, 8))
    bar_color = sns.color_palette("viridis", 1)[0]
    sns.barplot(data=top_n, x="importance", y="feature", color=bar_color)
    plt.title("LightGBM Feature Importance (Top 20 Features)")
    plt.xlabel("Importance")
    plt.ylabel("Feature")
    plt.tight_layout()
    plt.savefig(FEATURE_IMPORTANCE_PLOT_PATH, dpi=300)
    plt.close()

    return feature_importance_df


def main() -> None:
    sns.set_theme(style="whitegrid")

    print("Loading dataset...")
    df = load_dataset(DATA_PATH)

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    preprocessor = build_preprocessor()

    models: Dict[str, Pipeline] = {
        "Dummy Classifier": Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    DummyClassifier(strategy="stratified", random_state=RANDOM_STATE),
                ),
            ]
        ),
        "Logistic Regression": Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=1000,
                        random_state=RANDOM_STATE,
                        class_weight="balanced",
                    ),
                ),
            ]
        ),
        "LightGBM": Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    lgb.LGBMClassifier(
                        random_state=RANDOM_STATE,
                        n_estimators=300,
                        learning_rate=0.05,
                        class_weight="balanced",
                    ),
                ),
            ]
        ),
    }

    metrics_output = []
    roc_plot_data: Dict[str, Tuple[np.ndarray, np.ndarray, float]] = {}

    print("Training and evaluating models...")
    for model_name, pipeline in models.items():
        print(f"\n--- {model_name} ---")
        pipeline.fit(X_train, y_train)
        metrics, y_prob = evaluate_model(pipeline, X_test, y_test)
        for metric_name, metric_value in metrics.items():
            print(f"{metric_name.title()}: {metric_value:.4f}")

        fpr, tpr, _ = roc_curve(y_test, y_prob)
        roc_plot_data[model_name] = (fpr, tpr, metrics["roc_auc"])

        metrics_output.append({"model": model_name, **metrics})

    metrics_df = pd.DataFrame(metrics_output)
    metrics_df.to_csv(METRICS_OUTPUT_PATH, index=False)
    print(f"\nMetrics saved to {METRICS_OUTPUT_PATH}")

    plot_roc_curves(roc_plot_data)
    print(f"ROC curve saved to {ROC_PLOT_PATH}")

    lightgbm_model = models["LightGBM"]
    feature_importance_df = plot_feature_importance(lightgbm_model)
    feature_importance_df.to_csv(DATA_DIR / "lightgbm_feature_importance.csv", index=False)
    print(f"Feature importance plot saved to {FEATURE_IMPORTANCE_PLOT_PATH}")

    joblib.dump(lightgbm_model, MODEL_OUTPUT_PATH)
    print(f"Trained LightGBM model saved to {MODEL_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
