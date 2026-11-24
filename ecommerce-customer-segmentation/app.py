"""
app.py
------
Main Streamlit application for:
"E-commerce Customer Segmentation: An RFM and K-Means Clustering Approach"

Run locally:
    streamlit run app.py
"""

from pathlib import Path
import pandas as pd
import streamlit as st

from src.business_insights import (
    compute_business_kpis,
    generate_pdf_report,
    interpret_clusters,
)
from src.clustering import (
    evaluate_kmeans_range,
    prepare_features_for_clustering,
    run_kmeans_clustering,
)
from src.data_preprocessing import (
    analyze_missing_values,
    load_dataset,
    preprocess_transactions,
)
from src.rfm_analysis import calculate_rfm
from src.rfm_scoring import score_rfm
from src.visualization import (
    plot_clusters_2d,
    plot_clusters_3d,
    plot_country_revenue,
    plot_elbow_curve,
    plot_matplotlib_rfm_heatmap,
    plot_rfm_categories,
    plot_rfm_distributions,
    plot_silhouette_scores,
)


st.set_page_config(
    page_title="E-commerce Customer Segmentation | RFM & K-Means",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Subtle clean dashboard styling
st.markdown(
    """
    <style>
    .block-container { padding-top: 1.5rem; padding-bottom: 2rem; }
    div[data-testid="stMetric"] {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 14px 16px;
        border-radius: 8px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

SAMPLE_DATA_PATH = Path(__file__).parent / "data" / "sample_online_retail.csv"


@st.cache_data(show_spinner=False)
def load_sample_csv(path_str: str) -> pd.DataFrame:
    return load_dataset(path_str)


# -----------------------------------------------------------------------------
# Sidebar: Dataset Selection, Clustering Controls, Navigation
# -----------------------------------------------------------------------------
st.sidebar.title("Customer Segmentation")
st.sidebar.caption("RFM Analysis & K-Means Pipeline")

page = st.sidebar.radio(
    "Navigation",
    [
        "1. Project Overview",
        "2. Data Analysis",
        "3. RFM Analysis",
        "4. Customer Segmentation",
        "5. Business Insights",
        "6. Download Reports",
    ],
)

st.sidebar.divider()
st.sidebar.subheader("Dataset Source")
uploaded_file = st.sidebar.file_uploader(
    "Upload Online Retail CSV",
    type=["csv"],
    help="Compatible with UCI Online Retail & Online Retail II CSV files.",
)

try:
    if uploaded_file is not None:
        raw_df = load_dataset(uploaded_file)
        dataset_label = uploaded_file.name
    else:
        raw_df = load_sample_csv(str(SAMPLE_DATA_PATH))
        dataset_label = "sample_online_retail.csv (Built-in Demo)"
except Exception as err:
    st.error(f"Could not load CSV file: {err}")
    st.stop()

st.sidebar.info(f"Active Dataset: {dataset_label}")

# Run preprocessing + RFM + scoring
try:
    cleaned_df, prep_stats = preprocess_transactions(raw_df)
    rfm_df, rfm_summary = calculate_rfm(cleaned_df)
    scored_df = score_rfm(rfm_df)
except Exception as err:
    st.error(f"Data pipeline error: {err}")
    st.stop()

# Select number of clusters
max_allowed_k = min(8, max(2, len(scored_df) - 1))
default_k = min(4, max_allowed_k)
selected_k = st.sidebar.slider(
    "Number of K-Means Clusters (k)",
    min_value=2,
    max_value=max_allowed_k,
    value=default_k,
    help="Use the Elbow Method and Silhouette Score on Page 4 to choose an optimal k.",
)

# Run clustering + business interpretation
try:
    scaled_features, _ = prepare_features_for_clustering(scored_df)
    eval_df = evaluate_kmeans_range(scaled_features, max_k=min(10, len(scored_df) - 1))
    clustered_df, cluster_profile_raw, cluster_metrics = run_kmeans_clustering(
        scored_df, n_clusters=selected_k
    )
    labeled_df, cluster_profile = interpret_clusters(clustered_df, cluster_profile_raw)
    kpis = compute_business_kpis(labeled_df, cluster_profile)
except Exception as err:
    st.error(f"Clustering pipeline error: {err}")
    st.stop()


# =============================================================================
# PAGE 1: PROJECT OVERVIEW
# =============================================================================
if page == "1. Project Overview":
    st.title("E-commerce Customer Segmentation: An RFM and K-Means Clustering Approach")
    st.markdown(
        "An end-to-end Machine Learning analytics platform that transforms raw e-commerce transaction "
        "logs into customer-level **Recency, Frequency, and Monetary (RFM)** profiles, applies "
        "**K-Means clustering**, and translates clusters into actionable retention strategies."
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Cleaned Transactions", f"{prep_stats['final_rows']:,}")
    c2.metric("Unique Customers", f"{prep_stats['unique_customers']:,}")
    c3.metric("Total Revenue", f"${prep_stats['total_revenue']:,.2f}")
    c4.metric("Active Clusters (k)", f"{cluster_metrics['n_clusters']}")

    st.divider()
    col_left, col_right = st.columns(2)

    with col_left:
        st.subheader("Project Objectives")
        st.markdown(
            """
            - Clean and validate raw e-commerce invoice records (removing missing IDs, cancellations, and invalid entries).
            - Compute **Recency** (days since last purchase), **Frequency** (unique orders), and **Monetary** (total spend).
            - Score customers on a 1–5 quintile scale and group them into clear RFM categories.
            - Standardize skewed RFM metrics and apply **K-Means Clustering** with Elbow and Silhouette evaluation.
            - Automatically name clusters by behavioral profile and export CSV and PDF executive reports.
            """
        )

        st.subheader("Technology Stack")
        st.markdown(
            """
            - **Language:** Python 3
            - **Data Processing:** Pandas, NumPy
            - **Machine Learning:** Scikit-learn (KMeans, StandardScaler, Silhouette Score)
            - **Visualization:** Plotly, Matplotlib, Seaborn
            - **Frontend & Export:** Streamlit, FPDF2
            """
        )

    with col_right:
        st.subheader("Machine Learning Workflow")
        st.markdown(
            """
            1. **Data Ingestion & Preprocessing:** Load CSV, inspect missing values, drop invalid/cancelled orders, compute `TotalPrice = Quantity × UnitPrice`.
            2. **RFM Feature Engineering:** Aggregate transactions per `CustomerID` relative to `max(InvoiceDate) + 1 day`.
            3. **RFM Quantile Scoring:** Rank-based 1–5 scoring for R (lower is better), F, and M (higher is better).
            4. **Log Transformation & Scaling:** Apply `log1p` to tame right-skewness, then standardize with `StandardScaler`.
            5. **Model Selection & Clustering:** Evaluate `k = 2..10` via Inertia & Silhouette Score, then fit K-Means.
            6. **Segment Interpretation:** Label clusters using real RFM averages and map tailored retention playbooks.
            """
        )

        st.subheader("Dataset Guidance")
        st.info(
            "Supports UCI **Online Retail** and **Online Retail II** CSV files containing "
            "`InvoiceNo`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `UnitPrice`, `CustomerID`, and `Country`."
        )


# =============================================================================
# PAGE 2: DATA ANALYSIS
# =============================================================================
elif page == "2. Data Analysis":
    st.title("Data Analysis & Preprocessing")
    st.markdown("Inspect raw transaction quality, missing values, and the exact cleaning pipeline applied before modeling.")

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Raw Rows", f"{prep_stats['initial_rows']:,}")
    m2.metric("Cleaned Rows", f"{prep_stats['final_rows']:,}")
    m3.metric("Rows Removed", f"{prep_stats['rows_removed']:,}")
    m4.metric("Data Retention", f"{prep_stats['retention_pct']}%")

    tab_raw, tab_clean, tab_missing = st.tabs(["Raw vs. Cleaned Preview", "Cleaning Summary", "Missing Values"])

    with tab_raw:
        c1, c2 = st.columns(2)
        with c1:
            st.subheader(f"Before Preprocessing ({prep_stats['initial_rows']} × {prep_stats['initial_cols']})")
            st.dataframe(raw_df.head(15), use_container_width=True)
        with c2:
            st.subheader(f"After Preprocessing ({prep_stats['final_rows']} × {prep_stats['final_cols']})")
            st.dataframe(cleaned_df.head(15), use_container_width=True)

    with tab_clean:
        cleaning_table = pd.DataFrame(
            [
                {"Step": "1. Missing CustomerID removed", "Records Removed": prep_stats["removed_missing_customer_id"]},
                {"Step": "2. Cancelled invoices ('C' prefix) removed", "Records Removed": prep_stats["removed_cancelled_invoices"]},
                {"Step": "3. Non-positive Quantity (<= 0) removed", "Records Removed": prep_stats["removed_non_positive_quantity"]},
                {"Step": "4. Non-positive UnitPrice (<= 0) removed", "Records Removed": prep_stats["removed_non_positive_price"]},
                {"Step": "5. Invalid InvoiceDate rows removed", "Records Removed": prep_stats["removed_invalid_dates"]},
                {"Step": "6. Exact duplicate records removed", "Records Removed": prep_stats["removed_duplicates"]},
            ]
        )
        st.dataframe(cleaning_table, use_container_width=True, hide_index=True)

    with tab_missing:
        st.subheader("Raw Dataset Missing Values & Data Types")
        st.dataframe(analyze_missing_values(raw_df), use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Transaction Revenue by Country")
    st.plotly_chart(plot_country_revenue(cleaned_df), use_container_width=True)


# =============================================================================
# PAGE 3: RFM ANALYSIS
# =============================================================================
elif page == "3. RFM Analysis":
    st.title("RFM Feature Engineering & Scoring")
    st.markdown(
        f"**Reference Date:** `{rfm_summary['reference_date']}` (maximum `InvoiceDate` + 1 day). "
        "Lower Recency indicates more recent purchases; higher Frequency and Monetary indicate stronger engagement."
    )

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Customers Analyzed", f"{rfm_summary['total_customers']:,}")
    k2.metric("Avg Recency", f"{rfm_summary['avg_recency']} days")
    k3.metric("Avg Frequency", f"{rfm_summary['avg_frequency']} orders")
    k4.metric("Avg Monetary", f"${rfm_summary['avg_monetary']:,.2f}")

    st.plotly_chart(plot_rfm_distributions(scored_df), use_container_width=True)
    st.plotly_chart(plot_rfm_categories(scored_df), use_container_width=True)

    with st.expander("How RFM Scoring & Categories Work"):
        st.markdown(
            """
            - **R_Score (1–5):** Assigned by quintiles where **5** = most recent buyers (lowest Recency days).
            - **F_Score (1–5):** Assigned by quintiles where **5** = highest unique invoice count.
            - **M_Score (1–5):** Assigned by quintiles where **5** = highest total spend.
            - Rank-based quintiles (`rank(method='first')`) are used so tied values or small datasets never crash.
            - **Categories:** Champions (`R≥4, FM≥4`), Loyal Customers (`R≥3, FM≥3.5`), Potential Loyalists, Recent Customers, At Risk Customers, Hibernating Customers, and Lost Customers.
            """
        )

    st.subheader("Customer RFM Table")
    st.dataframe(scored_df, use_container_width=True)

    st.download_button(
        label="Download RFM Table (CSV)",
        data=scored_df.to_csv(index=False).encode("utf-8"),
        file_name="rfm_analysis.csv",
        mime="text/csv",
    )


# =============================================================================
# PAGE 4: CUSTOMER SEGMENTATION
# =============================================================================
elif page == "4. Customer Segmentation":
    st.title("K-Means Customer Segmentation & Evaluation")
    st.markdown(
        "RFM features are transformed via `log1p` to reduce skewness and normalized with `StandardScaler` "
        "before fitting K-Means (`k-means++`)."
    )

    e1, e2, e3 = st.columns(3)
    e1.metric("Selected Clusters (k)", f"{cluster_metrics['n_clusters']}")
    e2.metric("Model Inertia (WCSS)", f"{cluster_metrics['inertia']:,.2f}")
    sil_display = f"{cluster_metrics['silhouette_score']:.4f}" if cluster_metrics["silhouette_score"] is not None else "N/A"
    e3.metric("Silhouette Score", sil_display)

    c_elbow, c_sil = st.columns(2)
    with c_elbow:
        st.plotly_chart(plot_elbow_curve(eval_df, selected_k), use_container_width=True)
    with c_sil:
        st.plotly_chart(plot_silhouette_scores(eval_df, selected_k), use_container_width=True)

    st.subheader("Cluster Profiles & Automated Segment Naming")
    st.dataframe(
        cluster_profile[["Cluster", "Segment_Name", "Customer_Count", "Customer_Share (%)", "Avg_Recency", "Avg_Frequency", "Avg_Monetary", "Total_Monetary"]],
        use_container_width=True,
        hide_index=True,
    )

    c2d_left, c2d_right = st.columns(2)
    with c2d_left:
        st.plotly_chart(plot_clusters_2d(labeled_df, "Recency", "Monetary"), use_container_width=True)
    with c2d_right:
        st.plotly_chart(plot_clusters_2d(labeled_df, "Frequency", "Monetary"), use_container_width=True)

    st.plotly_chart(plot_clusters_3d(labeled_df), use_container_width=True)

    st.subheader("RFM Profile Heatmap (Seaborn)")
    fig_hm = plot_matplotlib_rfm_heatmap(labeled_df)
    st.pyplot(fig_hm)

    with st.expander("Why K-Means & Model Limitations"):
        st.markdown(
            """
            - **Why K-Means fits RFM segmentation:** Fast, scalable to large retail customer bases, and yields clear centroid profiles in R-F-M space.
            - **Limitations:** Assumes roughly spherical clusters in scaled feature space, is sensitive to extreme outliers (mitigated here with `log1p`), and requires choosing `k` upfront (guided here using Elbow Inertia and Silhouette Score).
            """
        )


# =============================================================================
# PAGE 5: BUSINESS INSIGHTS
# =============================================================================
elif page == "5. Business Insights":
    st.title("Executive Business Insights & Recommendations")

    b1, b2, b3, b4 = st.columns(4)
    b1.metric("Total Customers", f"{kpis['total_customers']:,}")
    b2.metric("Customer Segments", f"{kpis['num_segments']}")
    b3.metric("Top Segment", kpis["highest_value_segment"])
    b4.metric("Avg Customer Spend", f"${kpis['avg_customer_monetary']:,.2f}")

    st.divider()
    st.subheader("Segment Share & Action Playbook")

    for _, row in cluster_profile.iterrows():
        with st.container(border=True):
            top_col1, top_col2, top_col3, top_col4 = st.columns([2.2, 1, 1, 1])
            top_col1.markdown(f"### {row['Segment_Name']}")
            top_col1.caption(f"Cluster {int(row['Cluster'])} · {row['Characteristics']}")
            top_col2.metric("Customers", f"{int(row['Customer_Count'])} ({row['Customer_Share (%)']}%)")
            top_col3.metric("Avg Recency / Freq", f"{row['Avg_Recency']}d / {row['Avg_Frequency']}x")
            top_col4.metric("Avg Spend", f"${row['Avg_Monetary']:,.2f}")
            st.markdown(f"**Recommended Action:** {row['Recommended_Action']}")


# =============================================================================
# PAGE 6: DOWNLOAD REPORTS
# =============================================================================
elif page == "6. Download Reports":
    st.title("Export Cleaned Data, Segments & Executive PDF Report")
    st.markdown("Download processed datasets and executive summaries for downstream CRM campaigns or offline review.")

    d1, d2 = st.columns(2)
    with d1:
        st.subheader("CSV Exports")
        st.download_button(
            "Download Cleaned Dataset (CSV)",
            data=cleaned_df.to_csv(index=False).encode("utf-8"),
            file_name="cleaned_transactions.csv",
            mime="text/csv",
            use_container_width=True,
        )
        st.download_button(
            "Download RFM Analysis (CSV)",
            data=scored_df.to_csv(index=False).encode("utf-8"),
            file_name="rfm_analysis.csv",
            mime="text/csv",
            use_container_width=True,
        )
        st.download_button(
            "Download Customer Segmentation Results (CSV)",
            data=labeled_df.to_csv(index=False).encode("utf-8"),
            file_name="customer_segmentation_results.csv",
            mime="text/csv",
            use_container_width=True,
        )
        st.download_button(
            "Download Cluster Summary (CSV)",
            data=cluster_profile.to_csv(index=False).encode("utf-8"),
            file_name="cluster_summary.csv",
            mime="text/csv",
            use_container_width=True,
        )

    with d2:
        st.subheader("Executive PDF Report")
        st.markdown(
            "Generates a formatted PDF summarizing data retention, RFM statistics, "
            "Elbow & Silhouette metrics, and per-segment business recommendations."
        )
        pdf_bytes = generate_pdf_report(
            prep_stats, rfm_summary, cluster_metrics, kpis, cluster_profile
        )
        st.download_button(
            "Download Executive Summary (PDF)",
            data=pdf_bytes,
            file_name="customer_segmentation_report.pdf",
            mime="application/pdf",
            use_container_width=True,
        )
