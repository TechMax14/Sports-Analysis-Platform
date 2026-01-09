# backend/src/data/schedule.py
from nba_api.stats.endpoints import scheduleleaguev2
import pandas as pd

def fetch_schedule(season: int) -> pd.DataFrame:
    """
    Returns the ENTIRE schedule (finished + future) for the given calendar year.
    Season string format: '2024-25'
    """
    season_str = f"{season - 1}-{str(season)[2:]}"
    sched = scheduleleaguev2.ScheduleLeagueV2(season=season_str)
    df = sched.get_data_frames()[0]

    # pick columns that actually exist
    keep = ["gameDateTimeEst", "gameId", "homeTeam_teamName", "awayTeam_teamName",
            "homeTeam_score", "awayTeam_score", "gameStatusText"]
    out = df[keep].copy()

    # normalise names to what front-end already expects
    out = out.rename(columns={
        "gameDateTimeEst": "GAME_DATE_EST",
        "gameId": "GAME_ID",
        "homeTeam_teamName": "HOME_TEAM",
        "awayTeam_teamName": "AWAY_TEAM",
        "homeTeam_score": "HOME_PTS",
        "awayTeam_score": "AWAY_PTS",
        "gameStatusText": "STATUS"
    })

    dt = pd.to_datetime(out["GAME_DATE_EST"], errors="coerce")

    # Keep date for filtering (YYYY-MM-DD)
    out["GAME_DATE_EST"] = dt.dt.date.astype(str)

    # Add time for display (e.g., "7:30 PM")
    out["GAME_TIME_EST"] = dt.dt.strftime("%I:%M %p").str.lstrip("0")

    # quick MATCHUP string  "AWAY @ HOME"
    out["MATCHUP"] = out["AWAY_TEAM"] + " @ " + out["HOME_TEAM"]

    def normalize_status(s):
        s = str(s).lower()
        if s.startswith("final"):
            return "FINAL"
        if "postponed" in s or s == "ppd":
            return "POSTPONED"
        return "UPCOMING"

    out["STATUS"] = out["STATUS"].apply(normalize_status)
    out["WL"] = out["STATUS"].apply(lambda s: "F" if s == "FINAL" else None)

    # keep only the columns the UI already reads
    return out[["GAME_DATE_EST", "GAME_TIME_EST", "GAME_ID", "MATCHUP", "HOME_TEAM", "AWAY_TEAM",
                "HOME_PTS", "AWAY_PTS", "STATUS", "WL"]]