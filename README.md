# GitHub Metrics Calculator

A production-ready CLI tool for analyzing GitHub PR metrics and user contributions.

## Installation

```bash
cd github-metrics-calculator
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

## Usage

### 1. PR Metrics (User in a Repo)

Analyze PRs raised by a user in a specific repository - comments, changes requested, time to merge.

```bash
# Basic usage
node bin/ghmetrics.js pr -o <owner> -r <repo> -u <username>

# Examples
node bin/ghmetrics.js pr -o aemdemos -r fondationsaudemarspiguet -u asthabharga
node bin/ghmetrics.js pr -o adobe -r helix-project -u john-doe

# With date filter
node bin/ghmetrics.js pr -o adobe -r helix-project -u john-doe --since 2024-01-01

# Export to JSON
node bin/ghmetrics.js pr -o adobe -r helix-project -u john-doe --export metrics.json

# Output as CSV
node bin/ghmetrics.js pr -o adobe -r helix-project -u john-doe --format csv
```

**Output includes:**
- Total PRs raised
- Comments per PR (issue + review comments)
- Changes requested count (review rounds)
- Approvals received
- Time to merge
- Code changes (+/- lines)

### 2. User Stats (Cross-Repo)

Analyze a user's contributions across all public repositories.

```bash
# Basic usage
node bin/ghmetrics.js user -u <username>

# Examples
node bin/ghmetrics.js user -u asthabharga
node bin/ghmetrics.js user -u asthabharga --since 2024-01-01 --top 20

# Export to JSON
node bin/ghmetrics.js user -u asthabharga --export user-stats.json
```

**Output includes:**
- Total commits across all repos
- Lines added/deleted
- Top repositories by contribution
- Average commit size

### 3. Repo Stats (All Contributors)

Analyze all contributors to a repository.

```bash
# Basic usage
node bin/ghmetrics.js repo -o <owner> -r <repo>

# Examples
node bin/ghmetrics.js repo -o aemdemos -r fondationsaudemarspiguet
node bin/ghmetrics.js repo -o adobe -r helix-project --top 20
```

**Output includes:**
- Top contributors ranked by commits
- Lines added/deleted per contributor
- PRs raised per contributor

## Command Options

### Common Options
| Option | Description |
|--------|-------------|
| `-t, --token <token>` | GitHub token (or use GITHUB_TOKEN env var) |
| `--since <date>` | Filter after this date (YYYY-MM-DD) |
| `--until <date>` | Filter before this date (YYYY-MM-DD) |
| `--export <file>` | Export results to JSON file |
| `--format <type>` | Output format: table, json, csv |

### PR Command Options
| Option | Description |
|--------|-------------|
| `-o, --owner <owner>` | Repository owner (required) |
| `-r, --repo <repo>` | Repository name (required) |
| `-u, --user <username>` | GitHub username (required) |
| `--state <state>` | PR state: all, open, closed, merged |

### User Command Options
| Option | Description |
|--------|-------------|
| `-u, --user <username>` | GitHub username (required) |
| `--top <number>` | Top N repositories (default: 10) |

### Repo Command Options
| Option | Description |
|--------|-------------|
| `-o, --owner <owner>` | Repository owner (required) |
| `-r, --repo <repo>` | Repository name (required) |
| `--top <number>` | Top N contributors (default: 10) |

## Global Install (Optional)

```bash
npm link
# Now use from anywhere:
ghmetrics pr -o adobe -r helix-project -u john-doe
```

## Output Examples

### PR Metrics Output
```
══════════════════════════════════════════════════════════════════════════════
  GitHub PR Metrics Report
══════════════════════════════════════════════════════════════════════════════
  User: john-doe
  Repository: adobe/helix-project
  Total PRs: 15
  Merged PRs: 14

  Summary Statistics
  ──────────────────────────────────────────────────────────────────────────────
  Avg Comments/PR: 8.73
  Avg Changes Requested: 1.2
  Avg Time to Merge: 2.45 days
```

## License

MIT
