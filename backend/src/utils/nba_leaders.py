# src/utils/nba_leaders.py
from __future__ import annotations

from typing import Any, Dict, List, Optional

import pandas as pd

from src.utils.nba_data import load_master_roster_df


def _fmt(v: Any, fmt: str) -> Optional[float]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        x = float(v)
    except Exception:
        return None

    if fmt == "pct":
        # CSV stores FG_PCT as 0.451 -> return 45.1
        return round(x * 100, 1)
    if fmt == "0dp":
        return float(int(round(x)))
    return round(x, 1)


def _leaderboard(
    df: pd.DataFrame,
    *,
    stat: str,
    title: str,
    fmt: str,
    mode: str,
    limit: int,
) -> Optional[Dict[str, Any]]:
    if stat not in df.columns:
        return None

    id_cols = ["PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION", "GP"]
    use = df[[c for c in id_cols if c in df.columns] + [stat]].copy()

    # Ensure required cols exist (so tuple access doesn't explode)
    for c in id_cols:
        if c not in use.columns:
            use[c] = None

    use[stat] = pd.to_numeric(use[stat], errors="coerce")
    use["GP"] = pd.to_numeric(use["GP"], errors="coerce")

    counting = {"PTS", "REB", "AST", "STL", "BLK", "TOV", "MIN"}
    if mode == "totals" and stat in counting:
        use["VALUE"] = use[stat] * use["GP"]
        value_col = "VALUE"
    else:
        value_col = stat

    use[value_col] = pd.to_numeric(use[value_col], errors="coerce")
    use = use.dropna(subset=[value_col])

    if use.empty:
        return None

    use = use.sort_values(value_col, ascending=False).head(max(1, limit))

    top: List[Dict[str, Any]] = []
    for i, row in enumerate(use.itertuples(index=False), start=1):
        top.append(
            {
                "rank": i,
                "playerId": int(row.PLAYER_ID) if row.PLAYER_ID is not None else None,
                "name": row.PLAYER_NAME,
                "teamId": int(row.TEAM_ID) if row.TEAM_ID is not None else None,
                "teamAbbr": row.TEAM_ABBREVIATION,
                "value": _fmt(getattr(row, value_col), fmt),
                "gp": float(row.GP) if row.GP is not None else None,
            }
        )

    return {
        "key": stat,
        "title": title,
        "mode": mode,
        "format": fmt,
        "leader": top[0] if top else None,
        "top": top,
    }


def get_leaders_payload(*, mode: str = "perGame", min_gp: int = 10, limit: int = 5) -> Dict[str, Any]:
    """
    Returns:
      { mode, minGp, limit, cards: [...] }

    mode:
      - perGame: uses CSV per-game fields
      - totals: multiplies counting stats by GP (PTS/REB/AST/STL/BLK/TOV/MIN)
    """
    mode = "totals" if (mode or "").lower() in {"total", "totals"} else "perGame"
    limit = max(1, min(int(limit), 25))
    min_gp = max(0, min(int(min_gp), 82))

    df = load_master_roster_df()

    if "GP" in df.columns:
        df = df[df["GP"].fillna(0) >= min_gp]

    cards = [
        _leaderboard(df, stat="PTS", title="Points", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="AST", title="Assists", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="REB", title="Rebounds", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="MIN", title="Minutes", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="STL", title="Steals", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="BLK", title="Blocks", fmt="1dp", mode=mode, limit=limit),
        _leaderboard(df, stat="FG3_PCT", title="3PT%", fmt="pct", mode=mode, limit=limit),
        _leaderboard(df, stat="FG_PCT", title="FG%", fmt="pct", mode=mode, limit=limit),
        _leaderboard(df, stat="FT_PCT", title="FT%", fmt="pct", mode=mode, limit=limit),
        _leaderboard(df, stat="TOV", title="Turnovers", fmt="1dp", mode=mode, limit=limit),
    ]

    return {
        "mode": mode,
        "minGp": min_gp,
        "limit": limit,
        "cards": [c for c in cards if c is not None],
    }
