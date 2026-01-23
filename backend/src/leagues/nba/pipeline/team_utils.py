from src.common.image_urls import get_nba_team_logo_url
import pandas as pd
import re

TEAM_NAME_STANDARDIZATION = {
    "LA Clippers": "Los Angeles Clippers",
    "New Jersey Nets": "Brooklyn Nets",
    "Charlotte Bobcats": "Charlotte Hornets",
    "New Orleans Hornets": "New Orleans Pelicans",
}

def standardize_team_names(df: pd.DataFrame) -> pd.DataFrame:
    df["TEAM_NAME"] = df["TEAM_NAME"].replace(TEAM_NAME_STANDARDIZATION)
    return df

def extract_team_list(df: pd.DataFrame) -> pd.DataFrame:
    team_df = (
        df[["TEAM_ID", "TEAM_NAME"]]
        .drop_duplicates()
        .sort_values("TEAM_NAME")
        .reset_index(drop=True)
    )

    # Simple nickname extractor (works for most teams)
    def short_name(full: str) -> str:
        parts = full.split()
        if len(parts) >= 2 and parts[-1] == "Blazers":
            return " ".join(parts[-2:])   # "Trail Blazers"
        return parts[-1]                 # "Celtics", "76ers", etc.

    team_df["TEAM_SHORT_NAME"] = team_df["TEAM_NAME"].apply(short_name)
    team_df["TEAM_LOGO_URL"] = team_df["TEAM_ID"].apply(get_nba_team_logo_url)

    return team_df

def normalize_team_name(name: str | None) -> str:
    """
    Normalize a team name string so it matches names used in games.csv.
    Safe for comparisons and joins.
    """
    if not name:
        return ""

    n = str(name).strip().title()
    n = re.sub(r"\s+", " ", n)

    # Apply same historical mappings
    n = TEAM_NAME_STANDARDIZATION.get(n, n)

    return n