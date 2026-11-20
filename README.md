# Leonida Legend — GTA VI Trophy Guide & Tracker

![gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)
![rank](https://make.fun/badge/gta6-trophy-guide-01/Zikri167/makefun-gta6-trophy-guide-01-v2/rank.svg)
![reward](https://make.fun/badge/gta6-trophy-guide-01/Zikri167/makefun-gta6-trophy-guide-01-v2/reward.svg)

An entry for the make.fun bounty [gta6-trophy-guide-01](https://make.fun/bounty/gta6-trophy-guide-01): an offline web app that guides and tracks all 55 PlayStation 5 trophies of Grand Theft Auto VI.

## What it does

- **Full tracker** — every one of the 55 official trophies with its exact name, description and grade; tick them off and progress is saved in the browser (localStorage), with JSON export and import.
- **Filters and search** — by kind (story, missable, collectibles, activities, online), by grade, by text, plus a hide-earned switch.
- **Spoiler shield** — a setting that masks the names and descriptions of the 28 hidden trophies until each one is earned.
- **Roadmap to the platinum** — five stages in the order we recommend playing them, each with its own progress bar: story first, cleanup, collectible sweeps, mastery and money, then 100% and the platinum. Difficulty (5.5/10) and time (75–95 hours) estimates included.
- **Missable watch-list** — 20 trophies flagged from their official descriptions alone (3 high-risk, 17 watch items), each with the reasoning spelled out.
- **A cited guide per trophy** — our own words, a step list, and named sources on every panel; progress counters for the trophies PlayStation itself counts (250 stunts, 42 range golds, 500 choices, and the rest), a personal notes field per trophy, and a "Next up" planner that always shows the shortest path forward from wherever you are.

## Run it

Serve `app/` with any static file server and open `index.html` in a desktop browser — for example, from this repository:

```
node serve.ts
```

then visit http://localhost:8080. The app works fully offline: every file it loads lives under `app/`, and it makes no network request at run time.

## Hand it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-frontend.ts` library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Data and sources

Trophy names, descriptions and grades are the official PlayStation 5 list exactly as published (the list mirrored by Exophase and cross-checked on PSNProfiles, including the progress counts PlayStation tracks). Guides, roadmap stages, steps and missable flags are this project's own work, reasoned from those official descriptions, and every trophy panel in the app names its sources. No Rockstar Games logos, artwork or fonts are used.

## License

MIT — see `LICENSE`.
