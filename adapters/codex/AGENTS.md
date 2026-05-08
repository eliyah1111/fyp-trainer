# FYP Trainer Agent Notes

- Read `skills/fyp-trainer/SKILL.md` before running the workflow.
- Treat `$fyptrainer` as the normal user-facing invocation.
- Ask the user for the desired FYP profile after TikTok login is available.
- Show the generated profile summary and wait for confirmation.
- Use `npm run diagnose -- --isolated --query="<query>"` to validate browser flow without touching the user's regular profile.
- Use `npm run plan -- --searches=5` to preview ranked cache-aware discovery before live training.
- Use `npm run train -- --confirmed --duration=60` only after confirmation.
- Keep follows disabled unless the user explicitly asks for them.
