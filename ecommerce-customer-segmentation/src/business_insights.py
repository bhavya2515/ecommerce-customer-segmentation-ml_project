"""
business_insights.py
--------------------
Interprets K-Means clusters using their actual RFM cluster averages
(never blindly by cluster ID) and generates actionable business recommendations
and downloadable PDF reports.
"""

from typing import Dict, Tuple
import pandas as pd
from fpdf import FPDF


SEGMENT_RECOMMENDATIONS: Dict[str, Dict[str, str]] = {
    "High Value Customers": {
        "description": "Most recent buyers who purchase frequently and generate the highest revenue.",
        "action": "Offer VIP rewards, early access to new collections, priority support, and exclusive loyalty perks.",
    },
    "Loyal Customers": {
        "description": "Consistent repeat shoppers with strong order frequency and reliable spend.",
        "action": "Enroll in tiered loyalty programs, offer bundle cross-sells, and request product reviews or referrals.",
    },
    "Potential Loyal Customers": {
        "description": "Moderately recent shoppers with promising order sizes who can grow into loyal advocates.",
        "action": "Encourage repeat purchases through personalized product recommendations and second-order incentives.",
    },
    "New Customers": {
        "description": "Recent first-time or low-frequency buyers still forming a habit with your store.",
        "action": "Send onboarding welcome sequences, helpful usage guides, and time-limited next-purchase discounts.",
    },
    "At Risk Customers": {
        "description": "Previously active or high-spending buyers who have not purchased recently.",
        "action": "Trigger personalized win-back emails, targeted vouchers, and feedback surveys before churn occurs.",
    },
    "Lost Customers": {
        "description": "Long-inactive customers with low purchase frequency and low recent engagement.",
        "action": "Launch low-cost reactivation campaigns, seasonal clearance offers, or suppress from expensive ad spend.",
    },
}


def interpret_clusters(
    clustered_df: pd.DataFrame, cluster_profile: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Assign meaningful business segment names to each K-Means cluster by comparing
    each cluster's average Recency, Frequency, and Monetary metrics against overall
    customer population benchmarks.
    """
    overall_r = float(clustered_df["Recency"].mean())
    overall_f = float(clustered_df["Frequency"].mean())
    overall_m = float(clustered_df["Monetary"].mean())

    profile = cluster_profile.copy()

    # Composite value score for ranking clusters from strongest to weakest RFM health
    # Lower Recency is better; higher Frequency and Monetary are better
    r_max = max(float(profile["Avg_Recency"].max()), 1.0)
    f_max = max(float(profile["Avg_Frequency"].max()), 1.0)
    m_max = max(float(profile["Avg_Monetary"].max()), 1.0)

    def _assign_segment(row: pd.Series) -> str:
        r_ratio = row["Avg_Recency"] / max(overall_r, 1e-6)
        f_ratio = row["Avg_Frequency"] / max(overall_f, 1e-6)
        m_ratio = row["Avg_Monetary"] / max(overall_m, 1e-6)

        # Recent + High Frequency + High Spend
        if r_ratio <= 0.85 and f_ratio >= 1.2 and m_ratio >= 1.2:
            return "High Value Customers"
        # Recent + Above-average engagement or spend
        if r_ratio <= 0.95 and (f_ratio >= 0.95 or m_ratio >= 1.0):
            return "Loyal Customers"
        # Very recent but lower frequency/spend -> New or Potential Loyal
        if r_ratio <= 0.85 and f_ratio < 0.95:
            return "New Customers" if row["Avg_Frequency"] <= 2.2 else "Potential Loyal Customers"
        # Older recency but historically strong frequency or monetary value -> At Risk
        if r_ratio > 0.95 and (f_ratio >= 0.85 or m_ratio >= 0.85):
            return "At Risk Customers"
        # Moderate recency and moderate value -> Potential Loyal Customers
        if r_ratio <= 1.25:
            return "Potential Loyal Customers"
        # Long inactive + low frequency/spend -> Lost Customers
        return "Lost Customers"

    # Compute an interpretable health score to break ties cleanly if two clusters get the same label
    profile["Health_Index"] = (
        (1.0 - profile["Avg_Recency"] / r_max) * 0.35
        + (profile["Avg_Frequency"] / f_max) * 0.30
        + (profile["Avg_Monetary"] / m_max) * 0.35
    )
    profile = profile.sort_values(by="Health_Index", ascending=False).reset_index(drop=True)

    raw_names = profile.apply(_assign_segment, axis=1).tolist()
    # Ensure distinct, readable names when k > number of triggered buckets
    used_counts: Dict[str, int] = {}
    final_names = []
    for name in raw_names:
        if name not in used_counts:
            used_counts[name] = 1
            final_names.append(name)
        else:
            used_counts[name] += 1
            final_names.append(f"{name} ({used_counts[name]})")

    profile["Segment_Name"] = final_names

    # Attach business descriptions & recommended actions
    def _base_key(seg_name: str) -> str:
        return seg_name.split(" (")[0]

    profile["Characteristics"] = profile["Segment_Name"].apply(
        lambda s: SEGMENT_RECOMMENDATIONS.get(_base_key(s), {}).get("description", "")
    )
    profile["Recommended_Action"] = profile["Segment_Name"].apply(
        lambda s: SEGMENT_RECOMMENDATIONS.get(_base_key(s), {}).get("action", "")
    )

    cluster_to_segment = dict(zip(profile["Cluster"], profile["Segment_Name"]))
    labeled_customers = clustered_df.copy()
    labeled_customers["Segment_Name"] = labeled_customers["Cluster"].map(cluster_to_segment)

    return labeled_customers, profile.drop(columns=["Health_Index"])


def compute_business_kpis(labeled_df: pd.DataFrame, cluster_profile: pd.DataFrame) -> Dict:
    """Compute top-level executive KPIs from the segmented customer table."""
    total_customers = len(labeled_df)
    total_revenue = round(float(labeled_df["Monetary"].sum()), 2)
    avg_monetary = round(float(labeled_df["Monetary"].mean()), 2)

    top_row = cluster_profile.sort_values(by="Avg_Monetary", ascending=False).iloc[0]

    return {
        "total_customers": total_customers,
        "num_segments": len(cluster_profile),
        "highest_value_segment": str(top_row["Segment_Name"]),
        "highest_value_avg_spend": round(float(top_row["Avg_Monetary"]), 2),
        "avg_customer_monetary": avg_monetary,
        "total_revenue": total_revenue,
    }


def generate_pdf_report(
    preprocessing_stats: Dict,
    rfm_summary: Dict,
    clustering_metrics: Dict,
    kpis: Dict,
    cluster_profile: pd.DataFrame,
) -> bytes:
    """
    Generate a clean, structured PDF summary report containing dataset metrics,
    clustering evaluation, segment profiles, and business recommendations.
    """
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "E-commerce Customer Segmentation Report", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 95, 110)
    pdf.cell(0, 6, "RFM Analysis and K-Means Clustering Executive Summary", ln=True)
    pdf.ln(4)

    # Section 1: Data Cleaning Summary
    pdf.set_text_color(20, 25, 35)
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "1. Dataset & Preprocessing Summary", ln=True)
    pdf.set_font("Helvetica", "", 10)
    lines_1 = [
        f"Raw Rows: {preprocessing_stats['initial_rows']}  |  Cleaned Rows: {preprocessing_stats['final_rows']}  |  Retention: {preprocessing_stats['retention_pct']}%",
        f"Removed Missing CustomerID: {preprocessing_stats['removed_missing_customer_id']}  |  Cancelled Invoices: {preprocessing_stats['removed_cancelled_invoices']}",
        f"Unique Customers: {preprocessing_stats['unique_customers']}  |  Unique Invoices: {preprocessing_stats['unique_invoices']}  |  Total Revenue: ${preprocessing_stats['total_revenue']:,.2f}",
    ]
    for line in lines_1:
        pdf.cell(0, 6, line, ln=True)
    pdf.ln(3)

    # Section 2: RFM & Clustering Evaluation
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2. RFM & K-Means Model Evaluation", ln=True)
    pdf.set_font("Helvetica", "", 10)
    sil_text = (
        f"{clustering_metrics['silhouette_score']:.4f}"
        if clustering_metrics["silhouette_score"] is not None
        else "N/A"
    )
    lines_2 = [
        f"Reference Date: {rfm_summary['reference_date']}",
        f"Mean Recency: {rfm_summary['avg_recency']} days  |  Mean Frequency: {rfm_summary['avg_frequency']} orders  |  Mean Monetary: ${rfm_summary['avg_monetary']:,.2f}",
        f"Selected Clusters (k): {clustering_metrics['n_clusters']}  |  Inertia: {clustering_metrics['inertia']}  |  Silhouette Score: {sil_text}",
        f"Highest-Value Segment: {kpis['highest_value_segment']} (Avg Spend: ${kpis['highest_value_avg_spend']:,.2f})",
    ]
    for line in lines_2:
        pdf.cell(0, 6, line, ln=True)
    pdf.ln(4)

    # Section 3: Segment Profiles & Business Recommendations
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3. Customer Segment Profiles & Recommendations", ln=True)
    pdf.set_font("Helvetica", "", 9.5)

    for _, row in cluster_profile.iterrows():
        pdf.set_font("Helvetica", "B", 10)
        header = (
            f"{row['Segment_Name']} (Cluster {row['Cluster']}) - "
            f"{int(row['Customer_Count'])} customers ({row['Customer_Share (%)']}%)"
        )
        pdf.cell(0, 6, header, ln=True)
        pdf.set_font("Helvetica", "", 9.5)
        metrics_line = (
            f"Avg Recency: {row['Avg_Recency']} days | "
            f"Avg Frequency: {row['Avg_Frequency']} orders | "
            f"Avg Monetary: ${row['Avg_Monetary']:,.2f}"
        )
        pdf.cell(0, 5.5, metrics_line, ln=True)
        pdf.multi_cell(0, 5, f"Recommendation: {row['Recommended_Action']}")
        pdf.ln(2)

    return bytes(pdf.output())
