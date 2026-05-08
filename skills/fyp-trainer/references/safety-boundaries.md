# Safety Boundaries

FYP Trainer is a transparent user-assistive workflow, not a stealth automation kit.

## Allowed

- Opening TikTok in a Playwright browser controlled by the user.
- Waiting for the user to log in manually.
- Generating a taste profile and asking for confirmation.
- Searching, opening videos, scrolling, and watching for short durations.
- Applying tiny capped preference signals after confirmation.
- Writing local JSON memory and session logs.
- Running compact sessions that finish in 60 seconds or less.

## Not Allowed

- Collecting or storing TikTok credentials.
- Bypassing CAPTCHA, age gates, paywalls, safety interstitials, or login protections.
- Using stealth flags, fingerprint spoofing, or anti-detection tooling.
- Mass liking, mass following, mass commenting, messaging, posting, uploading, scraping, or evading platform limits.
- Hundreds of robotic searches or views per minute.
- Running live account-changing actions before confirmation.

## Implementation Notes

Randomized timing exists to avoid brittle mechanical pacing and accidental bursts, not to conceal automation. Keep all interactions bounded, logged, and reversible where possible.
