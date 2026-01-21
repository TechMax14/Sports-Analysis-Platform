# src/utils/nba_data.py
from __future__ import annotations

import os
from typing import Any, Dict

import pandas as pd

from src.common.paths import CSV

_MASTER_CACHE: Dict[str, Any] = {"path": None, "mtime": None, "df": None}
_GAMES_CACHE: Dict[str, Any] = {"path": None, "mtime": None, "df": None}


def _load_csv_cached(cache: Dict[str, Any], csv_key: str) -> pd.DataFrame:
    path = str(CSV[csv_key])
    mtime = os.path.getmtime(path)

    if cache["df"] is None or cache["path"] != path or cache["mtime"] != mtime:
        cache["df"] = pd.read_csv(path)
        cache["path"] = path
        cache["mtime"] = mtime

    # return a copy so callers can filter/sort safely
    return cache["df"].copy()


def load_games_df() -> pd.DataFrame:
    return _load_csv_cached(_GAMES_CACHE, "nba_games")


def load_master_roster_df() -> pd.DataFrame:
    df = _load_csv_cached(_MASTER_CACHE, "nba_roster_master")

    # light normalization so sorting/filters are safe
    for c in ["PLAYER_ID", "TEAM_ID"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")

    num_cols = [
        "GP",
        "MIN",
        "PTS",
        "REB",
        "AST",
        "STL",
        "BLK",
        "TOV",
        "FG_PCT",
        "FG3_PCT",
        "FT_PCT",
    ]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    return df
