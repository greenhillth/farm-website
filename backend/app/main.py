from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

BASE_DIR = Path(__file__).resolve().parent.parent
# Allow override via env var to support local dev using repo-level ./data
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))


def read_json(path: Path) -> Any:
    if not path.exists():
        raise HTTPException(
            status_code=404, detail=f"Missing data file: {path.name}")
    try:
        import orjson

        return orjson.loads(path.read_bytes())
    except Exception as exc:  # pragma: no cover - simple io guard
        raise HTTPException(
            status_code=500, detail=f"Failed reading {path.name}: {exc}")


def read_first(*names: str) -> Any:
    for name in names:
        p = DATA_DIR / name
        if p.exists():
            return read_json(p)
    raise HTTPException(status_code=404, detail=f"None of {names!r} found in {DATA_DIR}")


def create_app() -> FastAPI:
    app = FastAPI(title="Farm API", version="0.1.0",
                  default_response_class=ORJSONResponse)

    # CORS: enabled by default for convenience, can be disabled with env
    disable_cors = os.getenv("DISABLE_CORS", "").lower() in {
        "1", "true", "yes"}
    if not disable_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["GET"],
            allow_headers=["*"]
        )

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"status": "ok"}

    @app.get("/api/data/farm")
    def farm_geojson() -> Any:
        return read_json(DATA_DIR / "farm.geojson")

    # Backwards-compat: support both /optima and /optimal
    @app.get("/api/data/optima")
    def optima() -> Any:
        return read_first("optima.json", "optimal_bounds.json")

    @app.get("/api/data/optimal")
    def optimal_alias() -> Any:
        return read_first("optimal_bounds.json", "optima.json")

    @app.get("/api/data/bounds")
    def bounds() -> Any:
        return read_json(DATA_DIR / "bounds.json")

    @app.get("/")
    def root() -> dict[str, str]:
        return {"message": "Farm API running", "docs": "/docs"}

    return app


app = create_app()
