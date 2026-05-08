# Gemini CLI Adapter

## Activate From GitHub

Run the one-command installer from the repository README. It registers a global Gemini CLI custom command at:

```text
~/.gemini/commands/fyptrainer.toml
```

Invoke it in Gemini CLI with:

```text
/fyptrainer
```

You can pass the taste profile directly:

```text
/fyptrainer dark academia, cinematic edits, archive fashion, ambient music
```

## Integration

Gemini custom commands are prompt shortcuts. The command instructs Gemini to use the local runtime at `~/.fyp-trainer`, generate the profile, preview the plan, ask `Approve this search plan? [Y/N]`, and only then run live training.

Live browser automation remains user-confirmed and capped.
