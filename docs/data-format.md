# Rules data format

`scripts/import-data.ts` loads JSON files in this shape into Supabase. The repo ships only
[`data/example.json`](../data/example.json), a fictional faction with placeholder text for
testing; supply your own data for anything real.

```bash
npm run data:import -- --dry-run data/my-faction.json   # validate only
SUPABASE_SECRET_KEY=... npm run data:import -- data/my-faction.json
```

`SUPABASE_URL` falls back to `NEXT_PUBLIC_SUPABASE_URL` from `.env.local`. For the local stack the
secret key is printed by `npx supabase status`. For production use the project's secret key from
Supabase → Project Settings → API Keys, and never commit it.

Imports are idempotent. Rows are matched on natural keys and updated in place:

| Thing | Matched on |
| --- | --- |
| Faction | `slug` |
| Detachment | faction + `name` |
| Enhancement, stratagem | detachment + `name` (core stratagems: `name`) |
| Datasheet | faction + `slug` |
| Model profile, unit size | datasheet + `name` / `models` |
| Weapon | `name`, shared across all factions |
| Ability | `name` + `type`, shared across all factions |
| Keyword | `name` (stored upper-case) |

Model profiles, weapon profiles, and a datasheet's weapons, abilities, keywords and Leader links
are replaced with what the file lists. A unit size an army list still uses is kept, with a warning.
Nothing is deleted at the faction, detachment or datasheet level.

## Shape

```jsonc
{
  "abilities": [                       // optional: shared ability text, e.g. core abilities
    { "name": "Deep Strike", "type": "core", "description": "...", "aura": false }
  ],
  "core_stratagems": [ /* stratagem, see below */ ],
  "factions": [
    {
      "slug": "example-legion",
      "name": "Example Legion",
      "army_rule": "...",
      "parent": "parent-faction-slug",  // optional, sub-factions
      "detachments": [
        {
          "name": "Vanguard Cohort",
          "rule": "...",
          "enhancements": [{ "name": "...", "points": 15, "description": "...", "restriction": "INFANTRY model only" }],
          "stratagems": [
            {
              "name": "...", "cp": 1,
              "category": "battle_tactic",  // battle_tactic | strategic_ploy | epic_deed | wargear
              "phase": "fight",             // command | movement | shooting | charge | fight | any
              "turn": "Your turn", "when": "...", "target": "...", "effect": "...", "restrictions": "..."
            }
          ]
        }
      ],
      "datasheets": [
        {
          "slug": "line-troopers",
          "name": "Line Troopers",
          "role": "battleline",  // epic_hero | character | battleline | dedicated_transport | fortification | other
          "composition": "1 Sergeant and 4-9 Troopers",
          "wargear_options": "...", "base_size": "32mm", "lore": "...",
          "profiles": [
            { "name": "Line Trooper", "movement": "6\"", "toughness": 4, "save": "3+",
              "invuln": "4+", "wounds": 2, "leadership": "6+", "oc": 2 }
          ],
          "sizes": [{ "models": 5, "points": 80 }, { "models": 10, "points": 160 }],
          "weapons": [
            {
              "name": "Grenade launcher",
              "default": false,  // false = a wargear option
              "profiles": [
                { "name": "Grenade launcher - frag", "range": "24\"", "attacks": "D3", "skill": "4+",
                  "strength": 4, "ap": 0, "damage": 1, "keywords": ["BLAST"] }
              ]
            }
          ],
          "abilities": [
            { "name": "Scouts", "type": "core", "value": "6\"" },
            { "name": "Steady Advance", "type": "datasheet", "description": "..." }
          ],
          "keywords": ["Infantry", "Battleline"],
          "faction_keywords": ["Example Legion"],
          "leads": ["other-datasheet-slug"]  // Leaders only: bodyguard units in this faction
        }
      ]
    }
  ]
}
```

## Values

- **Characteristics** written as `3+` (save, invuln, BS/WS skill, Leadership) accept `"3+"` or `3`.
- **Range** accepts `24`, `"24\""` or `"Melee"`; a Melee profile is a melee weapon.
- **Dice** (attacks, damage) accept `2`, `"D6"`, `"2D3"` or `"D6+3"`.
- **AP** accepts `-2`, `"-2"` or `0`; it defaults to `0`.
- **Movement** accepts `6`, `"6\""` or `"20+"`.
- A weapon profile's `name` defaults to the weapon's name; omit `skill` for Torrent weapons.
- Weapon keywords and datasheet keywords are stored upper-case.
