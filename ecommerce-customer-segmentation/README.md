# E-commerce Customer Segmentation: An RFM and K-Means Clustering Approach

An end-to-end Machine Learning and Business Analytics application that cleans e-commerce transaction data, computes **Recency, Frequency, and Monetary (RFM)** metrics, scores customers via quantile binning, applies **K-Means Clustering** with Elbow and Silhouette evaluation, and delivers actionable retention recommendations through an interactive **Streamlit** dashboard.

---

## Project Structure

```text
ecommerce-customer-segmentation/
│
├── app.py                        # Main 6-page Streamlit dashboard
├── requirements.txt              # Python dependencies
├── README.md                     # Documentation & execution guide
│
├── data/
│   └── sample_online_retail.csv  # Built-in sample dataset (UCI Online Retail schema)
│
├── src/
│   ├── __init__.py
│   ├── data_preprocessing.py     # 11-step transaction cleaning & validation
│   ├── rfm_analysis.py           # Customer-level Recency, Frequency, Monetary calculation
│   ├── rfm_scoring.py            # Rank-safe 1-5 quantile scoring & RFM categories
│   ├── clustering.py             # log1p transform, StandardScaler, Elbow, Silhouette, K-Means
│   ├── visualization.py          # Plotly 2D/3D charts & Seaborn RFM heatmap
│   └── business_insights.py      # Dynamic cluster naming, playbooks & PDF generation
│
├── reports/                      # Optional folder for saved exports
└── assets/                       # Static visual assets
```

---

## Machine Learning Pipeline

1. **Data Preprocessing (`src/data_preprocessing.py`):**
   - Standardizes `Online Retail` and `Online Retail II` column names.
   - Removes rows with missing `CustomerID`, cancelled invoices (`InvoiceNo` starting with `C`), `Quantity <= 0`, `UnitPrice <= 0`, invalid dates, and exact duplicates.
   - Computes `TotalPrice = Quantity * UnitPrice`.
2. **RFM Analysis (`src/rfm_analysis.py`):**
   - Sets `Reference Date = max(InvoiceDate) + 1 day`.
   - Computes `Recency`, `Frequency` (unique invoices), and `Monetary` (total spend) per customer.
3. **RFM Scoring (`src/rfm_scoring.py`):**
   - Uses rank-based quintile binning (`1` to `5`) so duplicate values or small datasets never fail.
   - Classifies customers into Champions, Loyal Customers, Potential Loyalists, Recent Customers, At Risk Customers, Hibernating Customers, and Lost Customers.
4. **K-Means Clustering (`src/clustering.py`):**
   - Applies `np.log1p` to reduce skew and `StandardScaler` to equalize feature variance.
   - Evaluates `k = 2..10` using Within-Cluster Sum of Squares (**Inertia / Elbow Method**) and **Silhouette Score**.
   - Fits K-Means (`k-means++`) for user-selected `k` and builds cluster profiles.
5. **Segment Interpretation (`src/business_insights.py`):**
   - Compares each cluster's mean R, F, and M values against population averages to assign meaningful names and tailored marketing playbooks.

---

## How to Run Locally on Windows (VS Code)

### 1. Open Project in VS Code
1. Open **Visual Studio Code**.
2. Click **File → Open Folder...** and select `ecommerce-customer-segmentation`.
3. Open a new terminal in VS Code (`Ctrl + ~` or **Terminal → New Terminal**).

### 2. Create and Activate a Virtual Environment
In the VS Code PowerShell or Command Prompt terminal:

```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows PowerShell:**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows Command Prompt (cmd):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Streamlit Dashboard
```bash
streamlit run app.py
```

Your browser will automatically open at `http://localhost:8501`. You can explore the built-in sample dataset immediately or upload your own UCI Online Retail CSV file from the sidebar.

---

## How to Upload This Project to GitHub

1. Initialize a Git repository inside `ecommerce-customer-segmentation`:
   ```bash
   git init
   ```
2. Create a `.gitignore` file containing:
   ```text
   venv/
   __pycache__/
   *.pyc
   .DS_Store
   ```
3. Stage and commit all project files:
   ```bash
   git add .
   git commit -m "Initial commit: E-commerce RFM & K-Means Customer Segmentation"
   ```
4. Create a new repository on [GitHub](https://github.com/new) (without initializing a README), then link and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/ecommerce-customer-segmentation.git
   git push -u origin main
   ```
