from __future__ import annotations

import time
from typing import Iterable, Optional

import pandas as pd
from nba_api.stats.endpoints import playergamelog

from src.common.paths import CSV
from src.leagues.nba.pipeline.nba_season import current_nba_season


KEEP_COLS = [
    "GAME_ID",
    "GAME_DATE",
    "MATCHUP",
    "WL",
    "MIN",
    "PTS",
    "REB",
    "AST",
]


def _load_player_index() -> pd.DataFrame:
    """
    Uses your roster master as the player index (PLAYER_ID, PLAYER_NAME, TEAM info).
    """
    roster_path = CSV["nba_roster_master"]
    df = pd.read_csv(roster_path)

    cols = [
        c for c in ["PLAYER_ID", "PLAYER_NAME", "TEAM_ID", "TEAM_ABBREVIATION"]
        if c in df.columns
    ]
    players = df[cols].drop_duplicates(subset=["PLAYER_ID"]).copy()

    players["PLAYER_ID"] = players["PLAYER_ID"].astype(int)
    players["PLAYER_NAME"] = players["PLAYER_NAME"].astype(str)

    return players

def _parse_matchup(matchup: str) -> tuple[str | None, bool | None]:
    """
    Returns (opponent_abbr, is_home)
    Examples:
      "LAL @ BOS"  -> ("BOS", False)
      "LAL vs BOS" -> ("BOS", True)
    """
    if not isinstance(matchup, str):
        return None, None

    if "@" in matchup:
        opp = matchup.split("@", 1)[1].strip()
        return opp, False
    if "vs" in matchup:
        opp = matchup.split("vs", 1)[1].strip()
        return opp, True

    return None, None

def build_player_game_logs_csv(
    *,
    season: Optional[str] = None,
    season_type: str = "Regular Season",
    sleep_s: float = 0.6,
    player_ids: Optional[Iterable[int]] = None,
) -> pd.DataFrame:
    """
    Build a canonical player game logs dataset (one row per player-game).
    Output is meant to be filtered by the API to return last 5/10 games.

    Notes:
    - This hits nba_api once per player (v1). Keep sleep_s to avoid rate limits.
    - You can later optimize by only updating recent days.
    """
    season = season or current_nba_season()

    players = _load_player_index()
    if player_ids is not None:
        pid_set = set(int(x) for x in player_ids)
        players = players[players["PLAYER_ID"].isin(pid_set)].copy()

    rows = []
    total = len(players)

    for i, p in enumerate(players.itertuples(index=False), start=1):
        pid = int(getattr(p, "PLAYER_ID"))
        pname = getattr(p, "PLAYER_NAME", None)

        try:
            resp = playergamelog.PlayerGameLog(
                player_id=pid,
                season=season,
                season_type_all_star=season_type,
            )
            df = resp.get_data_frames()[0]
        except Exception as e:
            print(f"[player_game_logs] error player_id={pid} name={pname}: {e}")
            if sleep_s > 0:
                time.sleep(sleep_s)
            continue

        if df is None or df.empty:
            if sleep_s > 0:
                time.sleep(sleep_s)
            continue

        # Normalize GAME_DATE: "JAN 15, 2026" -> "YYYY-MM-DD"
        if "GAME_DATE" in df.columns:
            df["GAME_DATE"] = pd.to_datetime(df["GAME_DATE"], errors="coerce").dt.date.astype(str)

        keep = [c for c in KEEP_COLS if c in df.columns]
        out = df[keep].copy()

        # Ensure GAME_ID exists even if missing from this player's df
        if "GAME_ID" not in out.columns:
            out["GAME_ID"] = df["GAME_ID"] if "GAME_ID" in df.columns else None

        out["PLAYER_ID"] = pid
        out["PLAYER_NAME"] = pname

        if "TEAM_ABBREVIATION" in df.columns:
            out["TEAM_ABBREVIATION"] = df["TEAM_ABBREVIATION"]
        if "TEAM_ID" in df.columns:
            out["TEAM_ID"] = df["TEAM_ID"]

        # ---- NEW: derive opponent + home/away splits from MATCHUP ----
        if "MATCHUP" in out.columns:
            parsed = out["MATCHUP"].apply(_parse_matchup)
            out["OPP_TEAM_ABBR"] = parsed.apply(lambda x: x[0])
            out["IS_HOME"] = parsed.apply(lambda x: x[1])
            out["IS_AWAY"] = out["IS_HOME"].apply(lambda x: None if x is None else (not x))
        else:
            out["OPP_TEAM_ABBR"] = None
            out["IS_HOME"] = None
            out["IS_AWAY"] = None

        rows.append(out)

        # throttle
        if sleep_s > 0:
            time.sleep(sleep_s)

        if i % 50 == 0 or i == total:
            print(f"[player_game_logs] fetched {i}/{total} players")

    if not rows:
        return pd.DataFrame(columns=["PLAYER_ID", "PLAYER_NAME"] + KEEP_COLS)

    all_logs = pd.concat(rows, ignore_index=True)

    # Make types sane
    if "PLAYER_ID" in all_logs.columns:
        all_logs["PLAYER_ID"] = pd.to_numeric(all_logs["PLAYER_ID"], errors="coerce").astype("Int64")

    for col in ["PTS", "REB", "AST", "MIN"]:
        if col in all_logs.columns:
            all_logs[col] = pd.to_numeric(all_logs[col], errors="coerce")

    # Add metadata
    all_logs["SEASON"] = season
    all_logs["SEASON_TYPE"] = season_type

    # Sort newest first (only by columns that exist)
    sort_cols = [c for c in ["GAME_DATE", "GAME_ID"] if c in all_logs.columns]
    if sort_cols:
        all_logs = all_logs.sort_values(sort_cols, ascending=[False] * len(sort_cols))

    # Write output
    out_path = CSV["nba_player_game_logs"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    all_logs.to_csv(out_path, index=False, encoding="utf-8")

    return all_logs
