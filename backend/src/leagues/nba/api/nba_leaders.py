# src/utils/nba_leaders.py
from __future__ import annotations

from typing import Any, Dict, List, Optional

import pandas as pd

from src.leagues.nba.api.nba_data import load_master_roster_df

import math

# ---------------- qualifiers ----------------
def _apply_qualifiers(df: pd.DataFrame, *, qualify_pct: float = 0.70) -> pd.DataFrame:
    """
    ESPN-style qualifier: player must play >= qualify_pct of his team's games.
    Uses team games played to date approximated by max player GP on that team.
    """
    if "TEAM_ID" not in df.columns or "GP" not in df.columns:
        return df

    team_games = df.groupby("TEAM_ID")["GP"].max().to_dict()
    req = df["TEAM_ID"].map(team_games).fillna(0) * qualify_pct
    req = req.apply(lambda x: math.ceil(x))

    return df[df["GP"].fillna(0) >= req]

# ---------------- formatting ----------------
def _fmt(v: Any, fmt: str) -> Optional[float]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        x = float(v)
    except Exception:
        return None

    if fmt == "pct":
        # stored as 0.451 -> display 45.1
        return round(x * 100, 1)
    if fmt == "0dp":
        return float(int(round(x)))
    return round(x, 1)

# ---------------- helper: totals ----------------
def _tot(df: pd.DataFrame, col: str) -> pd.Series:
    return pd.to_numeric(df.get(col), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")

# ---------------- leader computation ----------------
def _compute_series(df: pd.DataFrame, expr: str) -> pd.Series:
    """
    Supported expressions:
      - "COL" (use per-game column)
      - "COL*GP" (totals derived from per-game)
      - "DIV(A,B)" (safe divide)
      - "FG_PCT_TOT" = (FGM*GP)/(FGA*GP)
      - "FG3_PCT_TOT" = (FG3M*GP)/(FG3A*GP)
      - "FT_PCT_TOT" = (FTM*GP)/(FTA*GP)
    """
    expr = expr.strip()

    if expr.endswith("*GP"):
        col = expr[:-3]
        return pd.to_numeric(df.get(col), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")

    if expr == "FG_PCT_TOT":
        fgm = pd.to_numeric(df.get("FGM"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        fga = pd.to_numeric(df.get("FGA"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        return fgm / fga

    if expr == "FG3_PCT_TOT":
        m = pd.to_numeric(df.get("FG3M"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        a = pd.to_numeric(df.get("FG3A"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        return m / a

    if expr == "FT_PCT_TOT":
        m = pd.to_numeric(df.get("FTM"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        a = pd.to_numeric(df.get("FTA"), errors="coerce") * pd.to_numeric(df.get("GP"), errors="coerce")
        return m / a
    
    if expr == "TSA_TOT":
        fga = _tot(df, "FGA")
        fta = _tot(df, "FTA")
        return fga + 0.44 * fta

    # simple column
    return pd.to_numeric(df.get(expr), errors="coerce")


def _leaderboard_from_expr(
    df: pd.DataFrame,
    *,
    expr: str,
    fmt: str,
    limit: int,
    attempts_expr: str | None = None,
    min_attempts: float = 0,
) -> Dict[str, Any]:
    id_cols = ["PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "GP"]
    use = df[[c for c in id_cols if c in df.columns]].copy()

    # ensure required fields exist
    for c in id_cols:
        if c not in use.columns:
            use[c] = None

    values = _compute_series(df, expr)
    use["VALUE"] = values

    if attempts_expr:
        use["ATT"] = _compute_series(df, attempts_expr)
        use = use.dropna(subset=["ATT"])
        use = use[use["ATT"] > min_attempts]

    use = use.dropna(subset=["VALUE"])
    use = use.sort_values("VALUE", ascending=False).head(max(1, limit))

    top: List[Dict[str, Any]] = []
    for i, row in enumerate(use.itertuples(index=False), start=1):
        top.append(
            {
                "rank": i,
                "playerId": int(row.PLAYER_ID) if row.PLAYER_ID is not None else None,
                "name": row.PLAYER_NAME,
                "teamId": int(row.TEAM_ID) if row.TEAM_ID is not None else None,
                "teamAbbr": row.TEAM_ABBREVIATION,
                "value": _fmt(row.VALUE, fmt),
                "gp": float(row.GP) if row.GP is not None else None,
            }
        )

    return {"leader": top[0] if top else None, "top": top}


def _card(
    *,
    card_key: str,
    title: str,
    options: List[Dict[str, Any]],
    default_option_key: str,
    df: pd.DataFrame,
    limit: int,
) -> Dict[str, Any]:
    leaders_by_option: Dict[str, Any] = {}

    for opt in options:
        opt_key = opt["key"]
        expr = opt["expr"]
        fmt = opt["format"]
        leaders_by_option[opt_key] = _leaderboard_from_expr(
            df,
            expr=expr,
            fmt=fmt,
            limit=limit,
            attempts_expr=opt.get("attemptsExpr"),
            min_attempts=opt.get("minAttempts", 0),
        )

    return {
        "cardKey": card_key,
        "title": title,
        "options": [{"key": o["key"], "label": o["label"], "format": o["format"]} for o in options],
        "defaultOptionKey": default_option_key,
        "leadersByOption": leaders_by_option,
    }


# ---------------- public API ----------------
def get_leaders_payload(*, min_gp: int = 10, limit: int = 5) -> Dict[str, Any]:
    limit = max(1, min(int(limit), 25))
    min_gp = max(0, min(int(min_gp), 82))

    df = load_master_roster_df()
    df = _apply_qualifiers(df, qualify_pct=0.70)

    # basic filter
    if "GP" in df.columns:
        df = df[df["GP"].fillna(0) >= min_gp]

    cards: List[Dict[str, Any]] = []

    # Points
    cards.append(
        _card(
            card_key="points",
            title="Points",
            default_option_key="ppg",
            options=[
                {"key": "ppg", "label": "PPG", "expr": "PTS", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "PTS*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    # Assists
    cards.append(
        _card(
            card_key="assists",
            title="Assists",
            default_option_key="apg",
            options=[
                {"key": "apg", "label": "APG", "expr": "AST", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "AST*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    # Rebounds (includes splits)
    cards.append(
        _card(
            card_key="rebounds",
            title="Rebounds",
            default_option_key="trb_pg",
            options=[
                {"key": "trb_pg", "label": "TRB/G", "expr": "REB", "format": "1dp"},
                {"key": "trb_total", "label": "TRB", "expr": "REB*GP", "format": "0dp"},
                {"key": "oreb_pg", "label": "OREB/G", "expr": "OREB", "format": "1dp"},
                {"key": "dreb_pg", "label": "DREB/G", "expr": "DREB", "format": "1dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    # Shooting (FG makes + FG% + TS% + FT)
    cards.append(
        _card(
            card_key="shooting",
            title="Shooting",
            default_option_key="fgm_pg",
            options=[
                {"key":"fg_pct","label":"FG%","expr":"FG_PCT_TOT","format":"pct",
                "attemptsExpr":"FGA*GP","minAttempts": 200},
                {"key":"fgm_total","label":"FGM","expr":"FGM*GP","format":"0dp"},
                {"key":"fgm_pg","label":"FGM/G","expr":"FGM","format":"1dp"},

                {"key":"ts_pct","label":"TS%","expr":"TS_PCT","format":"pct",
                "attemptsExpr":"TSA_TOT","minAttempts": 200},

                # NEW: Free throws inside shooting
                {"key":"ft_pct","label":"FT%","expr":"FT_PCT_TOT","format":"pct",
                "attemptsExpr":"FTA*GP","minAttempts": 50},

                {"key":"ftm_pg","label":"FTM/G","expr":"FTM","format":"1dp"},
                {"key":"ftm_total","label":"FTM","expr":"FTM*GP","format":"0dp"},
            ],
            df=df,
            limit=limit
        )
    )

    # 3PT
    cards.append(
        _card(
            card_key="threept",
            title="3PT",
            default_option_key="made_pg",
            options=[
                {"key":"made_pg","label":"3PM/G","expr":"FG3M","format":"1dp"},
                {"key":"made_total","label":"3PM","expr":"FG3M*GP","format":"0dp"},
                {"key":"pct","label":"3P%","expr":"FG3_PCT_TOT","format":"pct",
                "attemptsExpr":"FG3A*GP","minAttempts": 75},   # >0 attempts filter
            ],
            df=df,
            limit=limit
        )
    )

    # Minutes
    cards.append(
        _card(
            card_key="minutes",
            title="Minutes",
            default_option_key="mpg",
            options=[
                {"key": "mpg", "label": "MPG", "expr": "MIN", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "MIN*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    # Defense
    cards.append(
        _card(
            card_key="steals",
            title="Steals",
            default_option_key="spg",
            options=[
                {"key": "spg", "label": "SPG", "expr": "STL", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "STL*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )
    cards.append(
        _card(
            card_key="blocks",
            title="Blocks",
            default_option_key="bpg",
            options=[
                {"key": "bpg", "label": "BPG", "expr": "BLK", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "BLK*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    # Turnovers
    cards.append(
        _card(
            card_key="turnovers",
            title="Turnovers",
            default_option_key="tpg",
            options=[
                {"key": "tpg", "label": "TOV/G", "expr": "TOV", "format": "1dp"},
                {"key": "total", "label": "Total", "expr": "TOV*GP", "format": "0dp"},
            ],
            df=df,
            limit=limit,
        )
    )

    return {"minGp": min_gp, "limit": limit, "cards": cards}
