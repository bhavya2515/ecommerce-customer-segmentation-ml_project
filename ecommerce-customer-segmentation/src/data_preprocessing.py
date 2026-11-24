"""
data_preprocessing.py
---------------------
Handles loading, validating, inspecting, and cleaning e-commerce transaction datasets
(compatible with UCI Online Retail and Online Retail II schemas).
"""

from typing import Dict, Tuple, Union
import io
import pandas as pd


# Standard column aliases so both Online Retail and Online Retail II datasets work seamlessly
COLUMN_ALIASES = {
    "invoiceno": "InvoiceNo",
    "invoice": "InvoiceNo",
    "invoice_no": "InvoiceNo",
    "stockcode": "StockCode",
    "stock_code": "StockCode",
    "description": "Description",
    "quantity": "Quantity",
    "invoicedate": "InvoiceDate",
    "invoice_date": "InvoiceDate",
    "unitprice": "UnitPrice",
    "price": "UnitPrice",
    "unit_price": "UnitPrice",
    "customerid": "CustomerID",
    "customer id": "CustomerID",
    "customer_id": "CustomerID",
    "country": "Country",
}

REQUIRED_COLUMNS = ["InvoiceNo", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID"]


def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Rename common Online Retail / Online Retail II column variants to standard names."""
    renamed = {}
    for col in df.columns:
        normalized = str(col).strip().lower()
        if normalized in COLUMN_ALIASES:
            renamed[col] = COLUMN_ALIASES[normalized]
    return df.rename(columns=renamed)


def load_dataset(source: Union[str, io.BytesIO, io.StringIO]) -> pd.DataFrame:
    """
    Load a CSV dataset from a file path or uploaded file buffer.
    Tries UTF-8 first, then falls back to ISO-8859-1 (common for UCI Online Retail).
    """
    encodings = ["utf-8", "latin1", "cp1252"]
    last_error = None

    for enc in encodings:
        try:
            if hasattr(source, "seek"):
                source.seek(0)
            df = pd.read_csv(source, encoding=enc)
            df = standardize_column_names(df)
            return df
        except UnicodeDecodeError as err:
            last_error = err
        except Exception as err:
            raise ValueError(f"Failed to read CSV file: {err}") from err

    raise ValueError(f"Unable to decode CSV file with supported encodings: {last_error}")


def validate_columns(df: pd.DataFrame) -> Tuple[bool, list]:
    """Check whether all required columns are present after standardization."""
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    return len(missing) == 0, missing


def analyze_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """Return a clean summary table of missing values and data types per column."""
    total_rows = max(len(df), 1)
    summary = pd.DataFrame(
        {
            "Column": df.columns,
            "Data Type": [str(dtype) for dtype in df.dtypes],
            "Missing Count": [int(df[col].isna().sum()) for col in df.columns],
            "Missing (%)": [round(float(df[col].isna().sum()) / total_rows * 100, 2) for col in df.columns],
        }
    )
    return summary


def preprocess_transactions(raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Execute the complete 11-step e-commerce transaction cleaning pipeline:
      1. Validate required columns
      2. Remove rows with missing CustomerID
      3. Remove cancelled invoices (InvoiceNo starting with 'C')
      4. Convert Quantity and UnitPrice to numeric and drop invalid rows
      5. Remove transactions with Quantity <= 0
      6. Remove transactions with UnitPrice <= 0
      7. Parse InvoiceDate to datetime and drop invalid timestamps
      8. Remove exact duplicate rows
      9. Format CustomerID cleanly as string
     10. Compute TotalPrice = Quantity * UnitPrice
     11. Return cleaned DataFrame alongside detailed step-by-step audit counts
    """
    is_valid, missing_cols = validate_columns(raw_df)
    if not is_valid:
        raise ValueError(
            "Dataset is missing required columns: "
            + ", ".join(missing_cols)
            + ". Expected columns: InvoiceNo, Quantity, InvoiceDate, UnitPrice, CustomerID."
        )

    df = raw_df.copy()
    initial_rows = len(df)
    initial_cols = df.shape[1]

    # Step 1: Drop missing CustomerID
    missing_cust_count = int(df["CustomerID"].isna().sum())
    df = df.dropna(subset=["CustomerID"])
    df["CustomerID"] = df["CustomerID"].astype(str).str.strip()
    df = df[df["CustomerID"] != ""]
    df = df[df["CustomerID"].str.lower() != "nan"]
    # Strip trailing '.0' if CustomerID was parsed as float (e.g. '17850.0' -> '17850')
    df["CustomerID"] = df["CustomerID"].str.replace(r"\.0$", "", regex=True)

    # Step 2: Remove cancelled invoices (InvoiceNo starting with 'C' or 'c')
    df["InvoiceNo"] = df["InvoiceNo"].astype(str).str.strip()
    cancelled_mask = df["InvoiceNo"].str.upper().str.startswith("C")
    cancelled_count = int(cancelled_mask.sum())
    df = df[~cancelled_mask]

    # Step 3: Coerce Quantity and UnitPrice to numeric
    df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
    df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce")
    df = df.dropna(subset=["Quantity", "UnitPrice"])

    # Step 4: Remove Quantity <= 0
    non_positive_qty_count = int((df["Quantity"] <= 0).sum())
    df = df[df["Quantity"] > 0]

    # Step 5: Remove UnitPrice <= 0
    non_positive_price_count = int((df["UnitPrice"] <= 0).sum())
    df = df[df["UnitPrice"] > 0]

    # Step 6: Convert InvoiceDate into datetime
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    invalid_date_count = int(df["InvoiceDate"].isna().sum())
    df = df.dropna(subset=["InvoiceDate"])

    # Step 7: Remove duplicate records
    duplicate_count = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)

    # Step 8: Create TotalPrice = Quantity * UnitPrice
    df["TotalPrice"] = (df["Quantity"] * df["UnitPrice"]).round(2)

    if "Country" not in df.columns:
        df["Country"] = "Unknown"
    else:
        df["Country"] = df["Country"].fillna("Unknown").astype(str).str.strip()

    if "Description" not in df.columns:
        df["Description"] = "Item"
    else:
        df["Description"] = df["Description"].fillna("Item").astype(str).str.strip()

    if df.empty:
        raise ValueError("No valid transactions remain after preprocessing. Please check your CSV format and values.")

    stats = {
        "initial_rows": initial_rows,
        "initial_cols": initial_cols,
        "final_rows": len(df),
        "final_cols": df.shape[1],
        "rows_removed": initial_rows - len(df),
        "retention_pct": round((len(df) / max(initial_rows, 1)) * 100, 2),
        "removed_missing_customer_id": missing_cust_count,
        "removed_cancelled_invoices": cancelled_count,
        "removed_non_positive_quantity": non_positive_qty_count,
        "removed_non_positive_price": non_positive_price_count,
        "removed_invalid_dates": invalid_date_count,
        "removed_duplicates": duplicate_count,
        "unique_customers": int(df["CustomerID"].nunique()),
        "unique_invoices": int(df["InvoiceNo"].nunique()),
        "total_revenue": round(float(df["TotalPrice"].sum()), 2),
        "date_min": df["InvoiceDate"].min(),
        "date_max": df["InvoiceDate"].max(),
    }

    return df, stats
