"""
rfm_analysis.py
---------------
Computes customer-level Recency, Frequency, and Monetary (RFM) metrics
from cleaned e-commerce transaction records.
"""

from typing import Dict, Tuple
import pandas as pd


def calculate_rfm(cleaned_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Compute RFM metrics for every unique CustomerID:
      - Recency:   (Reference Date - Customer's Last Purchase Date) in days
      - Frequency: Count of unique InvoiceNo per customer
      - Monetary:  Sum of TotalPrice per customer

    Reference Date = max(InvoiceDate) + 1 day.
    """
    if cleaned_df.empty:
        raise ValueError("Cannot compute RFM metrics on an empty dataset.")

    required = {"CustomerID", "InvoiceDate", "InvoiceNo", "TotalPrice"}
    missing = required - set(cleaned_df.columns)
    if missing:
        raise ValueError(f"Cleaned dataset is missing required RFM columns: {', '.join(sorted(missing))}")

    reference_date = cleaned_df["InvoiceDate"].max() + pd.Timedelta(days=1)

    rfm = (
        cleaned_df.groupby("CustomerID", as_index=False)
        .agg(
            LastPurchaseDate=("InvoiceDate", "max"),
            Frequency=("InvoiceNo", "nunique"),
            Monetary=("TotalPrice", "sum"),
        )
    )

    rfm["Recency"] = (reference_date - rfm["LastPurchaseDate"]).dt.days.clip(lower=1)
    rfm["Monetary"] = rfm["Monetary"].round(2)

    # Order columns cleanly
    rfm = rfm[["CustomerID", "Recency", "Frequency", "Monetary"]].sort_values(
        by="Monetary", ascending=False
    ).reset_index(drop=True)

    summary = {
        "reference_date": reference_date.strftime("%Y-%m-%d %H:%M:%S"),
        "total_customers": len(rfm),
        "avg_recency": round(float(rfm["Recency"].mean()), 2),
        "median_recency": round(float(rfm["Recency"].median()), 2),
        "avg_frequency": round(float(rfm["Frequency"].mean()), 2),
        "median_frequency": round(float(rfm["Frequency"].median()), 2),
        "avg_monetary": round(float(rfm["Monetary"].mean()), 2),
        "median_monetary": round(float(rfm["Monetary"].median()), 2),
    }

    return rfm, summary
