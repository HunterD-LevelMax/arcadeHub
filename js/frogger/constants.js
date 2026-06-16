(function () {
  window.FroggerConstants = {
    GRID_COLS: 11,
    WRAP: 15,
    FROG_HALF_WIDTH: 0.4,
    FROG_START_X: 5,
    LIVES_MAX: 3,
    HIGH_SCORE_KEY: "crossyfrog",
    JUMP_MS: 160,
    HOP_COOLDOWN_MS: 160,
    INVINCIBLE_MS: 2000,
    LOOKAHEAD_ROWS: 20,
    CULL_BEHIND: 30,
    CAMERA_OFFSET: 4,

    CAR_COLORS: ["#FF7043", "#FFCA28", "#42A5F5", "#AB47BC", "#EF5350"],

    PALETTE: {
      skyTop: "#87CEEB",
      skyBottom: "#E3F2FD",
      cloud: "#FFFFFF",
      grassTop: "#7EC850",
      grassSide: "#5DA838",
      grassDark: "#4A9A2E",
      safeTop: "#8FD85A",
      roadTop: "#78909C",
      roadSide: "#546E7A",
      roadLine: "#B0BEC5",
      waterTop: "#4FC3F7",
      waterDeep: "#29B6F6",
      waterSide: "#039BE5",
      logTop: "#8D6E63",
      logSide: "#6D4C41",
      lilyTop: "#66BB6A",
      lilySide: "#43A047",
      turtleTop: "#388E3C",
      turtleSide: "#2E7D32"
    }
  };
})();
