"""
visualization.py
----------------
Creates interactive Plotly visualizations and clean Matplotlib/Seaborn figures
for data analysis, RFM distributions, Elbow/Silhouette curves, and 2D/3D cluster views.
"""

import matplotlib.pyplot as plt
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import seaborn as sns


PALETTE = ["#2563EB", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#0284C7", "#059669", "#B45309"]


def plot_rfm_distributions(rfm_df: pd.DataFrame) -> go.Figure:
    """Build interactive histograms for Recency, Frequency, and Monetary distributions."""
    from plotly.subplots import make_subplots

    fig = make_subplots(
        rows=1,
        cols=3,
        subplot_titles=("Recency (Days)", "Frequency (Orders)", "Monetary ($)"),
    )

    fig.add_trace(
        go.Histogram(x=rfm_df["Recency"], nbinsx=20, marker_color="#2563EB", name="Recency"),
        row=1,
        col=1,
    )
    fig.add_trace(
        go.Histogram(x=rfm_df["Frequency"], nbinsx=20, marker_color="#0D9488", name="Frequency"),
        row=1,
        col=2,
    )
    fig.add_trace(
        go.Histogram(x=rfm_df["Monetary"], nbinsx=20, marker_color="#D97706", name="Monetary"),
        row=1,
        col=3,
    )

    fig.update_layout(
        height=380,
        showlegend=False,
        template="plotly_white",
        margin=dict(l=20, r=20, t=45, b=20),
    )
    return fig


def plot_rfm_categories(scored_df: pd.DataFrame) -> go.Figure:
    """Bar chart of customer counts by RFM score category."""
    counts = (
        scored_df["RFM_Category"]
        .value_counts()
        .rename_axis("RFM_Category")
        .reset_index(name="Customers")
    )
    fig = px.bar(
        counts,
        x="RFM_Category",
        y="Customers",
        color="RFM_Category",
        color_discrete_sequence=PALETTE,
        template="plotly_white",
        title="Customer Distribution by RFM Category",
    )
    fig.update_layout(showlegend=False, xaxis_title="", yaxis_title="Customers", height=380)
    return fig


def plot_elbow_curve(eval_df: pd.DataFrame, selected_k: int) -> go.Figure:
    """Interactive Elbow Method inertia curve highlighting the selected cluster count."""
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=eval_df["k"],
            y=eval_df["Inertia"],
            mode="lines+markers",
            line=dict(color="#2563EB", width=2.5),
            marker=dict(size=8),
            name="Inertia",
        )
    )
    selected_row = eval_df[eval_df["k"] == selected_k]
    if not selected_row.empty:
        fig.add_trace(
            go.Scatter(
                x=selected_row["k"],
                y=selected_row["Inertia"],
                mode="markers",
                marker=dict(size=14, color="#DC2626", symbol="circle-open", line=dict(width=3)),
                name=f"Selected k={selected_k}",
            )
        )
    fig.update_layout(
        title="Elbow Method (Inertia vs. Number of Clusters)",
        xaxis_title="Number of Clusters (k)",
        yaxis_title="Within-Cluster Sum of Squares (Inertia)",
        template="plotly_white",
        height=360,
    )
    return fig


def plot_silhouette_scores(eval_df: pd.DataFrame, selected_k: int) -> go.Figure:
    """Interactive Silhouette Score chart across candidate k values."""
    valid = eval_df.dropna(subset=["Silhouette_Score"])
    colors = ["#DC2626" if k == selected_k else "#0D9488" for k in valid["k"]]
    fig = go.Figure(
        data=[
            go.Bar(
                x=valid["k"],
                y=valid["Silhouette_Score"],
                marker_color=colors,
                text=valid["Silhouette_Score"].round(3),
                textposition="outside",
            )
        ]
    )
    fig.update_layout(
        title="Silhouette Score by Cluster Count (Higher is Better)",
        xaxis_title="Number of Clusters (k)",
        yaxis_title="Silhouette Score",
        template="plotly_white",
        height=360,
    )
    return fig


def plot_clusters_2d(labeled_df: pd.DataFrame, x_col: str = "Recency", y_col: str = "Monetary") -> go.Figure:
    """Interactive 2D scatter plot of customer segments."""
    fig = px.scatter(
        labeled_df,
        x=x_col,
        y=y_col,
        color="Segment_Name",
        size="Frequency",
        hover_data=["CustomerID", "Recency", "Frequency", "Monetary", "Cluster"],
        color_discrete_sequence=PALETTE,
        template="plotly_white",
        title=f"2D Customer Segments: {x_col} vs. {y_col}",
    )
    fig.update_layout(height=450)
    return fig


def plot_clusters_3d(labeled_df: pd.DataFrame) -> go.Figure:
    """Interactive 3D scatter plot of Recency, Frequency, and Monetary clusters."""
    fig = px.scatter_3d(
        labeled_df,
        x="Recency",
        y="Frequency",
        z="Monetary",
        color="Segment_Name",
        hover_data=["CustomerID", "Cluster", "RFM_Score"],
        color_discrete_sequence=PALETTE,
        template="plotly_white",
        title="3D Customer Segmentation (Recency, Frequency, Monetary)",
    )
    fig.update_traces(marker=dict(size=5, opacity=0.85))
    fig.update_layout(height=540, margin=dict(l=0, r=0, t=45, b=0))
    return fig


def plot_country_revenue(cleaned_df: pd.DataFrame) -> go.Figure:
    """Top 10 countries by total revenue."""
    country_rev = (
        cleaned_df.groupby("Country", as_index=False)["TotalPrice"]
        .sum()
        .sort_values(by="TotalPrice", ascending=False)
        .head(10)
    )
    fig = px.bar(
        country_rev,
        x="TotalPrice",
        y="Country",
        orientation="h",
        color_discrete_sequence=["#2563EB"],
        template="plotly_white",
        title="Top 10 Countries by Revenue",
    )
    fig.update_layout(yaxis=dict(autorange="reversed"), xaxis_title="Revenue ($)", yaxis_title="", height=360)
    return fig


def plot_matplotlib_rfm_heatmap(labeled_df: pd.DataFrame):
    """Create a clean Seaborn heatmap comparing average normalized RFM values per segment."""
    summary = labeled_df.groupby("Segment_Name")[["Recency", "Frequency", "Monetary"]].mean()
    norm = (summary - summary.mean()) / summary.std().replace(0, 1)

    fig, ax = plt.subplots(figsize=(7, 4))
    sns.heatmap(norm, annot=summary.round(1), fmt=".1f", cmap="YlGnBu", linewidths=0.5, ax=ax)
    ax.set_title("Segment RFM Profile Heatmap (Annotated with Mean Values)")
    ax.set_ylabel("")
    plt.tight_layout()
    return fig
