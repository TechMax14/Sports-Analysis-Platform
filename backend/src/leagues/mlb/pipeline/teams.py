from __future__ import annotations

import pandas as pd
import statsapi


def _safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def fetch_mlb_teams(season: int | None = None) -> pd.DataFrame:
    """
    Pull canonical MLB team metadata from the MLB Stats API.
    Defaults to active MLB teams (sportId=1).
    """
    params = {
        "sportId": 1,
        "activeStatus": "Y",
    }
    if season is not None:
        params["season"] = season

    data = statsapi.get("teams", params)

    rows_out: list[dict] = []

    for team in data.get("teams", []):
        rows_out.append(
            {
                "TEAM_ID": team.get("id"),
                "TEAM_NAME": team.get("name"),
                "TEAM_ABBREVIATION": team.get("abbreviation"),
                "TEAM_CODE": team.get("teamCode"),
                "FILE_CODE": team.get("fileCode"),
                "FRANCHISE_NAME": team.get("franchiseName"),
                "CLUB_NAME": team.get("clubName"),
                "SHORT_NAME": team.get("shortName"),
                "LOCATION_NAME": team.get("locationName"),
                "ACTIVE": team.get("active"),
                "FIRST_YEAR_OF_PLAY": team.get("firstYearOfPlay"),

                "LEAGUE_ID": _safe_get(team, "league", "id"),
                "LEAGUE_NAME": _safe_get(team, "league", "name"),

                "DIVISION_ID": _safe_get(team, "division", "id"),
                "DIVISION_NAME": _safe_get(team, "division", "name"),

                "VENUE_ID": _safe_get(team, "venue", "id"),
                "VENUE_NAME": _safe_get(team, "venue", "name"),

                "SPRING_VENUE_ID": _safe_get(team, "springVenue", "id"),
                "SPRING_VENUE_NAME": _safe_get(team, "springVenue", "name"),
            }
        )

    df = pd.DataFrame(rows_out)

    if not df.empty:
        sort_cols = [c for c in ["LEAGUE_NAME", "DIVISION_NAME", "TEAM_NAME"] if c in df.columns]
        df = df.sort_values(sort_cols).reset_index(drop=True)

    return df