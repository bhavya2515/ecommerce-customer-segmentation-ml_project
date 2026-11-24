"""
rfm_scoring.py
--------------
Assigns 1-5 quantile scores for Recency, Frequency, and Monetary values
and classifies customers into clear RFM segments.

Handles duplicate quantile boundaries and small datasets gracefully using
rank-based quintile binning.
"""

import pandas as pd


def _assign_quantile_score(series: pd.Series, reverse: bool = False) -> pd.Series:
    """
    Assign integer scores from 1 to 5 using rank-based quintiles.
    Using rank(method='first') ensures duplicate bin edges (e.g., many customers
    with Frequency == 1) never crash pd.qcut().
    """
    n_unique = series.nunique(dropna=True)
    if len(series) == 0:
        return pd.Series([], dtype=int)
    if n_unique <= 1:
        return pd.Series([3] * len(series), index=series.index, dtype=int)

    n_bins = min(5, len(series))
    ranks = series.rank(method="first")
    labels = list(range(n_bins, 0, -1)) if reverse else list(range(1, n_bins + 1))

    scored = pd.qcut(ranks, q=n_bins, labels=labels)
    return scored.astype(int)


def classify_rfm_category(row: pd.Series) -> str:
    """
    Map R, F, and M scores (1-5) into intuitive business categories.
    """
    r = row["R_Score"]
    f = row["F_Score"]
    m = row["M_Score"]
    fm = (f + m) / 2.0

    if r >= 4 and fm >= 4.0:
        return "Champions"
    if r >= 3 and fm >= 3.5:
        return "Loyal Customers"
    if r >= 4 and 2.0 <= fm < 3.5:
        return "Potential Loyalists"
    if r >= 4 and fm < 2.0:
        return "Recent Customers"
    if 2 <= r <= 3 and fm >= 3.0:
        return "At Risk Customers"
    if r <= 2 and 2.0 <= fm < 3.0:
        return "Hibernating Customers"
    if r == 1 and fm < 2.0:
        return "Lost Customers"
    if r == 2 and fm < 2.0:
        return "Hibernating Customers"
    return "Potential Loyalists"


def score_rfm(rfm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Add R_Score, F_Score, M_Score, RFM_Score (string code like '555'),
    RFM_Total (sum 3-15), and RFM_Category to the RFM DataFrame.
    """
    scored = rfm_df.copy()

    # Lower Recency = higher score (5 is most recent)
    scored["R_Score"] = _assign_quantile_score(scored["Recency"], reverse=True)
    # Higher Frequency & Monetary = higher score
    scored["F_Score"] = _assign_quantile_score(scored["Frequency"], reverse=False)
    scored["M_Score"] = _assign_quantile_score(scored["Monetary"], reverse=False)

    scored["RFM_Score"] = (
        scored["R_Score"].astype(str)
        + scored["F_Score"].astype(str)
        + scored["M_Score"].astype(str)
    )
    scored["RFM_Total"] = scored["R_Score"] + scored["F_Score"] + scored["M_Score"]
    scored["RFM_Category"] = scored.apply(classify_rfm_category, axis=1)

    return scored
