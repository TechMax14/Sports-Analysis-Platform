const MLB_TO_ESPN_ABBR: Record<string, string> = {
  AZ: "ari",
  ARI: "ari",
  CWS: "chw",
  CHW: "chw",
  KC: "kc",
  KCR: "kc",
  SF: "sf",
  SFG: "sf",
  SD: "sd",
  SDP: "sd",
  TB: "tb",
  TBR: "tb",
  WSH: "wsh",
  WAS: "wsh",
  LAD: "lad",
  LAA: "laa",
  NYY: "nyy",
  NYM: "nym",
  BOS: "bos",
  BAL: "bal",
  TOR: "tor",
  MIL: "mil",
  MIN: "min",
  DET: "det",
  CLE: "cle",
  CIN: "cin",
  PIT: "pit",
  STL: "stl",
  CHC: "chc",
  ATL: "atl",
  MIA: "mia",
  PHI: "phi",
  HOU: "hou",
  SEA: "sea",
  TEX: "tex",
  COL: "col",
  ATH: "ath",
};

function toEspnMlbAbbr(teamAbbr?: string | null) {
  if (!teamAbbr) return "";
  const raw = teamAbbr.toUpperCase().trim();
  return MLB_TO_ESPN_ABBR[raw] || raw.toLowerCase();
}

export function getMlbTeamLogoUrl(teamAbbr?: string | null, dark = true) {
  const abbr = toEspnMlbAbbr(teamAbbr);
  if (!abbr) return "";
  return dark
    ? `https://a.espncdn.com/i/teamlogos/mlb/500-dark/${abbr}.png`
    : `https://a.espncdn.com/i/teamlogos/mlb/500/${abbr}.png`;
}

export function getMlbScoreboardLogoUrl(teamAbbr?: string | null, dark = true) {
  const abbr = toEspnMlbAbbr(teamAbbr);
  if (!abbr) return "";
  return dark
    ? `https://a.espncdn.com/i/teamlogos/mlb/500-dark/scoreboard/${abbr}.png`
    : `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${abbr}.png`;
}

export function getMlbHeadshotUrl(
  playerId: number,
  size: 120 | 240 | 360 | 720 = 240,
) {
  return `https://midfield.mlbstatic.com/v1/people/${playerId}/spots/${size}`;
}