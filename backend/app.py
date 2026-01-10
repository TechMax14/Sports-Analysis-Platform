#  backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date
import pandas as pd
from src.configs.paths import CSV
from src.utils.response import csv_resp

app = Flask(__name__)
CORS(app, supports_credentials=True)

# ----------  LOAD GAMES HELPER  ----------
def load_games_df() -> pd.DataFrame:
    """
    Loads the cached NBA games schedule.

    GAME_DATE_EST is already normalized to YYYY-MM-DD and
    GAME_TIME_EST is a display-ready tipoff time in US/Eastern.
    """
    return pd.read_csv(CSV["nba_games"])

# ----------  HEALTH CHECK  ----------
@app.get("/api/health")
def health():
    return jsonify({k: v.exists() for k, v in CSV.items()})

# ----------  SINGLE-DAY MATCHUPS  ----------
@app.route("/api/schedule/daily")
def daily_schedule():
    """
    Optional query param: ?date=YYYY-MM-DD
    Defaults to today (UTC-5 = EST for NBA).
    Returns finished + future games for that day.
    """
    target = request.args.get("date") or date.today().isoformat()  # "YYYY-MM-DD"
    try:
        df = load_games_df()
        day_df = df[df["GAME_DATE_EST"] == target].copy()
        day_df = day_df.sort_values(["GAME_DATE_EST", "GAME_ID"])
        day_df = day_df.where(pd.notnull(day_df), None)
        return jsonify(day_df.to_dict(orient="records"))
    except Exception as e:
        print("daily_schedule error:", e)
        return jsonify([])
    
# ---------- SCHEDULE (DATE RANGE) ----------
@app.route("/api/schedule/range")
def schedule_range():
    """
    Query params:
      - start=YYYY-MM-DD
      - end=YYYY-MM-DD

    Returns all games where GAME_DATE_EST is between start and end (inclusive).
    """
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify([])
    try:
        df = load_games_df()
        out = df[(df["GAME_DATE_EST"] >= start) & (df["GAME_DATE_EST"] <= end)].copy()
        out = out.sort_values(["GAME_DATE_EST", "GAME_ID"])
        out = out.where(pd.notnull(out), None)
        return jsonify(out.to_dict(orient="records"))
    except Exception as e:
        print("schedule_range error:", e)
        return jsonify([])

# ----------  STANDINGS  ----------
@app.route("/api/standings")
def standings():
    return csv_resp("nba_standings")

# ----------  TEAM STATS (ALL SEASONS)  ----------
@app.route("/api/team-stats")
def get_team_stats():
    return csv_resp("nba_team_stats")

# ----------  TEAM LIST  ----------
@app.route("/api/teams")
def get_teams():
    return csv_resp("nba_teams")

# ----------  TEAM STATS BY ID  ----------
@app.route("/api/teams/<int:team_id>/stats")
def team_stats(team_id):
    return csv_resp("nba_team_stats", "TEAM_ID", team_id)

# ----------  TEAM ROSTER BY ID  ----------
@app.route("/api/teams/<int:team_id>/roster")
def team_roster(team_id):
    return csv_resp("nba_roster_master", "TEAM_ID", team_id)

# ----------  TOP PLAYERS  ----------
@app.route("/api/top-players")
def top_players():
    return csv_resp("nba_top_players")

if __name__ == "__main__":
    app.run(debug=True)