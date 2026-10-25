# status-band

A Claude Code mod that draws a status band directly above the prompt, framed in a rounded green border:

```
╭──────────────────────────────────────────────────────────────────────────────────────╮
│ ● my-project/api main │ 5h ██░░░░░░░░ 20% ↻ 3h 10m │ Week █░░░░░░░░░ 12% ↻ 6d 21h │ claude-fable-5-1 $2.52 │
╰──────────────────────────────────────────────────────────────────────────────────────╯
```

What it shows, left to right:

- **Path and branch**: the last two segments of the directory Claude Code was started in, and the current git branch (refreshed every 15 seconds). Outside a git repository it says `no git`.
- **5h limit**: a 10-cell bar and the percentage of the 5-hour rate-limit window used, plus the time until it resets. Green below 70 %, yellow from 70 %, red from 90 %.
- **Week limit**: the same for the 7-day window.
- **Model and cost**: the model the main loop runs, as `/model` shows it, and the session's cost in US dollars.

The rate-limit figures come from the API's own responses and update after every turn. They show `–` until the first response arrives, and stay empty on accounts without a subscription.

## Install

At the prompt of a terminal session:

```
/plugin install status-band --marketplace golfomania/claude-status-band
```

Answer `y` to add the marketplace, then pick a scope (user scope installs it for every session).

From a shell:

```
claude plugin install status-band --marketplace golfomania/claude-status-band
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `golfomania/claude-status-band`, then **Add plugin**.

## Development

Run it straight from a checkout for one session:

```
claude --plugin-dir /path/to/claude-status-band
```

Check it with `claude plugin validate .` and type-check with `tsc -p .` once the engine has laid the types into `.claude-plugin/types/`.

## License

MIT
