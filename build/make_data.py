# build/make_data.py
import os, json
import numpy as np, pandas as pd, geopandas as gpd

SHP_PATH  = "geodata/farm.shp"
CSV_PATH  = "datasets/soil-tests.csv"
OUT_DIR   = "data"
METRICS   = ["OM","P1","K","MG","CA","PH"]
OPTIMAL   = {"OM":(3.25,5.2),"P1":(40,90),"K":(245,400),"MG":(220,440),"CA":(1950,3450),"PH":(6,7)}

def ci_get(cols, name):
  nl, nl2 = str(name).strip().lower(), [str(c).strip().lower() for c in cols]
  return next((c for c,low in zip(cols,nl2) if low==nl), None)

def to_intlike_str(s):
  s = pd.Series(s)
  as_num = pd.to_numeric(s, errors="coerce")
  out = s.astype(str)
  mask = as_num.notna()
  out[mask] = as_num[mask].astype(np.int64).astype(str)
  return out.astype(str).str.strip().str.replace(r"\.0$","",regex=True).replace({"":"", "nan":"", "None":""})

def make_numeric(series):
  return pd.to_numeric(pd.Series(series).astype(str).str.replace(",", "", regex=False), errors="coerce")

gdf = gpd.read_file(SHP_PATH)
if gdf.crs and gdf.crs.to_epsg() != 4326:
  gdf = gdf.to_crs(epsg=4326)

shp_id = next((c for c in gdf.columns if str(c).lower() in {"adsfldid","fieldid","id"}), None)
shp_nm = next((c for c in gdf.columns if str(c).lower() in {"fieldname","paddock","name","label"}), None)
if shp_id: gdf["fieldID"] = to_intlike_str(gdf[shp_id])
if shp_nm: gdf["fieldName"] = gdf[shp_nm].astype(str).str.strip()

df = pd.read_csv(CSV_PATH)
excel_id = ci_get(df.columns, "ADSFLDID")
excel_nm = ci_get(df.columns, "FIELDNAME")
date_col = ci_get(df.columns, "Sample Date")
if excel_id: df["fieldID"] = to_intlike_str(df[excel_id])
if excel_nm: df["fieldName"] = df[excel_nm].astype(str).str.strip()
if date_col: df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors="coerce")

for m in METRICS:
  c = ci_get(df.columns, m)
  if c: df[m] = make_numeric(df[c])

# latest per field
key = "fieldID" if "fieldID" in gdf.columns and "fieldID" in df.columns else "fieldName"
latest = df.dropna(subset=[key]).sort_values(date_col or df.columns[0]).groupby(key, as_index=False).tail(1)

merged = gdf.merge(latest[[key]+[m for m in METRICS if m in latest]], on=key, how="left")

# bounds
minx, miny, maxx, maxy = merged.total_bounds
bounds = [[float(miny), float(minx)], [float(maxy), float(maxx)]]

os.makedirs(OUT_DIR, exist_ok=True)
merged.to_file(os.path.join(OUT_DIR, "farm.geojson"), driver="GeoJSON")
with open(os.path.join(OUT_DIR, "optima.json"), "w") as f: json.dump(OPTIMAL, f)
with open(os.path.join(OUT_DIR, "bounds.json"), "w") as f: json.dump(bounds, f)

print("Wrote data/farm.geojson, data/optima.json, data/bounds.json")
