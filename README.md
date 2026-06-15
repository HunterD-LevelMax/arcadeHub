# \# Arcade Hub

# 

# A retro neon arcade — a collection of classic browser games with a shared high-score system, in-game economy, and a unified arcade UI.

# 

# \## Project structure

# 

# ```

# arcadeHub/

# ├── index.html          # Main page with game cards

# ├── games/               # Game HTML files

# ├── style/               # CSS files (main.css, game.css, per-game styles)

# └── js/                   # Shared utilities (game.js, haptics.js, economy.js, main.js)

# ```

# 

# \## Games

# 

# | # | Game | Genre | Description |

# |---|------|-------|-------------|

# | 01 | \*\*Prism Cascade\*\* | Puzzle / Timed | Drag and swap glowing gems, chain matches into cascading combos, race the clock. |

# | 02 | \*\*Crossy Frog\*\* | Classic | Help the frog cross the road and river. Avoid cars, jump on logs and get to safety. |

# | 03 | \*\*Space Blocks\*\* | Puzzle / Arcade | Classic block puzzle game. Rotate and place falling tetrominos, clear lines and get the highest score. |

# | 04 | \*\*Snake\*\* | Classic / Arcade | Eat food, grow longer, don't hit yourself or the walls. |

# | 05 | \*\*Asteroids\*\* | Shooter / Arcade | Destroy asteroids, dodge debris. Survive in open space as long as you can. |

# | 06 | \*\*Fly Hard\*\* | Casual / One-tap | One tap and the bird flies. Dodge pipes, collect points, beat your high score. |

# | 07 | \*\*Space Hopper\*\* | Platform / Endless | Jump higher on platforms. Moving, breaking, spring-loaded — don't let yourself fall. |

# | 08 | \*\*Space Aliens\*\* | Shooter / Classic | Defend Earth from alien waves. Shoot aliens, use bombs, survive as long as possible. |

# | 09 | \*\*Neon 2048\*\* | Puzzle / Strategy | Slide tiles, merge matching numbers, and chase the legendary 2048 tile. |

# | 10 | \*\*Stack Tower\*\* | One-tap / Skill | Tap to drop blocks, align perfectly, and build the tallest neon tower you can. |

# | 11 | \*\*Thrust Runner\*\* | Endless / Skill | Hold to thrust, release to fall. Weave through the tunnel, dodge obstacles, collect crystals. |

# 

# \## Features

# 

# \- Unified neon arcade UI with animated canvas previews on the main hub

# \- Per-game high score tracking

# \- Shared coin economy and player profile

# \- Haptic feedback support

# \- Mobile-friendly touch controls (tap / drag / hold, depending on the game)

# 

# \## Development

# 

# New games are added following the conventions described in `rules.md` (shared HTML/CSS structure, required UI element IDs, high score API, and main-page card template).

