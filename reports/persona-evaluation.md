# Play-style recommendation evaluation

> Historical evaluation of the deprecated SQLite/Turso catalog and synthetic ranking inputs. This report is not an evaluation of the active live RoTunnel provider or current Roblox data. The evaluator and its data dependencies are retained under `scripts/deprecated/` for reference.

Generated: 2026-11-21T16:26:52.879Z
Evaluation clock: 2024-11-13T09:56:00.000Z
Catalog: 1,027 valid records (/Users/abid/dev/oss/discover/data/roblox-games.db)
Profiles: 12 · Results per profile: 40

## Overall results

- Unique games across all profile result sets: **219** of 480 result slots.
- Mean pairwise top-result Jaccard overlap: **12.4%** (maximum 53.8%).
- Mean preferred-genre share: **93.1%**.
- Mean preferred-genre lift over the unpersonalized baseline: **+63.5 percentage points**.

## Profile results

| Profile               | Preferred genres        | Preferred share | Baseline share |     Lift | Mean match | Top genres                                    |
| --------------------- | ----------------------- | --------------: | -------------: | -------: | ---------: | --------------------------------------------- |
| Competitive climber   | Action RPG, Racing      |           95.0% |          32.5% | +62.5 pp |       91.8 | Action RPG (33), Racing (5), Exploration (1)  |
| Social explorer       | Co-op, Exploration      |           92.5% |          47.5% | +45.0 pp |       95.3 | Co-op (33), Exploration (4), Action RPG (1)   |
| Creative builder      | Simulation, Puzzle      |           92.5% |           7.5% | +85.0 pp |       91.8 | Simulation (27), Puzzle (10), Co-op (2)       |
| Thrill seeker         | Horror, Co-op           |           97.5% |          52.5% | +45.0 pp |       94.9 | Horror (26), Co-op (13), Exploration (1)      |
| Completionist         | Action RPG, Simulation  |           90.0% |          35.0% | +55.0 pp |       90.0 | Action RPG (33), Simulation (3), Co-op (1)    |
| Casual browser        | Puzzle, Racing          |           95.0% |           5.0% | +90.0 pp |       94.8 | Puzzle (31), Racing (7), Action RPG (1)       |
| Story seeker          | Exploration, Horror     |           95.0% |          20.0% | +75.0 pp |       92.4 | Horror (21), Exploration (17), Action RPG (1) |
| Speedrunner           | Racing, Action RPG      |           95.0% |          32.5% | +62.5 pp |       90.2 | Action RPG (27), Racing (11), Exploration (1) |
| Tactician             | Puzzle, Simulation      |           92.5% |           7.5% | +85.0 pp |       88.3 | Simulation (20), Puzzle (17), Co-op (2)       |
| Open-world adventurer | Exploration, Action RPG |           92.5% |          37.5% | +55.0 pp |       92.4 | Action RPG (25), Exploration (12), Co-op (1)  |
| Party player          | Co-op, Racing           |           87.5% |          42.5% | +45.0 pp |       92.8 | Co-op (31), Racing (4), Action RPG (1)        |
| Collector             | Simulation, Action RPG  |           92.5% |          35.0% | +57.5 pp |       88.5 | Action RPG (30), Simulation (7), Co-op (1)    |

## Top results by profile

### Competitive climber

Preferred genres: Action RPG, Racing. Top-result overlap with unpersonalized baseline: 19.4%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | RIVALS                                        | Action RPG  |    98 | 83.23 |
|   2 | Realistic Street Soccer (3 on 3)              | Racing      |    85 | 77.66 |
|   3 | Blade Ball                                    | Action RPG  |    98 | 76.16 |
|   4 | [🎃UPDATE] Grand Piece Online                 | Action RPG  |    98 | 74.59 |
|   5 | Blackhawk Rescue Mission 5                    | Action RPG  |    98 | 72.90 |
|   6 | Death Ball                                    | Action RPG  |    98 | 72.57 |
|   7 | [🦇] Heroes Battlegrounds                     | Action RPG  |    97 | 71.68 |
|   8 | Phantom Forces                                | Action RPG  |    98 | 71.62 |
|   9 | [🕷️HALLOWEEN🕸️] A Universal Time 3.9 🎃       | Action RPG  |    97 | 71.51 |
|  10 | Shindo Life [239]                             | Action RPG  |    98 | 71.40 |
|  11 | [UPDATE 1] Project: Afternight                | Action RPG  |    98 | 70.91 |
|  12 | Zombie Uprising                               | Action RPG  |    98 | 70.73 |
|  13 | Blox Fruits                                   | Action RPG  |    86 | 70.63 |
|  14 | ⚓ Harbor Havoc                               | Action RPG  |    98 | 70.26 |
|  15 | [NEW CASE] fight in a school                  | Action RPG  |    97 | 70.26 |
|  16 | Saber Showdown                                | Action RPG  |    98 | 70.25 |
|  17 | [W14] Skateboard Obby                         | Puzzle      |    71 | 69.87 |
|  18 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    86 | 69.47 |
|  19 | BedWars [⌚ REBOOT]                           | Action RPG  |    85 | 69.44 |
|  20 | The Strongest Battlegrounds                   | Action RPG  |    85 | 69.42 |
|  21 | [🎃 UPD] King Legacy                          | Action RPG  |    86 | 69.30 |
|  22 | Find The Markers (237)                        | Exploration |    71 | 69.19 |
|  23 | Guts &amp; Blackpowder                        | Action RPG  |    86 | 69.17 |
|  24 | Team Soccer (3 vs. 3)                         | Racing      |    97 | 68.90 |
|  25 | Gunfight Arena                                | Action RPG  |    98 | 68.61 |
|  26 | Ben 10 Super Hero Time                        | Action RPG  |    97 | 68.58 |
|  27 | [PERFECTION] Jujutsu Shenanigans              | Action RPG  |    85 | 68.51 |
|  28 | ⚽️Ultimate Soccer                             | Racing      |    98 | 68.39 |
|  29 | [💰] Dungeon Quest! ⚔️ RPG Adventure          | Action RPG  |    98 | 68.11 |
|  30 | [YUTA] Jujutsu Beatdown                       | Action RPG  |    86 | 68.08 |
|  31 | Legends Arena                                 | Action RPG  |    98 | 68.04 |
|  32 | Murderers VS Sheriffs Duels                   | Action RPG  |    85 | 67.86 |
|  33 | ⚡Race Clicker                                | Racing      |    86 | 67.85 |
|  34 | Slap Battles👏                                | Action RPG  |    85 | 67.83 |
|  35 | ENTRENCHED WW1 BETA                           | Action RPG  |    98 | 67.82 |
|  36 | Jailbreak 🍁                                  | Action RPG  |    85 | 67.75 |
|  37 | Randomizer                                    | Action RPG  |    97 | 67.74 |
|  38 | [🎃PART 2] KJ ARENA                           | Action RPG  |    98 | 67.64 |
|  39 | Apocalypse Rising 2                           | Action RPG  |    86 | 67.64 |
|  40 | [🎃] Super League Soccer                      | Racing      |    85 | 67.62 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Social explorer

Preferred genres: Co-op, Exploration. Top-result overlap with unpersonalized baseline: 35.6%.

|   # | Experience                                       | Genre       | Match | Score |
| --: | ------------------------------------------------ | ----------- | ----: | ----: |
|   1 | Adopt Me!                                        | Co-op       |    97 | 82.41 |
|   2 | Secret Staycation                                | Exploration |    97 | 80.18 |
|   3 | Regretevator [ ELEVATOR SIMULATOR ]              | Co-op       |    98 | 74.44 |
|   4 | Dress To Impress 💜                              | Co-op       |    98 | 74.41 |
|   5 | ⚡ Creatures of Sonaria 💙 Survive Kaiju Animals | Co-op       |    98 | 74.01 |
|   6 | NewSmith🏠RP Update 14!                          | Co-op       |    98 | 73.62 |
|   7 | Brookhaven 🏡RP                                  | Co-op       |    97 | 73.38 |
|   8 | Kitten Game 🐾                                   | Co-op       |    98 | 73.14 |
|   9 | Welcome to Bloxburg                              | Co-op       |    98 | 73.09 |
|  10 | NEW🦋 Horse Life 🐎                              | Co-op       |    98 | 72.62 |
|  11 | Guts &amp; Blackpowder                           | Action RPG  |    72 | 72.48 |
|  12 | Metro Life 🏙️ City RP                            | Co-op       |    97 | 72.47 |
|  13 | Emergency Hamburg                                | Co-op       |    97 | 72.30 |
|  14 | Berry Avenue 🏠 RP                               | Co-op       |    97 | 72.30 |
|  15 | Royale❄️High                                     | Co-op       |    97 | 72.29 |
|  16 | [UPDATE] The Presentation Experience             | Co-op       |    98 | 72.22 |
|  17 | 🍂 Maple Hospital                                | Co-op       |    97 | 72.19 |
|  18 | [🏠NEW!!] Twilight Daycare!                      | Co-op       |    98 | 72.17 |
|  19 | Warrior Cats: Ultimate Edition                   | Co-op       |    98 | 72.06 |
|  20 | Livetopia🏡 New House                            | Co-op       |    98 | 72.06 |
|  21 | 🚩Expedition Antarctica                          | Exploration |    97 | 72.00 |
|  22 | 🐸Animal Simulator                               | Co-op       |    97 | 71.90 |
|  23 | SCP: Roleplay                                    | Co-op       |    98 | 71.52 |
|  24 | [HALLOWEEN!!!] Fredbear's Mega Roleplay          | Co-op       |    98 | 71.40 |
|  25 | Emergency Response: Liberty County               | Co-op       |    98 | 71.30 |
|  26 | LifeTogether 🏠 RP [UPDATE 34]                   | Co-op       |    98 | 71.28 |
|  27 | [UPDATE!] Speed Draw!                            | Co-op       |    97 | 71.13 |
|  28 | Redcliff City 🏡RP                               | Co-op       |    98 | 71.13 |
|  29 | Emergency Emden V2                               | Co-op       |    97 | 71.01 |
|  30 | 🎃 Hide or Die!                                  | Co-op       |    97 | 70.94 |
|  31 | 🎟️Dandy's World [ALPHA]                          | Horror      |    60 | 70.90 |
|  32 | [FREE ADMIN]                                     | Co-op       |    97 | 70.75 |
|  33 | Jurassic Blocky                                  | Co-op       |    97 | 70.55 |
|  34 | Ultra Toilet Roleplay 2 [11.0]                   | Co-op       |    98 | 70.46 |
|  35 | Midnight Station [HORROR]                        | Exploration |    98 | 70.17 |
|  36 | The Vampire Legacies 2 BETA                      | Co-op       |    98 | 70.16 |
|  37 | Find The Floppa Morphs (855)                     | Exploration |    97 | 70.10 |
|  38 | [🏴‍☠️] Fisch                                       | Simulation  |    72 | 69.92 |
|  39 | Paradise 🏠 RP                                   | Co-op       |    98 | 69.87 |
|  40 | Yellowstone Unleashed                            | Co-op       |    98 | 69.67 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Creative builder

Preferred genres: Simulation, Puzzle. Top-result overlap with unpersonalized baseline: 8.1%.

|   # | Experience                                      | Genre      | Match | Score |
| --: | ----------------------------------------------- | ---------- | ----: | ----: |
|   1 | Carry Me! [2 Player Obby]                       | Puzzle     |    97 | 76.32 |
|   2 | Conquer Europe WW2 [🎃Halloween Update🎃]       | Simulation |    97 | 76.18 |
|   3 | Adopt Me!                                       | Co-op      |    71 | 73.70 |
|   4 | Gym Star Simulator[PIRATE UPD🏴‍☠️💪]              | Simulation |    98 | 69.94 |
|   5 | Realistic Street Soccer (3 on 3)                | Racing     |    59 | 68.95 |
|   6 | [🏴‍☠️] Fisch                                      | Simulation |    86 | 68.41 |
|   7 | Catalog Avatar Creator                          | Simulation |    86 | 68.34 |
|   8 | 💪 Ninja Challenge [Beta]                       | Puzzle     |    85 | 67.94 |
|   9 | ⭐ ZENVO! Car Dealership Tycoon                 | Simulation |    98 | 67.92 |
|  10 | Easy Obby                                       | Puzzle     |    97 | 67.80 |
|  11 | 📸PhotoShoot x Green Screen Studio              | Simulation |    98 | 67.71 |
|  12 | Ice Fishing Simulator 🐟                        | Simulation |    98 | 67.67 |
|  13 | Industrialist [HEAVY INDUSTRY]                  | Simulation |    98 | 67.44 |
|  14 | [KF-51 Panther] War Tycoon                      | Simulation |    98 | 67.26 |
|  15 | Car Suspension Test                             | Simulation |    97 | 67.22 |
|  16 | Impossible Squid Game! Glass Bridge 2           | Puzzle     |    86 | 67.21 |
|  17 | 🏁SEASON 5 Drive World 🏎️ Drifting &amp; Racing | Simulation |    98 | 67.18 |
|  18 | Chained [2 Player Obby]                         | Puzzle     |    86 | 67.09 |
|  19 | [SWAY SWAY +11 EMOTES] 🎵 TTD 3                 | Simulation |    97 | 67.05 |
|  20 | Build with Friends                              | Simulation |    98 | 66.84 |
|  21 | Teamwork Puzzles 2 (Obby)                       | Puzzle     |    86 | 66.78 |
|  22 | [W14] Skateboard Obby                           | Puzzle     |    85 | 66.56 |
|  23 | Youtuber Tycoon! [ELEVATOR]                     | Simulation |    97 | 66.41 |
|  24 | Restaurant Tycoon 2                             | Simulation |    98 | 66.23 |
|  25 | Carry A Friend! (Teamwork Obby)                 | Puzzle     |    86 | 65.99 |
|  26 | Twisted [BETA]                                  | Simulation |    98 | 65.97 |
|  27 | [NEW] Mega Luxury Bus Tycoon🚍                  | Simulation |    98 | 65.95 |
|  28 | BAD CAT [KITTEN]                                | Simulation |    98 | 65.77 |
|  29 | Dress To Impress 💜                             | Co-op      |    72 | 65.70 |
|  30 | [15 NEW CARS] Driving Empire 🏎️ Car Racing      | Simulation |    86 | 65.67 |
|  31 | Block Puzzle                                    | Puzzle     |    85 | 65.62 |
|  32 | Generic Cooking Game [BETA][UPD2.16]            | Simulation |    98 | 65.62 |
|  33 | [🔥UPD14]Cultivation Simulator                  | Simulation |    98 | 65.59 |
|  34 | Farming and Friends                             | Simulation |    97 | 65.55 |
|  35 | Vehicle Legends 🏎️ CARS!                        | Simulation |    98 | 65.53 |
|  36 | Pet Simulator 99! 🧍                            | Simulation |    98 | 65.52 |
|  37 | Sol's RNG [Eon1]                                | Simulation |    86 | 65.40 |
|  38 | [W51] Obby But You’re On a Bike                 | Puzzle     |    85 | 65.39 |
|  39 | Gun Armory Tycoon                               | Simulation |    98 | 65.24 |
|  40 | [UNIFORMS] Warfare Tycoon                       | Simulation |    97 | 65.14 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Thrill seeker

Preferred genres: Horror, Co-op. Top-result overlap with unpersonalized baseline: 21.2%.

|   # | Experience                                       | Genre       | Match | Score |
| --: | ------------------------------------------------ | ----------- | ----: | ----: |
|   1 | 🎟️Dandy's World [ALPHA]                          | Horror      |    98 | 83.63 |
|   2 | ⚡ Creatures of Sonaria 💙 Survive Kaiju Animals | Co-op       |    98 | 82.01 |
|   3 | [VIP] Evade 🎃✨                                 | Horror      |    98 | 74.94 |
|   4 | Murder Mystery 2                                 | Horror      |    98 | 73.04 |
|   5 | Emergency Hamburg                                | Co-op       |    97 | 72.30 |
|   6 | 🎃 DOORS 👁️                                      | Horror      |    98 | 72.28 |
|   7 | Flee the Facility                                | Horror      |    98 | 72.19 |
|   8 | [HALLOWEEN 🎃] The Mimic                         | Horror      |    98 | 72.05 |
|   9 | [NEW MAP] Keys 🗝️ Season 20                      | Horror      |    98 | 71.69 |
|  10 | [UPDATE] Death in the Box                        | Horror      |    98 | 71.55 |
|  11 | SCP: Roleplay                                    | Co-op       |    98 | 71.52 |
|  12 | Banana Eats 🌈                                   | Horror      |    98 | 71.10 |
|  13 | Piggy [DECAY CHAPTER]                            | Horror      |    98 | 71.09 |
|  14 | Emergency Emden V2                               | Co-op       |    97 | 71.01 |
|  15 | [HALLOWEEN] Residence Massacre                   | Horror      |    98 | 70.99 |
|  16 | [🎅] In Area 51 [ALPHA]                          | Horror      |    98 | 70.89 |
|  17 | Cheese Escape [Horror]                           | Horror      |    97 | 70.76 |
|  18 | Infectious Smile                                 | Horror      |    97 | 70.75 |
|  19 | NEW🧙 Be NPC or DIE!💢                           | Horror      |    98 | 70.72 |
|  20 | Backrooms                                        | Horror      |    97 | 70.58 |
|  21 | The Butchery [HORROR]                            | Exploration |    71 | 70.57 |
|  22 | Pressure                                         | Horror      |    98 | 70.55 |
|  23 | Regretevator [ ELEVATOR SIMULATOR ]              | Co-op       |    86 | 70.42 |
|  24 | SharkBite 2 🦈                                   | Horror      |    98 | 70.41 |
|  25 | Adopt Me!                                        | Co-op       |    85 | 70.39 |
|  26 | Dress To Impress 💜                              | Co-op       |    86 | 70.39 |
|  27 | Secret Killer                                    | Horror      |    98 | 70.18 |
|  28 | The Floor Is LAVA! 🔥                            | Horror      |    97 | 70.04 |
|  29 | Yellowstone Unleashed                            | Co-op       |    98 | 69.67 |
|  30 | NewSmith🏠RP Update 14!                          | Co-op       |    86 | 69.60 |
|  31 | Zombies vs Humans                                | Horror      |    97 | 69.37 |
|  32 | Brookhaven 🏡RP                                  | Co-op       |    85 | 69.36 |
|  33 | The Curse [HORROR]                               | Horror      |    97 | 69.34 |
|  34 | 🔪Survive the Killer!                            | Horror      |    98 | 69.17 |
|  35 | Kitten Game 🐾                                   | Co-op       |    86 | 69.12 |
|  36 | GEF                                              | Horror      |    97 | 69.08 |
|  37 | Welcome to Bloxburg                              | Co-op       |    86 | 69.08 |
|  38 | SCP Games and SCP Monsters                       | Co-op       |    97 | 69.00 |
|  39 | Escape Running Head                              | Horror      |    97 | 68.98 |
|  40 | Radiant Residents                                | Horror      |    98 | 68.96 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Completionist

Preferred genres: Action RPG, Simulation. Top-result overlap with unpersonalized baseline: 27.0%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | Blox Fruits                                   | Action RPG  |    98 | 82.65 |
|   2 | [🏴‍☠️] Fisch                                    | Simulation  |    98 | 78.63 |
|   3 | [MYTHICAL WOLF] Fruit Battlegrounds           | Action RPG  |    98 | 73.99 |
|   4 | RIVALS                                        | Action RPG  |    86 | 73.61 |
|   5 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    98 | 73.49 |
|   6 | [🎃 UPD] King Legacy                          | Action RPG  |    98 | 73.32 |
|   7 | Kitten Game 🐾                                | Co-op       |    72 | 72.43 |
|   8 | a dusty trip [✈️PLANE]                        | Exploration |    72 | 72.39 |
|   9 | [🎃UPDATE] Grand Piece Online                 | Action RPG  |    98 | 72.19 |
|  10 | [🕷️HALLOWEEN🕸️] A Universal Time 3.9 🎃       | Action RPG  |    97 | 71.51 |
|  11 | Shindo Life [239]                             | Action RPG  |    98 | 71.40 |
|  12 | Demon Blade                                   | Action RPG  |    98 | 70.78 |
|  13 | Horse World                                   | Action RPG  |    98 | 70.36 |
|  14 | [BETA TEST FINISHED] The Time of Ninja        | Action RPG  |    98 | 70.30 |
|  15 | Teamwork Puzzles 2 (Obby)                     | Puzzle      |    72 | 70.09 |
|  16 | Blade Ball                                    | Action RPG  |    86 | 69.74 |
|  17 | BedWars [⌚ REBOOT]                           | Action RPG  |    85 | 69.44 |
|  18 | The Strongest Battlegrounds                   | Action RPG  |    85 | 69.42 |
|  19 | Industrialist [HEAVY INDUSTRY]                | Simulation  |    98 | 69.23 |
|  20 | [UPDATE 4] Meme Sea                           | Action RPG  |    98 | 69.23 |
|  21 | Guts &amp; Blackpowder                        | Action RPG  |    86 | 69.17 |
|  22 | [UPD] Dragon Ball Nexus                       | Action RPG  |    98 | 69.16 |
|  23 | Realistic Street Soccer (3 on 3)              | Racing      |    59 | 68.95 |
|  24 | Blackhawk Rescue Mission 5                    | Action RPG  |    86 | 68.88 |
|  25 | Gunfight Arena                                | Action RPG  |    98 | 68.61 |
|  26 | Ben 10 Super Hero Time                        | Action RPG  |    97 | 68.58 |
|  27 | Death Ball                                    | Action RPG  |    86 | 68.55 |
|  28 | [PERFECTION] Jujutsu Shenanigans              | Action RPG  |    85 | 68.51 |
|  29 | Special Forces Simulator                      | Action RPG  |    98 | 68.41 |
|  30 | Catalog Avatar Creator                        | Simulation  |    86 | 68.34 |
|  31 | Sakura Stand                                  | Action RPG  |    97 | 68.21 |
|  32 | [💎]Ninjitsu: Master of Elements              | Action RPG  |    98 | 68.17 |
|  33 | [💰] Dungeon Quest! ⚔️ RPG Adventure          | Action RPG  |    98 | 68.11 |
|  34 | [YUTA] Jujutsu Beatdown                       | Action RPG  |    86 | 68.08 |
|  35 | Murderers VS Sheriffs Duels                   | Action RPG  |    85 | 67.86 |
|  36 | Slap Battles👏                                | Action RPG  |    85 | 67.83 |
|  37 | Jailbreak 🍁                                  | Action RPG  |    85 | 67.75 |
|  38 | [🦇] Heroes Battlegrounds                     | Action RPG  |    85 | 67.66 |
|  39 | Apocalypse Rising 2                           | Action RPG  |    86 | 67.64 |
|  40 | Basically FNF: Remix                          | Action RPG  |    86 | 67.60 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Casual browser

Preferred genres: Puzzle, Racing. Top-result overlap with unpersonalized baseline: 3.9%.

|   # | Experience                                      | Genre      | Match | Score |
| --: | ----------------------------------------------- | ---------- | ----: | ----: |
|   1 | 💪 Ninja Challenge [Beta]                       | Puzzle     |    97 | 79.96 |
|   2 | ⚡Race Clicker                                  | Racing     |    98 | 79.87 |
|   3 | Blade Ball                                      | Action RPG |    72 | 73.05 |
|   4 | Impossible Squid Game! Glass Bridge 2           | Puzzle     |    98 | 71.23 |
|   5 | Chained [2 Player Obby]                         | Puzzle     |    98 | 71.11 |
|   6 | Teamwork Puzzles 2 (Obby)                       | Puzzle     |    98 | 70.80 |
|   7 | [W14] Skateboard Obby                           | Puzzle     |    97 | 70.58 |
|   8 | Carry A Friend! (Teamwork Obby)                 | Puzzle     |    98 | 70.01 |
|   9 | Realistic Street Soccer (3 on 3)                | Racing     |    85 | 69.66 |
|  10 | Block Puzzle                                    | Puzzle     |    97 | 69.64 |
|  11 | [W51] Obby But You’re On a Bike                 | Puzzle     |    97 | 69.41 |
|  12 | [UPDATE] Poly Dash (Geometry Dash)              | Puzzle     |    97 | 68.78 |
|  13 | Escape School Obby! (NEW)                       | Puzzle     |    97 | 68.73 |
|  14 | Speed Run 4 🍩😋[UPDATE]                        | Puzzle     |    97 | 68.71 |
|  15 | Bike of Hell                                    | Puzzle     |    97 | 68.55 |
|  16 | [HUGE UPDATE] Chained Together [2-3-4-5 PLAYER] | Puzzle     |    97 | 68.48 |
|  17 | ⚽️Ultimate Soccer                               | Racing     |    98 | 68.39 |
|  18 | Altitorture [2 Player Obby]                     | Puzzle     |    98 | 68.38 |
|  19 | Carry Me! [2 Player Obby]                       | Puzzle     |    97 | 68.32 |
|  20 | The Dropper ✨ [130+ LEVELS!]                   | Puzzle     |    97 | 68.28 |
|  21 | [UPGRADE] BARRY'S PRISON RUN! (OBBY)            | Puzzle     |    96 | 68.07 |
|  22 | Together [Party Game]                           | Puzzle     |    97 | 68.04 |
|  23 | [MOVE] BEAT BOUNCE 🎶                           | Puzzle     |    96 | 67.86 |
|  24 | Easy Obby                                       | Puzzle     |    97 | 67.80 |
|  25 | Shoot a Friend [2 Player Obby]                  | Puzzle     |    98 | 67.74 |
|  26 | [🎃] Super League Soccer                        | Racing     |    85 | 67.62 |
|  27 | Gym Star Simulator[PIRATE UPD🏴‍☠️💪]              | Simulation |    72 | 67.43 |
|  28 | Parkour Run!                                    | Puzzle     |    97 | 67.25 |
|  29 | Thats not my Robloxian                          | Puzzle     |    98 | 67.01 |
|  30 | Don't Shatter [2 Player Obby]                   | Puzzle     |    98 | 66.72 |
|  31 | Tell Me! [2 Player Obby]                        | Puzzle     |    97 | 66.62 |
|  32 | [🌌 ZONE 9!!! ☄️] Juke's Towers of Hell         | Puzzle     |    97 | 66.55 |
|  33 | ROBLOX Rally Racing                             | Racing     |    86 | 66.12 |
|  34 | Gravity [2 Player Obby]                         | Puzzle     |    98 | 66.10 |
|  35 | College Football 🏈                             | Racing     |    97 | 66.08 |
|  36 | 🎃Basketball Legends🎃                          | Racing     |    85 | 65.98 |
|  37 | [🎉UPD] Easy Size Obby                          | Puzzle     |    97 | 65.74 |
|  38 | Team Daycare Escape! (TEAMWORK OBBY)            | Puzzle     |    97 | 65.70 |
|  39 | Draw Obby [NEW]                                 | Puzzle     |    96 | 65.61 |
|  40 | Obby But You Can't Jump                         | Puzzle     |    97 | 65.49 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Story seeker

Preferred genres: Exploration, Horror. Top-result overlap with unpersonalized baseline: 14.3%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | a dusty trip [✈️PLANE]                        | Exploration |    98 | 81.10 |
|   2 | Murder Mystery 2                              | Horror      |    98 | 81.04 |
|   3 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    72 | 72.78 |
|   4 | Brookhaven 🏡RP                               | Co-op       |    71 | 72.67 |
|   5 | Secret Staycation                             | Exploration |    97 | 72.18 |
|   6 | 🚩Expedition Antarctica                       | Exploration |    97 | 72.00 |
|   7 | [NEW MAP] Keys 🗝️ Season 20                   | Horror      |    98 | 71.69 |
|   8 | 🎟️Dandy's World [ALPHA]                       | Horror      |    86 | 71.61 |
|   9 | The Butchery [HORROR]                         | Exploration |    97 | 71.28 |
|  10 | Piggy [DECAY CHAPTER]                         | Horror      |    98 | 71.09 |
|  11 | [VIP] Evade 🎃✨                              | Horror      |    86 | 70.92 |
|  12 | [🎅] In Area 51 [ALPHA]                       | Horror      |    98 | 70.89 |
|  13 | Cheese Escape [Horror]                        | Horror      |    97 | 70.76 |
|  14 | Westbound                                     | Exploration |    97 | 70.51 |
|  15 | Interliminality (ALPHA 1.3.6)                 | Exploration |    98 | 70.39 |
|  16 | Midnight Station [HORROR]                     | Exploration |    98 | 70.17 |
|  17 | Find The Floppa Morphs (855)                  | Exploration |    97 | 70.10 |
|  18 | Find The Markers (237)                        | Exploration |    97 | 69.90 |
|  19 | Apeirophobia                                  | Exploration |    98 | 69.19 |
|  20 | The Intruder                                  | Horror      |    98 | 68.67 |
|  21 | 🎃 DOORS 👁️                                   | Horror      |    86 | 68.27 |
|  22 | Flee the Facility                             | Horror      |    86 | 68.17 |
|  23 | [HALLOWEEN 🎃] The Mimic                      | Horror      |    86 | 68.03 |
|  24 | Garten of Banban                              | Exploration |    97 | 67.93 |
|  25 | Start Survey?                                 | Exploration |    97 | 67.86 |
|  26 | ✨Collect The Body                            | Exploration |    98 | 67.53 |
|  27 | [UPDATE] Death in the Box                     | Horror      |    86 | 67.53 |
|  28 | Insomnia (Horror)                             | Exploration |    97 | 67.31 |
|  29 | Banana Eats 🌈                                | Horror      |    86 | 67.08 |
|  30 | Find The Football Clubs (130)                 | Exploration |    98 | 67.03 |
|  31 | [HALLOWEEN] Residence Massacre                | Horror      |    86 | 66.97 |
|  32 | Midnight Burger [HORROR]                      | Exploration |    97 | 66.74 |
|  33 | Infectious Smile                              | Horror      |    85 | 66.73 |
|  34 | NEW🧙 Be NPC or DIE!💢                        | Horror      |    86 | 66.70 |
|  35 | Mental [HORROR]                               | Horror      |    97 | 66.64 |
|  36 | Tsunami Game                                  | Horror      |    97 | 66.63 |
|  37 | Backrooms                                     | Horror      |    85 | 66.56 |
|  38 | Pressure                                      | Horror      |    86 | 66.53 |
|  39 | SharkBite 2 🦈                                | Horror      |    86 | 66.39 |
|  40 | weird strict dad [BOOK 2]                     | Exploration |    97 | 66.28 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Speedrunner

Preferred genres: Racing, Action RPG. Top-result overlap with unpersonalized baseline: 23.1%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | Realistic Street Soccer (3 on 3)              | Racing      |    97 | 81.68 |
|   2 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    98 | 81.49 |
|   3 | Death Ball                                    | Action RPG  |    98 | 74.97 |
|   4 | RIVALS                                        | Action RPG  |    86 | 73.61 |
|   5 | ⚡Race Clicker                                | Racing      |    98 | 71.87 |
|   6 | [🎃] Super League Soccer                      | Racing      |    97 | 71.64 |
|   7 | Secret Staycation                             | Exploration |    71 | 71.47 |
|   8 | 💪 Ninja Challenge [Beta]                     | Puzzle      |    71 | 71.25 |
|   9 | Demon Blade                                   | Action RPG  |    98 | 70.78 |
|  10 | Blox Fruits                                   | Action RPG  |    86 | 70.63 |
|  11 | ROBLOX Rally Racing                           | Racing      |    98 | 70.14 |
|  12 | 🎃Basketball Legends🎃                        | Racing      |    97 | 70.00 |
|  13 | Blade Ball                                    | Action RPG  |    86 | 69.74 |
|  14 | BedWars [⌚ REBOOT]                           | Action RPG  |    85 | 69.44 |
|  15 | The Strongest Battlegrounds                   | Action RPG  |    85 | 69.42 |
|  16 | [☢️] Arsenal                                  | Action RPG  |    97 | 69.37 |
|  17 | [🎃 UPD] King Legacy                          | Action RPG  |    86 | 69.30 |
|  18 | [UPDATE 4] Meme Sea                           | Action RPG  |    98 | 69.23 |
|  19 | Guts &amp; Blackpowder                        | Action RPG  |    86 | 69.17 |
|  20 | [AFC AJAX EVENT] Real Futbol 24               | Racing      |    97 | 69.13 |
|  21 | Team Soccer (3 vs. 3)                         | Racing      |    97 | 68.90 |
|  22 | Blackhawk Rescue Mission 5                    | Action RPG  |    86 | 68.88 |
|  23 | HCBB 9v9 2.0                                  | Racing      |    97 | 68.80 |
|  24 | Murderers vs Sheriffs 2                       | Action RPG  |    97 | 68.79 |
|  25 | Gunfight Arena                                | Action RPG  |    98 | 68.61 |
|  26 | [PERFECTION] Jujutsu Shenanigans              | Action RPG  |    85 | 68.51 |
|  27 | [AVATAR EDITOR] untitled boxing game🥊        | Racing      |    97 | 68.51 |
|  28 | ⚽️Ultimate Soccer                             | Racing      |    98 | 68.39 |
|  29 | [🎃UPDATE] Grand Piece Online                 | Action RPG  |    86 | 68.17 |
|  30 | [YUTA] Jujutsu Beatdown                       | Action RPG  |    86 | 68.08 |
|  31 | Power-Up Soccer                               | Racing      |    97 | 67.92 |
|  32 | Murderers VS Sheriffs Duels                   | Action RPG  |    85 | 67.86 |
|  33 | Slap Battles👏                                | Action RPG  |    85 | 67.83 |
|  34 | Jailbreak 🍁                                  | Action RPG  |    85 | 67.75 |
|  35 | [🦇] Heroes Battlegrounds                     | Action RPG  |    85 | 67.66 |
|  36 | Apocalypse Rising 2                           | Action RPG  |    86 | 67.64 |
|  37 | Basically FNF: Remix                          | Action RPG  |    86 | 67.60 |
|  38 | Phantom Forces                                | Action RPG  |    86 | 67.60 |
|  39 | [MYTHICAL WOLF] Fruit Battlegrounds           | Action RPG  |    86 | 67.57 |
|  40 | [🕷️HALLOWEEN🕸️] A Universal Time 3.9 🎃       | Action RPG  |    85 | 67.49 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Tactician

Preferred genres: Puzzle, Simulation. Top-result overlap with unpersonalized baseline: 6.7%.

|   # | Experience                                      | Genre      | Match | Score |
| --: | ----------------------------------------------- | ---------- | ----: | ----: |
|   1 | [⚔️RANKED] Toilet Tower Defense                 | Simulation |    97 | 76.25 |
|   2 | 💪 Ninja Challenge [Beta]                       | Puzzle     |    85 | 75.94 |
|   3 | [FREE ADMIN]                                    | Co-op      |    71 | 70.04 |
|   4 | Block Puzzle                                    | Puzzle     |    97 | 69.64 |
|   5 | Industrialist [HEAVY INDUSTRY]                  | Simulation |    98 | 69.23 |
|   6 | Realistic Street Soccer (3 on 3)                | Racing     |    59 | 68.95 |
|   7 | [🏴‍☠️] Fisch                                      | Simulation |    86 | 68.41 |
|   8 | Catalog Avatar Creator                          | Simulation |    86 | 68.34 |
|   9 | Conquer Europe WW2 [🎃Halloween Update🎃]       | Simulation |    97 | 68.18 |
|  10 | [HALLOWEEN PART 0.75 AND LAG FIX] Skibi Defense | Simulation |    98 | 67.71 |
|  11 | [KF-51 Panther] War Tycoon                      | Simulation |    98 | 67.26 |
|  12 | Impossible Squid Game! Glass Bridge 2           | Puzzle     |    86 | 67.21 |
|  13 | Chained [2 Player Obby]                         | Puzzle     |    86 | 67.09 |
|  14 | [BATTLE PASS] Sorcerer Tower Defense            | Simulation |    97 | 67.07 |
|  15 | 🎃 Tower Defense Simulator 🎃                   | Simulation |    98 | 66.89 |
|  16 | Teamwork Puzzles 2 (Obby)                       | Puzzle     |    86 | 66.78 |
|  17 | [W14] Skateboard Obby                           | Puzzle     |    85 | 66.56 |
|  18 | Carry A Friend! (Teamwork Obby)                 | Puzzle     |    86 | 65.99 |
|  19 | [15 NEW CARS] Driving Empire 🏎️ Car Racing      | Simulation |    86 | 65.67 |
|  20 | [🎄RED ONE] Anime Defenders                     | Simulation |    98 | 65.59 |
|  21 | [🔥UPD14]Cultivation Simulator                  | Simulation |    98 | 65.59 |
|  22 | Clip It 😂🎬👗                                  | Simulation |    85 | 65.45 |
|  23 | Sol's RNG [Eon1]                                | Simulation |    86 | 65.40 |
|  24 | [W51] Obby But You’re On a Bike                 | Puzzle     |    85 | 65.39 |
|  25 | Gun Armory Tycoon                               | Simulation |    98 | 65.24 |
|  26 | [UNIFORMS] Warfare Tycoon                       | Simulation |    97 | 65.14 |
|  27 | The Battle Bricks                               | Simulation |    97 | 64.90 |
|  28 | [UPDATE] Poly Dash (Geometry Dash)              | Puzzle     |    85 | 64.76 |
|  29 | Escape School Obby! (NEW)                       | Puzzle     |    85 | 64.71 |
|  30 | Speed Run 4 🍩😋[UPDATE]                        | Puzzle     |    85 | 64.69 |
|  31 | Bike of Hell                                    | Puzzle     |    85 | 64.53 |
|  32 | [HUGE UPDATE] Chained Together [2-3-4-5 PLAYER] | Puzzle     |    85 | 64.46 |
|  33 | Altitorture [2 Player Obby]                     | Puzzle     |    86 | 64.36 |
|  34 | LOCOfficial!                                    | Simulation |    98 | 64.35 |
|  35 | Carry Me! [2 Player Obby]                       | Puzzle     |    85 | 64.30 |
|  36 | The Dropper ✨ [130+ LEVELS!]                   | Puzzle     |    85 | 64.27 |
|  37 | Gym Star Simulator[PIRATE UPD🏴‍☠️💪]              | Simulation |    86 | 64.12 |
|  38 | Adopt Me!                                       | Co-op      |    59 | 64.08 |
|  39 | Iron Man: Reimagined                            | Simulation |    98 | 64.06 |
|  40 | [UPGRADE] BARRY'S PRISON RUN! (OBBY)            | Puzzle     |    84 | 64.05 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Open-world adventurer

Preferred genres: Exploration, Action RPG. Top-result overlap with unpersonalized baseline: 27.0%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    98 | 81.49 |
|   2 | a dusty trip [✈️PLANE]                        | Exploration |    98 | 81.10 |
|   3 | BedWars [⌚ REBOOT]                           | Action RPG  |    97 | 75.86 |
|   4 | 🎟️Dandy's World [ALPHA]                       | Horror      |    72 | 74.92 |
|   5 | Dress To Impress 💜                           | Co-op       |    72 | 73.70 |
|   6 | RIVALS                                        | Action RPG  |    86 | 73.61 |
|   7 | Death Ball                                    | Action RPG  |    98 | 72.57 |
|   8 | Secret Staycation                             | Exploration |    97 | 72.18 |
|   9 | 🚩Expedition Antarctica                       | Exploration |    97 | 72.00 |
|  10 | Apocalypse Rising 2                           | Action RPG  |    98 | 71.66 |
|  11 | [🕷️HALLOWEEN🕸️] A Universal Time 3.9 🎃       | Action RPG  |    97 | 71.51 |
|  12 | Shindo Life [239]                             | Action RPG  |    98 | 71.40 |
|  13 | The Butchery [HORROR]                         | Exploration |    97 | 71.28 |
|  14 | Peroxide                                      | Action RPG  |    98 | 71.04 |
|  15 | Demon Blade                                   | Action RPG  |    98 | 70.78 |
|  16 | Blox Fruits                                   | Action RPG  |    86 | 70.63 |
|  17 | Westbound                                     | Exploration |    97 | 70.51 |
|  18 | Interliminality (ALPHA 1.3.6)                 | Exploration |    98 | 70.39 |
|  19 | Horse World                                   | Action RPG  |    98 | 70.36 |
|  20 | [BETA TEST FINISHED] The Time of Ninja        | Action RPG  |    98 | 70.30 |
|  21 | Midnight Station [HORROR]                     | Exploration |    98 | 70.17 |
|  22 | Find The Floppa Morphs (855)                  | Exploration |    97 | 70.10 |
|  23 | Find The Markers (237)                        | Exploration |    97 | 69.90 |
|  24 | Blade Ball                                    | Action RPG  |    86 | 69.74 |
|  25 | The Strongest Battlegrounds                   | Action RPG  |    85 | 69.42 |
|  26 | [🎃 UPD] King Legacy                          | Action RPG  |    86 | 69.30 |
|  27 | Apeirophobia                                  | Exploration |    98 | 69.19 |
|  28 | Guts &amp; Blackpowder                        | Action RPG  |    86 | 69.17 |
|  29 | [UPD] Dragon Ball Nexus                       | Action RPG  |    98 | 69.16 |
|  30 | Realistic Street Soccer (3 on 3)              | Racing      |    59 | 68.95 |
|  31 | Blackhawk Rescue Mission 5                    | Action RPG  |    86 | 68.88 |
|  32 | Ben 10 Super Hero Time                        | Action RPG  |    97 | 68.58 |
|  33 | [PERFECTION] Jujutsu Shenanigans              | Action RPG  |    85 | 68.51 |
|  34 | Special Forces Simulator                      | Action RPG  |    98 | 68.41 |
|  35 | Sakura Stand                                  | Action RPG  |    97 | 68.21 |
|  36 | [🎃UPDATE] Grand Piece Online                 | Action RPG  |    86 | 68.17 |
|  37 | [💰] Dungeon Quest! ⚔️ RPG Adventure          | Action RPG  |    98 | 68.11 |
|  38 | [YUTA] Jujutsu Beatdown                       | Action RPG  |    86 | 68.08 |
|  39 | Garten of Banban                              | Exploration |    97 | 67.93 |
|  40 | Start Survey?                                 | Exploration |    97 | 67.86 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Party player

Preferred genres: Co-op, Racing. Top-result overlap with unpersonalized baseline: 33.3%.

|   # | Experience                                       | Genre       | Match | Score |
| --: | ------------------------------------------------ | ----------- | ----: | ----: |
|   1 | Adopt Me!                                        | Co-op       |    97 | 82.41 |
|   2 | Realistic Street Soccer (3 on 3)                 | Racing      |    97 | 81.68 |
|   3 | Regretevator [ ELEVATOR SIMULATOR ]              | Co-op       |    98 | 74.44 |
|   4 | Dress To Impress 💜                              | Co-op       |    98 | 74.41 |
|   5 | ⚡ Creatures of Sonaria 💙 Survive Kaiju Animals | Co-op       |    98 | 74.01 |
|   6 | NewSmith🏠RP Update 14!                          | Co-op       |    98 | 73.62 |
|   7 | Brookhaven 🏡RP                                  | Co-op       |    97 | 73.38 |
|   8 | Kitten Game 🐾                                   | Co-op       |    98 | 73.14 |
|   9 | Welcome to Bloxburg                              | Co-op       |    98 | 73.09 |
|  10 | Blade Ball                                       | Action RPG  |    72 | 73.05 |
|  11 | Metro Life 🏙️ City RP                            | Co-op       |    97 | 72.47 |
|  12 | Murder Mystery 2                                 | Horror      |    72 | 72.33 |
|  13 | Emergency Hamburg                                | Co-op       |    97 | 72.30 |
|  14 | [UPDATE] The Presentation Experience             | Co-op       |    98 | 72.22 |
|  15 | [🏠NEW!!] Twilight Daycare!                      | Co-op       |    98 | 72.17 |
|  16 | ⚡Race Clicker                                   | Racing      |    98 | 71.87 |
|  17 | Emergency Response: Liberty County               | Co-op       |    98 | 71.30 |
|  18 | 🚩Expedition Antarctica                          | Exploration |    71 | 71.29 |
|  19 | [UPDATE!] Speed Draw!                            | Co-op       |    97 | 71.13 |
|  20 | Emergency Emden V2                               | Co-op       |    97 | 71.01 |
|  21 | 🎃 Hide or Die!                                  | Co-op       |    97 | 70.94 |
|  22 | [FREE ADMIN]                                     | Co-op       |    97 | 70.75 |
|  23 | Impossible Squid Game! Glass Bridge 2            | Puzzle      |    72 | 70.52 |
|  24 | ROBLOX Rally Racing                              | Racing      |    98 | 70.14 |
|  25 | [🏴‍☠️] Fisch                                       | Simulation  |    72 | 69.92 |
|  26 | Bloxy Bingo                                      | Co-op       |    97 | 69.43 |
|  27 | Epic Minigames ✨                                | Co-op       |    97 | 69.34 |
|  28 | Bayside High School 🍎                           | Co-op       |    98 | 69.14 |
|  29 | 🦄 My Little Pony: Bridlewood RP [BETA]          | Co-op       |    97 | 69.04 |
|  30 | Team Soccer (3 vs. 3)                            | Racing      |    97 | 68.90 |
|  31 | Math Tower Race                                  | Co-op       |    98 | 68.71 |
|  32 | NEW🦋 Horse Life 🐎                              | Co-op       |    86 | 68.60 |
|  33 | Fashion Famous: 📸                               | Co-op       |    97 | 68.46 |
|  34 | Spray Paint!                                     | Co-op       |    97 | 68.41 |
|  35 | LewisLife 🏡 RP [Free UGC]                       | Co-op       |    97 | 68.29 |
|  36 | Hide and Seek Extreme                            | Co-op       |    98 | 68.29 |
|  37 | Berry Avenue 🏠 RP                               | Co-op       |    85 | 68.28 |
|  38 | Royale❄️High                                     | Co-op       |    85 | 68.27 |
|  39 | 🍂 Maple Hospital                                | Co-op       |    85 | 68.17 |
|  40 | Warrior Cats: Ultimate Edition                   | Co-op       |    86 | 68.04 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

### Collector

Preferred genres: Simulation, Action RPG. Top-result overlap with unpersonalized baseline: 27.0%.

|   # | Experience                                    | Genre       | Match | Score |
| --: | --------------------------------------------- | ----------- | ----: | ----: |
|   1 | 😈SHADOW Dragon Adventures 🐉 Fantasy Pets ✨ | Action RPG  |    98 | 81.49 |
|   2 | Catalog Avatar Creator                        | Simulation  |    98 | 78.56 |
|   3 | BedWars [⌚ REBOOT]                           | Action RPG  |    97 | 75.86 |
|   4 | Adopt Me!                                     | Co-op       |    71 | 73.70 |
|   5 | RIVALS                                        | Action RPG  |    86 | 73.61 |
|   6 | Murderers VS Sheriffs Duels                   | Action RPG  |    97 | 71.88 |
|   7 | Baddies 💅                                    | Action RPG  |    97 | 70.86 |
|   8 | Blox Fruits                                   | Action RPG  |    86 | 70.63 |
|   9 | Horse World                                   | Action RPG  |    98 | 70.36 |
|  10 | Clip It 😂🎬👗                                | Simulation  |    97 | 70.07 |
|  11 | Gym Star Simulator[PIRATE UPD🏴‍☠️💪]            | Simulation  |    98 | 69.94 |
|  12 | Blade Ball                                    | Action RPG  |    86 | 69.74 |
|  13 | Pilfering Pirates [🏆]                        | Action RPG  |    97 | 69.53 |
|  14 | The Strongest Battlegrounds                   | Action RPG  |    85 | 69.42 |
|  15 | [🎃 UPD] King Legacy                          | Action RPG  |    86 | 69.30 |
|  16 | Guts &amp; Blackpowder                        | Action RPG  |    86 | 69.17 |
|  17 | Realistic Street Soccer (3 on 3)              | Racing      |    59 | 68.95 |
|  18 | Blackhawk Rescue Mission 5                    | Action RPG  |    86 | 68.88 |
|  19 | [👑 EXTREME] Anime Dimensions Simulator       | Action RPG  |    98 | 68.80 |
|  20 | Murderers vs Sheriffs 2                       | Action RPG  |    97 | 68.79 |
|  21 | Death Ball                                    | Action RPG  |    86 | 68.55 |
|  22 | [PERFECTION] Jujutsu Shenanigans              | Action RPG  |    85 | 68.51 |
|  23 | [🏴‍☠️] Fisch                                    | Simulation  |    86 | 68.41 |
|  24 | a dusty trip [✈️PLANE]                        | Exploration |    60 | 68.37 |
|  25 | [🎃UPDATE] Grand Piece Online                 | Action RPG  |    86 | 68.17 |
|  26 | [💎]Ninjitsu: Master of Elements              | Action RPG  |    98 | 68.17 |
|  27 | [YUTA] Jujutsu Beatdown                       | Action RPG  |    86 | 68.08 |
|  28 | Bee Swarm Simulator                           | Simulation  |    98 | 67.95 |
|  29 | ⭐ ZENVO! Car Dealership Tycoon               | Simulation  |    98 | 67.92 |
|  30 | Slap Battles👏                                | Action RPG  |    85 | 67.83 |
|  31 | Jailbreak 🍁                                  | Action RPG  |    85 | 67.75 |
|  32 | Ice Fishing Simulator 🐟                      | Simulation  |    98 | 67.67 |
|  33 | [🦇] Heroes Battlegrounds                     | Action RPG  |    85 | 67.66 |
|  34 | Apocalypse Rising 2                           | Action RPG  |    86 | 67.64 |
|  35 | Basically FNF: Remix                          | Action RPG  |    86 | 67.60 |
|  36 | Phantom Forces                                | Action RPG  |    86 | 67.60 |
|  37 | [MYTHICAL WOLF] Fruit Battlegrounds           | Action RPG  |    86 | 67.57 |
|  38 | [🕷️HALLOWEEN🕸️] A Universal Time 3.9 🎃       | Action RPG  |    85 | 67.49 |
|  39 | PHIGHTING! [ALPHA]                            | Action RPG  |    86 | 67.47 |
|  40 | Shindo Life [239]                             | Action RPG  |    86 | 67.38 |

Context eligibility:

| Context           | Eligible catalog | Returned |
| ----------------- | ---------------: | -------: |
| featured          |              693 |       40 |
| trending          |              640 |       40 |
| recommended       |             1027 |       40 |
| hidden-gems       |              576 |       40 |
| recently-launched |               27 |       27 |

## Interpretation

This evaluation measures whether the current deterministic play-style scores change ranked results in the expected direction. Preferred-genre share and overlap describe ranking behavior; they are not measures of real player satisfaction or recommendation accuracy. The catalog match scores are synthetic inputs, not observed player preferences.
