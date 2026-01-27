/**
 * Output Formatters
 * Handle different output formats: table, json, csv
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';

/**
 * Format number with color based on thresholds
 */
export function colorNumber(value, { low = 3, high = 10, inverse = false } = {}) {
  const num = Number(value);
  if (inverse) {
    if (num <= low) return chalk.green(value);
    if (num >= high) return chalk.red(value);
    return chalk.yellow(value);
  } else {
    if (num <= low) return chalk.red(value);
    if (num >= high) return chalk.green(value);
    return chalk.yellow(value);
  }
}

/**
 * Format PR metrics as table
 */
export function formatPRMetricsTable(data) {
  console.log('\n' + chalk.bold.blue('═'.repeat(80)));
  console.log(chalk.bold.white('  GitHub PR Metrics Report'));
  console.log(chalk.bold.blue('═'.repeat(80)));

  console.log(`  ${chalk.gray('User:')} ${chalk.white(data.user)}`);
  console.log(`  ${chalk.gray('Repository:')} ${chalk.white(data.repository)}`);
  console.log(`  ${chalk.gray('Total PRs:')} ${chalk.cyan(data.totalPRs)}`);
  console.log(`  ${chalk.gray('Merged PRs:')} ${chalk.green(data.mergedPRs)}`);

  console.log('\n' + chalk.bold.yellow('  Summary Statistics'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const summaryTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  summaryTable.push(
    { 'Avg Comments/PR': data.summary.averageComments },
    { 'Median Comments/PR': data.summary.medianComments },
    { 'Avg Review Comments': data.summary.averageReviewComments },
    { 'Avg Changes Requested': data.summary.averageChangesRequested },
    { 'Avg Reviewers/PR': data.summary.averageReviewers },
    { 'Avg Time to Merge': `${data.summary.averageTimeToMerge} days` },
    { 'Total Comments': data.summary.totalComments },
  );

  console.log(summaryTable.toString());

  console.log('\n' + chalk.bold.yellow('  Individual PRs'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const prTable = new Table({
    head: ['PR', 'Title', 'Status', 'Comments', 'Reviews', 'Changes Req', 'Time'],
    colWidths: [8, 30, 10, 10, 9, 12, 10],
    style: { head: ['cyan'], border: ['gray'] },
    wordWrap: true,
  });

  data.prs.forEach(pr => {
    prTable.push([
      `#${pr.number}`,
      pr.title.substring(0, 28),
      pr.merged ? chalk.green('Merged') : chalk.gray(pr.state),
      pr.metrics.totalComments,
      pr.metrics.reviews,
      pr.metrics.changesRequested,
      pr.metrics.timeToMergeInDays ? `${pr.metrics.timeToMergeInDays}d` : '-',
    ]);
  });

  console.log(prTable.toString());
  console.log();
}

/**
 * Format user stats as table
 */
export function formatUserStatsTable(data) {
  console.log('\n' + chalk.bold.blue('═'.repeat(80)));
  console.log(chalk.bold.white('  GitHub User Contribution Report'));
  console.log(chalk.bold.blue('═'.repeat(80)));

  console.log(`  ${chalk.gray('User:')} ${chalk.white(data.user)}`);
  console.log(`  ${chalk.gray('Name:')} ${chalk.white(data.profile?.name || 'N/A')}`);
  console.log(`  ${chalk.gray('Public Repos:')} ${chalk.cyan(data.profile?.public_repos || 'N/A')}`);

  console.log('\n' + chalk.bold.yellow('  Overall Statistics'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const statsTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  statsTable.push(
    { 'Total Commits': chalk.green(data.stats.totalCommits) },
    { 'Total Additions': chalk.green(`+${data.stats.totalAdditions.toLocaleString()}`) },
    { 'Total Deletions': chalk.red(`-${data.stats.totalDeletions.toLocaleString()}`) },
    { 'Net Lines': data.stats.netLines >= 0 ? chalk.green(`+${data.stats.netLines.toLocaleString()}`) : chalk.red(data.stats.netLines.toLocaleString()) },
    { 'Repos Contributed': chalk.cyan(data.stats.reposContributed) },
    { 'Avg Commit Size': `${data.stats.avgCommitSize} lines` },
  );

  console.log(statsTable.toString());

  if (data.repoBreakdown && data.repoBreakdown.length > 0) {
    console.log('\n' + chalk.bold.yellow('  Top Repositories by Contribution'));
    console.log(chalk.gray('  ' + '─'.repeat(76)));

    const repoTable = new Table({
      head: ['Repository', 'Commits', 'Additions', 'Deletions', 'Net'],
      colWidths: [35, 10, 12, 12, 12],
      style: { head: ['cyan'], border: ['gray'] },
    });

    data.repoBreakdown.forEach(repo => {
      repoTable.push([
        repo.repo.substring(0, 33),
        repo.commits,
        chalk.green(`+${repo.additions.toLocaleString()}`),
        chalk.red(`-${repo.deletions.toLocaleString()}`),
        repo.net >= 0 ? chalk.green(`+${repo.net.toLocaleString()}`) : chalk.red(repo.net.toLocaleString()),
      ]);
    });

    console.log(repoTable.toString());
  }

  console.log();
}

/**
 * Format repo stats as table
 */
export function formatRepoStatsTable(data) {
  console.log('\n' + chalk.bold.blue('═'.repeat(80)));
  console.log(chalk.bold.white('  Repository Contribution Report'));
  console.log(chalk.bold.blue('═'.repeat(80)));

  console.log(`  ${chalk.gray('Repository:')} ${chalk.white(data.repository)}`);
  console.log(`  ${chalk.gray('Total Contributors:')} ${chalk.cyan(data.totalContributors)}`);
  console.log(`  ${chalk.gray('Total PRs:')} ${chalk.cyan(data.totalPRs)}`);

  console.log('\n' + chalk.bold.yellow('  Top Contributors'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const contribTable = new Table({
    head: ['Contributor', 'Commits', 'Additions', 'Deletions', 'PRs'],
    colWidths: [25, 10, 15, 15, 10],
    style: { head: ['cyan'], border: ['gray'] },
  });

  data.contributors.forEach(c => {
    contribTable.push([
      c.login,
      c.commits,
      chalk.green(`+${c.additions.toLocaleString()}`),
      chalk.red(`-${c.deletions.toLocaleString()}`),
      c.prs,
    ]);
  });

  console.log(contribTable.toString());
  console.log();
}

/**
 * Format data as JSON
 */
export function formatJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Format PR metrics as CSV
 */
export function formatPRMetricsCSV(data) {
  const headers = ['PR Number', 'Title', 'Status', 'Merged', 'Total Comments', 'Issue Comments', 'Review Comments', 'Reviews', 'Changes Requested', 'Approved', 'Reviewers', 'Participants', 'Commits', 'Additions', 'Deletions', 'Files Changed', 'Time to Merge (days)', 'Created At'];

  const rows = data.prs.map(pr => [
    pr.number,
    `"${pr.title.replace(/"/g, '""')}"`,
    pr.state,
    pr.merged,
    pr.metrics.totalComments,
    pr.metrics.issueComments,
    pr.metrics.reviewComments,
    pr.metrics.reviews,
    pr.metrics.changesRequested,
    pr.metrics.approved,
    pr.metrics.uniqueReviewers,
    pr.metrics.uniqueParticipants,
    pr.metrics.commits,
    pr.metrics.additions,
    pr.metrics.deletions,
    pr.metrics.changedFiles,
    pr.metrics.timeToMergeInDays || '',
    pr.createdAt,
  ]);

  console.log(headers.join(','));
  rows.forEach(row => console.log(row.join(',')));
}

/**
 * Format user stats as CSV
 */
export function formatUserStatsCSV(data) {
  const headers = ['Repository', 'Commits', 'Additions', 'Deletions', 'Net Lines'];

  console.log(headers.join(','));
  data.repoBreakdown.forEach(repo => {
    console.log([repo.repo, repo.commits, repo.additions, repo.deletions, repo.net].join(','));
  });
}

/**
 * Export data to JSON file
 */
export function exportToFile(data, filename) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(chalk.green(`\n✓ Data exported to ${filename}`));
}

/**
 * Print error message
 */
export function printError(message) {
  console.error(chalk.red(`\n✗ Error: ${message}`));
}

/**
 * Print success message
 */
export function printSuccess(message) {
  console.log(chalk.green(`\n✓ ${message}`));
}

/**
 * Print info message
 */
export function printInfo(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}
