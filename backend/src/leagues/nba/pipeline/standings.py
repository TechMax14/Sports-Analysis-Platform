from nba_api.stats.endpoints import leaguestandings
import pandas as pd

def fetch_standings(season: int) -> pd.DataFrame:
    """Returns current league standings DataFrame."""
    season_str = f"{season - 1}-{str(season)[2:]}"
    ls = leaguestandings.LeagueStandings(season=season_str)
    df = ls.get_data_frames()[0]
    # keep only what the front-end needs
    return df[["TeamID", "TeamName", "Conference", "ConferenceRecord",
               "Division", "DivisionRecord", "WINS", "LOSSES", "WinPCT"]]