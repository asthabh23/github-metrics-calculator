# GitHub Metrics Calculator

A CLI tool for analyzing GitHub contributions - PRs, issues, review feedback, and AI-assisted commits.

## Installation

```bash
npm install
```

## Setup

```bash
# Set your GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# Or create a .env file
cp .env.example .env
# Edit .env with your token
```

## Quick Start

**One command to get all metrics:**

```bash
node bin/ghmetrics.js summary -u <username>

# With date range (e.g., 2024)
node bin/ghmetrics.js summary -u <username> --since 2024-01-01

# Filter by organization
node bin/ghmetrics.js summary -u <username> -o adobe,aemdemos --since 2024-01-01

# Export to JSON
node bin/ghmetrics.js summary -u <username> --since 2024-01-01 --export metrics.json
```

## What You Get

```
═════════════════════════════════════════════════════════════════════════════════════════════════════════
  GitHub Contribution Summary: username
═════════════════════════════════════════════════════════════════════════════════════════════════════════
  Period: 2024-01-01 to now

  Overview
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  PRs Raised: 45
  PRs Reviewed: 32
  Issues Created: 12
  Issues Assigned: 25
  Repos Contributed: 8

  Pull Request Metrics
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Merged: 42
  Open: 2
  Closed (not merged): 1
  Total Comments Received: 156
  Avg Comments/PR: 3.47
  Total Changes Requested: 28
  Avg Changes Requested/PR: 0.62
  Avg Time to Merge: 1.8 days

  Issues Created (by user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Total Created: 12
  Open: 3
  Closed: 9

  Issues Assigned (to user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Total Assigned: 25
  Open: 8
  Closed: 17

  PRs Reviewed (by user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Total PRs Reviewed: 32

  AI Assistance Detection
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  AI-Assisted PRs: 15 (33.3%)
  Human-Only PRs: 30 (66.7%)
    └─ Claude: 12
    └─ GitHub Copilot: 3
  Note: Based on Co-Authored-By commit trailers

  Contribution by Repository
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Repository                      | PRs | Merged | Comments | Changes Req | Avg Merge Time
  adobe/helix-project             | 15  | 14     | 45       | 8           | 2.1 days
  aemdemos/mysite                 | 12  | 12     | 32       | 5           | 1.2 days
  ...

  Pull Requests (highlighted: PRs with 2+ changes requested)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  PR     | Repository              | Status | Comments | Chg Req | AI  | Link
  #123   | adobe/helix-project     | Merged | 8        | 3       | Yes | https://github.com/...
  #456   | aemdemos/mysite         | Merged | 2        | 0       | -   | https://github.com/...

  Issues Created (by user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Issue  | Repository              | Status | Comments | Link
  #789   | adobe/aem-core          | Closed | 5        | https://github.com/...

  Issues Assigned (to user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  Issue  | Repository              | Status | Comments | Link
  #101   | aemdemos/project        | Open   | 3        | https://github.com/...

  PRs Reviewed (by user)
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  PR     | Repository              | Status | Link
  #202   | adobe/helix-project     | Merged | https://github.com/...
```

## Commands

| Command | Description |
|---------|-------------|
| `summary` (or `all`) | **All metrics in one shot** - PRs, issues, AI detection, repo breakdown |
| `pr` | PR metrics for a single repository |
| `user` | User PR/issue stats across repos |
| `repo` | Repository contributor stats |

## Options

| Option | Description |
|--------|-------------|
| `-u, --user <username>` | GitHub username (required) |
| `-o, --org <orgs>` | Filter by org(s), comma-separated |
| `-t, --token <token>` | GitHub token (or use GITHUB_TOKEN env) |
| `--since <date>` | Filter after date (YYYY-MM-DD) |
| `--until <date>` | Filter before date (YYYY-MM-DD) |
| `--top <number>` | Top N repositories (default: 10) |
| `--export <file>` | Export to JSON file |
| `--format <type>` | Output: table, json |

## Features

- **PR Metrics**: Comments, changes requested, time to merge
- **Issue Tracking**: Issues created by user and issues assigned to user
- **PR Reviews**: Track PRs where user was a reviewer
- **AI Detection**: Identifies AI-assisted commits via Co-Authored-By trailers (Claude, Copilot, etc.)
- **Code Quality**: Changes requested distribution (clean PRs vs. revisions)
- **Repo Breakdown**: Contributions grouped by repository
- **Highlighting**: PRs with most review feedback are highlighted
- **Direct Links**: Clickable URLs to each PR/issue
- **Export**: JSON and CSV export (single file with all sections)

## License

MIT
