"""
clustering.py
-------------
Implements skewed feature transformation (log1p), StandardScaler normalization,
Elbow Method inertia evaluation, Silhouette Score calculation, and K-Means clustering
on customer RFM profiles.
"""

from typing import Dict, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


def prepare_features_for_clustering(rfm_df: pd.DataFrame) -> Tuple[np.ndarray, pd.DataFrame]:
    """
    Prepare Recency, Frequency, and Monetary features for K-Means:
      1. Apply log1p transformation to reduce right-skewness in monetary/frequency/recency
         (since K-Means relies on Euclidean distance and works best on symmetric scales).
      2. Standardize all three features to mean=0, std=1 using StandardScaler.
    """
    rfm_features = rfm_df[["Recency", "Frequency", "Monetary"]].copy()
    # Ensure non-negative inputs before log1p
    rfm_log = np.log1p(rfm_features.clip(lower=0))

    scaler = StandardScaler()
    scaled_array = scaler.fit_transform(rfm_log)

    scaled_df = pd.DataFrame(
        scaled_array,
        columns=["Recency_Scaled", "Frequency_Scaled", "Monetary_Scaled"],
        index=rfm_df.index,
    )
    return scaled_array, scaled_df


def evaluate_kmeans_range(scaled_features: np.ndarray, max_k: int = 10) -> pd.DataFrame:
    """
    Compute Elbow Method inertia and Silhouette Score across k = 2..max_k
    where mathematically valid (2 <= k < n_samples).
    """
    n_samples = scaled_features.shape[0]
    upper_k = min(max_k, n_samples - 1)
    if upper_k < 2:
        raise ValueError("At least 3 unique customers are required to evaluate K-Means clustering.")

    records = []
    for k in range(2, upper_k + 1):
        model = KMeans(n_clusters=k, init="k-means++", n_init=10, random_state=42)
        labels = model.fit_predict(scaled_features)
        inertia = float(model.inertia_)

        # Silhouette Score requires at least 2 distinct populated clusters and k < n_samples
        unique_labels = len(set(labels))
        if 2 <= unique_labels < n_samples:
            sil = round(float(silhouette_score(scaled_features, labels)), 4)
        else:
            sil = None

        records.append(
            {
                "k": k,
                "Inertia": round(inertia, 2),
                "Silhouette_Score": sil,
            }
        )

    return pd.DataFrame(records)


def run_kmeans_clustering(
    rfm_df: pd.DataFrame, n_clusters: int = 4
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Train K-Means with the selected number of clusters, assign cluster labels,
    and build cluster summary profiles using actual RFM averages.
    """
    n_samples = len(rfm_df)
    if n_samples < 3:
        raise ValueError("At least 3 customers are required for K-Means clustering.")

    safe_k = max(2, min(int(n_clusters), n_samples - 1))
    scaled_features, scaled_df = prepare_features_for_clustering(rfm_df)

    model = KMeans(n_clusters=safe_k, init="k-means++", n_init=10, random_state=42)
    cluster_labels = model.fit_predict(scaled_features)

    clustered_df = rfm_df.copy()
    clustered_df["Cluster"] = cluster_labels
    clustered_df["Recency_Scaled"] = scaled_df["Recency_Scaled"].round(4)
    clustered_df["Frequency_Scaled"] = scaled_df["Frequency_Scaled"].round(4)
    clustered_df["Monetary_Scaled"] = scaled_df["Monetary_Scaled"].round(4)

    # Calculate Silhouette Score for the chosen k
    unique_labels = len(set(cluster_labels))
    sil_score = (
        round(float(silhouette_score(scaled_features, cluster_labels)), 4)
        if 2 <= unique_labels < n_samples
        else None
    )

    cluster_profile = (
        clustered_df.groupby("Cluster", as_index=False)
        .agg(
            Customer_Count=("CustomerID", "count"),
            Avg_Recency=("Recency", "mean"),
            Avg_Frequency=("Frequency", "mean"),
            Avg_Monetary=("Monetary", "mean"),
            Total_Monetary=("Monetary", "sum"),
        )
        .sort_values(by="Avg_Monetary", ascending=False)
        .reset_index(drop=True)
    )

    cluster_profile["Customer_Share (%)"] = (
        cluster_profile["Customer_Count"] / n_samples * 100
    ).round(2)
    cluster_profile["Avg_Recency"] = cluster_profile["Avg_Recency"].round(2)
    cluster_profile["Avg_Frequency"] = cluster_profile["Avg_Frequency"].round(2)
    cluster_profile["Avg_Monetary"] = cluster_profile["Avg_Monetary"].round(2)
    cluster_profile["Total_Monetary"] = cluster_profile["Total_Monetary"].round(2)

    metrics = {
        "n_clusters": safe_k,
        "inertia": round(float(model.inertia_), 2),
        "silhouette_score": sil_score,
        "n_iter": int(model.n_iter_),
    }

    return clustered_df, cluster_profile, metrics
