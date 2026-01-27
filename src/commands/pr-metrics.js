/**
 * PR Metrics Command
 * Analyze PR metrics for a specific user in a repository
 */

import { GitHubClient } from '../lib/github-client.js';
import {
  formatPRMetricsTable,
  formatJSON,
  formatPRMetricsCSV,
  exportToFile,
  printError,
  printInfo,
} from '../lib/formatters.js';

/**
 * Calculate metrics for a single PR
 */
function calculatePRMetrics(prData) {
  const { pr, issueComments, reviewComments, reviews, commits } = prData;

  const totalIssueComments = issueComments.length;
  const totalReviewComments = reviewComments.length;
  const totalComments = totalIssueComments + totalReviewComments;

  const uniqueReviewers = new Set(reviews.map(r => r.user.login));
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
  const approved = reviews.filter(r => r.state === 'APPROVED').length;

  const createdAt = new Date(pr.created_at);
  const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
  const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;

  const timeToMerge = mergedAt ? (mergedAt - createdAt) / (1000 * 60 * 60 * 24) : null;
  const timeToClose = closedAt ? (closedAt - createdAt) / (1000 * 60 * 60 * 24) : null;

  const commenters = new Set([
    ...issueComments.map(c => c.user.login),
    ...reviewComments.map(c => c.user.login),
  ]);
  const allParticipants = new Set([...commenters, ...uniqueReviewers]);

  const conversationDensity = commits.length > 0
    ? (totalComments / commits.length).toFixed(2)
    : 0;

  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    merged: pr.merged_at !== null,
    author: pr.user.login,
    createdAt: pr.created_at,
    mergedAt: pr.merged_at,
    closedAt: pr.closed_at,
    url: pr.html_url,
    metrics: {
      totalComments,
      issueComments: totalIssueComments,
      reviewComments: totalReviewComments,
      reviews: reviews.length,
      changesRequested,
      approved,
      uniqueReviewers: uniqueReviewers.size,
      uniqueParticipants: allParticipants.size,
      commits: commits.length,
      conversationDensity: Number(conversationDensity),
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      timeToMergeInDays: timeToMerge ? Number(timeToMerge.toFixed(2)) : null,
      timeToCloseInDays: timeToClose ? Number(timeToClose.toFixed(2)) : null,
    },
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(allPRs, mergedPRs) {
  const avg = (arr) => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
  const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  };

  const comments = allPRs.map(pr => pr.metrics.totalComments);
  const reviewComments = allPRs.map(pr => pr.metrics.reviewComments);
  const changesRequested = allPRs.map(pr => pr.metrics.changesRequested);
  const reviewers = allPRs.map(pr => pr.metrics.uniqueReviewers);
  const participants = allPRs.map(pr => pr.metrics.uniqueParticipants);
  const commits = allPRs.map(pr => pr.metrics.commits);

  const mergedTimeToMerge = mergedPRs
    .map(pr => pr.metrics.timeToMergeInDays)
    .filter(t => t !== null);

  return {
    averageComments: avg(comments),
    medianComments: median(comments),
    averageReviewComments: avg(reviewComments),
    averageChangesRequested: avg(changesRequested),
    averageReviewers: avg(reviewers),
    averageParticipants: avg(participants),
    averageCommitsPerPR: avg(commits),
    averageTimeToMerge: avg(mergedTimeToMerge),
    medianTimeToMerge: median(mergedTimeToMerge),
    maxComments: comments.length ? Math.max(...comments) : 0,
    minComments: comments.length ? Math.min(...comments) : 0,
    totalComments: comments.reduce((a, b) => a + b, 0),
  };
}

/**
 * Main PR metrics command handler
 */
export async function prMetrics(options) {
  const token = options.token || process.env.GITHUB_TOKEN;

  try {
    const client = new GitHubClient(token);

    printInfo(`Fetching PRs by ${options.user} in ${options.owner}/${options.repo}...`);

    const prs = await client.fetchUserPRs(options.owner, options.repo, options.user, {
      state: options.state,
      since: options.since,
      until: options.until,
    });

    if (prs.length === 0) {
      printInfo(`No PRs found for user ${options.user}`);
      return;
    }

    printInfo(`Found ${prs.length} PRs. Fetching detailed metrics...`);

    const prMetricsData = [];
    for (const pr of prs) {
      try {
        const details = await client.fetchPRDetails(options.owner, options.repo, pr.number);
        const metrics = calculatePRMetrics(details);
        prMetricsData.push(metrics);
        process.stdout.write('.');
      } catch (err) {
        process.stdout.write('x');
      }
    }
    console.log();

    const mergedPRs = prMetricsData.filter(pr => pr.merged);
    const summary = calculateSummary(prMetricsData, mergedPRs);

    const result = {
      user: options.user,
      repository: `${options.owner}/${options.repo}`,
      totalPRs: prMetricsData.length,
      mergedPRs: mergedPRs.length,
      dateRange: {
        since: options.since || null,
        until: options.until || null,
      },
      summary,
      prs: prMetricsData,
    };

    // Output based on format
    switch (options.format) {
      case 'json':
        formatJSON(result);
        break;
      case 'csv':
        formatPRMetricsCSV(result);
        break;
      default:
        formatPRMetricsTable(result);
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
