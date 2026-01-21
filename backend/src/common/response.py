# src/utils/response.py
from flask import jsonify
import pandas as pd
import numpy as np
from ..common.paths import CSV

def csv_resp(file_key: str, where_col=None, equals_val=None):
    path = CSV[file_key]
    if not path.exists():
        return jsonify({"error": f"{path.name} not found"}), 404

    df = pd.read_csv(path)

    df = df.replace([np.nan, np.inf, -np.inf], None)

    df = df.where(pd.notnull(df), None)

    if where_col and equals_val is not None:
        df = df[df[where_col] == int(equals_val)]
        if df.empty:
            return jsonify({"error": "Not found"}), 404
    return jsonify(df.to_dict(orient="records"))