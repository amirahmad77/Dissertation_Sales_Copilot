from pathlib import Path

import numpy as np
import pandas as pd

# --- Configuration ---
NUM_LEADS = 10000
BASE_CONVERSION_RATE = 0.10  # Base probability of a lead converting
OUTPUT_FILE = Path(__file__).resolve().parent / "synthetic_sales_leads.csv"

# --- Define Feature Distributions ---
BUSINESS_TYPES = ["Restaurant", "Retail", "Services"]
PRIORITY_LEVELS = ["Low", "Medium", "High"]


# --- Helper function to create realistic noise ---
def add_noise(data, noise_level=0.1):
    """Adds random noise to a NumPy array."""
    noise = np.random.normal(0, noise_level, data.shape)
    return data + noise


def generate_synthetic_data():
    """Generate a synthetic dataset of sales leads and save it to a CSV file."""
    print(f"Generating {NUM_LEADS} synthetic leads...")

    # --- Generate Base Features ---
    data = {
        "business_type": np.random.choice(BUSINESS_TYPES, NUM_LEADS, p=[0.5, 0.3, 0.2]),
        "rating": np.random.uniform(3.0, 5.0, NUM_LEADS).round(1),
        "user_ratings_total": np.random.randint(10, 1000, NUM_LEADS),
        "deal_value": np.random.lognormal(mean=8.5, sigma=0.8, size=NUM_LEADS).round(0),
        "priority": np.random.choice(PRIORITY_LEVELS, NUM_LEADS, p=[0.3, 0.5, 0.2]),
        "time_in_pipeline": np.random.randint(1, 90, NUM_LEADS),
        "documents_verified_count": np.random.randint(0, 7, NUM_LEADS),
        "contacts_count": np.random.randint(1, 5, NUM_LEADS),
    }
    df = pd.DataFrame(data)

    # --- Engineer the Conversion Probability ---
    # Start with a base probability and add effects from features
    conversion_probability = np.full(NUM_LEADS, BASE_CONVERSION_RATE)

    # Higher deal value increases probability
    conversion_probability += (df["deal_value"] / df["deal_value"].max()) * 0.20

    # Higher rating and more reviews increase probability
    conversion_probability += (df["rating"] / 5.0) * 0.10
    conversion_probability += (df["user_ratings_total"] / df["user_ratings_total"].max()) * 0.05

    # More verified documents significantly increase probability
    conversion_probability += (df["documents_verified_count"] / 6.0) * 0.25

    # High priority increases probability, Low decreases it
    priority_map = {"Low": -0.05, "Medium": 0.05, "High": 0.15}
    conversion_probability += df["priority"].map(priority_map).values

    # Restaurant business type has a slightly higher chance
    conversion_probability[df["business_type"] == "Restaurant"] += 0.05

    # Time in pipeline has a non-linear effect (sweet spot around 30-60 days)
    conversion_probability -= ((df["time_in_pipeline"] - 45) / 45).abs() * 0.05

    # Add random noise to make it less deterministic
    conversion_probability = add_noise(conversion_probability, noise_level=0.1)

    # Clip probabilities to be between 0.01 and 0.99
    conversion_probability = np.clip(conversion_probability, 0.01, 0.99)

    # --- Generate Final 'converted' Target Variable ---
    df["converted"] = (np.random.rand(NUM_LEADS) < conversion_probability).astype(int)

    # --- Save to CSV ---
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Dataset saved to {OUTPUT_FILE}")
    print("\n--- Dataset Info ---")
    print(df.info())
    print("\n--- Conversion Rate ---")
    print(df["converted"].value_counts(normalize=True))
    print("\n--- Sample Data ---")
    print(df.head())


if __name__ == "__main__":
    generate_synthetic_data()
