/**
 * Repo Stats Command
 * Analyze repository contribution statistics
 */

import { GitHubClient } from '../lib/github-client.js';
import {
  formatRepoStatsTable,
  formatJSON,
  exportToFile,
  printError,
  printInfo,
} from '../lib/formatters.js';

/**
 * Main repo stats command handler
 */
export async function repoStats(options) {
  const token = options.token || process.env.GITHUB_TOKEN;

  try {
    const client = new GitHubClient(token);

    printInfo(`Fetching stats for ${options.owner}/${options.repo}...`);

    // Fetch contributor stats
    const contributorStats = await client.fetchContributorStats(options.owner, options.repo);

    if (!contributorStats) {
      printInfo('GitHub is computing stats. Please try again in a few seconds.');
      return;
    }

    // Fetch PRs to count per contributor
    const prs = await client.fetchRepoPRs(options.owner, options.repo, {
      since: options.since,
      until: options.until,
    });

    // Count PRs per author
    const prCounts = new Map();
    prs.forEach(pr => {
      const author = pr.user.login;
      prCounts.set(author, (prCounts.get(author) || 0) + 1);
    });

    // Process contributors
    const contributors = contributorStats
      .map(c => ({
        login: c.author.login,
        commits: c.total,
        additions: c.weeks.reduce((sum, w) => sum + w.a, 0),
        deletions: c.weeks.reduce((sum, w) => sum + w.d, 0),
        prs: prCounts.get(c.author.login) || 0,
      }))
      .sort((a, b) => b.commits - a.commits)
      .slice(0, Number(options.top));

    const result = {
      repository: `${options.owner}/${options.repo}`,
      totalContributors: contributorStats.length,
      totalPRs: prs.length,
      dateRange: {
        since: options.since || null,
        until: options.until || null,
      },
      contributors,
    };

    // Output based on format
    switch (options.format) {
      case 'json':
        formatJSON(result);
        break;
      default:
        formatRepoStatsTable(result);
    }

    // Export if requested
    if (options.export) {
      exportToFile(result, options.export);
    }

  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}
