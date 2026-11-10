# status-band

A Claude Code mod that draws a status band directly above the prompt, framed in a rounded green border:

```
╭──────────────────────────────────────────────────────────────────────────────────────╮
│ ● my-project/api main │ 5h ██░░░░░░░░ 20% ↻ 3h 10m │ Week █░░░░░░░░░ 12% ↻ 6d 21h │ claude-fable-5-1 high $2.52 │
╰──────────────────────────────────────────────────────────────────────────────────────╯
```

What it shows, left to right:

- **Path and branch**: the last two segments of the directory Claude Code was started in, and the current git branch (refreshed every 15 seconds). Outside a git repository it says `no git`.
- **Rate limits**: one segment per rate-limit window the account reports, each with a 10-cell bar, the percentage used and the time until it resets. `5h` is the 5-hour window, `Week` the 7-day window. A plan without a 5-hour window (Max Ultra, for one) shows only `Week`. Green below 70 %, yellow from 70 %, red from 90 %.
- **Model, effort and cost**: the model the main loop runs, as `/model` shows it; the effort level its requests are sent with (`low` to `max`, read from the `effortLevel` setting at start and from each request after that; absent for a model without effort); and the session's cost in US dollars.

The rate-limit figures come from the API's own responses and update after every turn. Until the first response arrives the band shows a dim `limits –`, and it stays that way on accounts without a subscription.

## Install

At the prompt of a terminal session:

```
/plugin install status-band --marketplace golfomania/claude-status-band
```

Answer `y` to add the marketplace, then pick a scope (user scope installs it for every session, including the sessions the desktop app starts).

From a shell:

```
claude plugin install status-band --marketplace golfomania/claude-status-band
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `golfomania/claude-status-band`, then **Add plugin**.

Already installed? `claude plugin update status-band` fetches the newest version, and `/reload-plugins` in a running session picks it up.

## Development

Run it straight from a checkout for one session:

```
claude --plugin-dir /path/to/claude-status-band
```

Check it with `claude plugin validate .`, run the tests with `claude plugin test .`, and type-check with `tsc -p .` once the engine has laid the types into `.claude-plugin/types/`.

## Changes

- 0.3.0: the effort level is drawn between model and cost.
- 0.2.0: only the rate-limit windows the account reports are drawn, so a plan without a 5-hour window no longer shows `5h –`; tests added.
- 0.1.0: first release.

## License

MIT
