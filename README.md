# SABLE

Promotional site for **SABLE**, a free-to-play 2D top-down pixel-art dark-fantasy MMO by Sable Studios (`@sabledept`), made in Godot.

The game is in **closed alpha**. It is free to play, with no pay-to-win: nobody can buy an advantage. Anything sold is cosmetic only.

## Run locally

This is a static site. Open it through a local server so the module script and images load.

```bash
python3 -m http.server 47231
```

Then visit [http://127.0.0.1:47231](http://127.0.0.1:47231).

The site is the repository root. `index.html` is the page. Styles are in that file. There is no build step.

Asset paths are relative to the site root, so the folder can be hosted at a subpath such as `/sable-site/`. The waitlist request is the one absolute URL, because it calls Supabase.

## Layout

- `index.html` — the page
- `js/site.js` — starfield, navigation, gallery, skill sky, form states
- `js/waitlist.js` — `joinAlphaWaitlist(email, source)` calls the live waitlist
- `assets/sky/` — parallax starfield, horizon, twinkle strip, `sky_twinkles.json`
- `assets/scenes/` — scene art
- `assets/title_logo.png` — title
- `assets/fonts/` — Alegreya (SIL Open Font License)
- `assets/skill_sky_full.mp4` — skill sky film, muted and looping
- `assets/skill_sky_map.json` — constellation drawn if the film cannot play

## Alpha waitlist

The form has one email field and a hidden `source` value of `site`. Submit calls `joinAlphaWaitlist(email, source)` in `js/waitlist.js`, which posts to the Supabase RPC `join_alpha_waitlist`.

`{ ok: true }` (including an address that is already on the list) shows “You're on the list”. `invalid_email` asks for a valid email. `full` says the alpha is full. Any other failure shows a generic error and a Try again button. If the Bearer header is rejected with 401, the call is sent again with only the `apikey` header.

## Skill sky film

`assets/skill_sky_full.mp4` autoplays muted and looped in the skill sky section. The drawn constellation stays up until that file loads, and stays if the file is missing.
