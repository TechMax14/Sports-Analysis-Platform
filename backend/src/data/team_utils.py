from src.utils.image_urls import get_team_logo_url
import pandas as pd

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

    team_df["TEAM_LOGO_URL"] = team_df["TEAM_ID"].apply(get_team_logo_url)

    return team_df
