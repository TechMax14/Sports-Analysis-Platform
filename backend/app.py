#  backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import date
import pandas as pd
from src.configs.paths import CSV
from src.utils.response import csv_resp

app = Flask(__name__)
CORS(app, supports_credentials=True)

# ----------  HEALTH CHECK  ----------
@app.get("/api/health")
def health():
    return jsonify({k: v.exists() for k, v in CSV.items()})

# ----------  SINGLE-DAY SCHEDULE  ----------
@app.route("/api/schedule/daily")
def daily_schedule():
    """
    Optional query param: ?date=YYYY-MM-DD
    Defaults to today (UTC-5 = EST for NBA).
    Returns finished + future games for that day.
    """
    target = request.args.get("date") or date.today().isoformat()  # "YYYY-MM-DD"
    try:
        df = pd.read_csv(CSV["nba_games"])
        # strip the time part -> "YYYY-MM-DD"
        df["GAME_DATE_EST"] = (
            pd.to_datetime(df["GAME_DATE_EST"], utc=True)
            .dt.tz_convert("US/Eastern")
            .dt.date
            .astype(str)
        )
        day_df = df[df["GAME_DATE_EST"] == target].copy()
        day_df = day_df.where(pd.notnull(day_df), None)
        return jsonify(day_df.to_dict(orient="records"))
    except Exception as e:
        print("daily_schedule error:", e)
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
    return csv_resp("nba_rosters", "TEAM_ID", team_id)

# ----------  TOP PLAYERS  ----------
@app.route("/api/top-players")
def top_players():
    return csv_resp("nba_top_players")

if __name__ == "__main__":
    app.run(debug=True)