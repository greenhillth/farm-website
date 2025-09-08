# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

# System deps (add GDAL/GEOS if you need shapefiles server-side)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
# If using poetry/pdm/uv, adjust accordingly; otherwise:
RUN pip install --upgrade pip && pip install --no-cache-dir -e .

COPY app ./app
# Mount your data directory into /app/data via compose
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

