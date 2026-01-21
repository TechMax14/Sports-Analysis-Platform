# backend/app.py
from __future__ import annotations

from datetime import date

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from src.common.paths import CSV
from src.common.response import csv_resp
from src.leagues.nba.api.nba_data import load_games_df
from src.leagues.nba.api.nba_leaders import get_leaders_payload

app = Flask(__name__)
CORS(app, supports_credentials=True)


def _records(df: pd.DataFrame):
    """Convert dataframe to JSON-serializable records (NaN -> None)."""
    return df.where(pd.notnull(df), None).to_dict(orient="records")


@app.get("/api/health")
def health():
    return jsonify({k: v.exists() for k, v in CSV.items()})


# ---------------- NBA: schedule ----------------
@app.get("/api/nba/schedule/daily")
def nba_daily_schedule():
    target = request.args.get("date") or date.today().isoformat()
    try:
        df = load_games_df()
        day_df = df[df["GAME_DATE_EST"] == target].copy().sort_values(["GAME_DATE_EST", "GAME_ID"])
        return jsonify(_records(day_df))
    except Exception as e:
        print("nba_daily_schedule error:", e)
        return jsonify([])


@app.get("/api/nba/schedule/range")
def nba_schedule_range():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify([])

    try:
        df = load_games_df()
        out = df[(df["GAME_DATE_EST"] >= start) & (df["GAME_DATE_EST"] <= end)].copy()
        out = out.sort_values(["GAME_DATE_EST", "GAME_ID"])
        return jsonify(_records(out))
    except Exception as e:
        print("nba_schedule_range error:", e)
        return jsonify([])


# Optional: raw games CSV (handy for debugging / reuse)
@app.get("/api/nba/games")
def nba_games():
    return csv_resp("nba_games")


# ---------------- NBA: CSV-backed endpoints ----------------
@app.get("/api/nba/standings")
def nba_standings():
    return csv_resp("nba_standings")


@app.get("/api/nba/team-stats")
def nba_team_stats_all():
    return csv_resp("nba_team_stats")


@app.get("/api/nba/teams")
def nba_teams():
    return csv_resp("nba_teams")


@app.get("/api/nba/teams/<int:team_id>/stats")
def nba_team_stats(team_id: int):
    return csv_resp("nba_team_stats", "TEAM_ID", team_id)


@app.get("/api/nba/teams/<int:team_id>/roster")
def nba_team_roster(team_id: int):
    return csv_resp("nba_roster_master", "TEAM_ID", team_id)


@app.get("/api/nba/top-players")
def nba_top_players():
    return csv_resp("nba_top_players")


# ---------------- NBA: computed endpoints ----------------
@app.get("/api/nba/leaders")
def nba_league_leaders():
    min_gp = request.args.get("min_gp") or request.args.get("minGp") or 10
    limit = request.args.get("limit") or 5

    try:
        payload = get_leaders_payload(min_gp=int(min_gp), limit=int(limit))
        return jsonify(payload)
    except Exception as e:
        print("nba_league_leaders error:", e)
        return jsonify({"minGp": int(min_gp), "limit": int(limit), "cards": []})


if __name__ == "__main__":
    app.run(debug=True)
