/**
 * Summary Command
 * All-in-one metrics: PRs, Issues, AI detection, repo breakdown
 */

import { GitHubClient } from '../lib/github-client.js';
import {
  formatJSON,
  exportToFile,
  printError,
  printInfo,
  printSuccess,
} from '../lib/formatters.js';
import fs from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Export all data to a single CSV file with sections
 */
function exportToCSV(data, filename) {
  const rows = [];
  const toRow = (cells) => cells.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');

  // Calculate percentages
  const totalPRs = data.summary.totalPRs || 1;
  const mergedPct = ((data.summary.mergedPRs / totalPRs) * 100).toFixed(1);
  const openPRPct = ((data.summary.openPRs / totalPRs) * 100).toFixed(1);
  const closedPRPct = ((data.summary.closedPRs / totalPRs) * 100).toFixed(1);

  // === SUMMARY SECTION ===
  rows.push(toRow(['=== SUMMARY ===', '', '']));
  rows.push(toRow(['Metric', 'Value', 'Percentage']));
  rows.push(toRow(['User', data.user, '']));
  rows.push(toRow(['Period', `${data.dateRange.since || 'all time'} to ${data.dateRange.until || 'now'}`, '']));
  rows.push(toRow(['Organization Filter', data.orgFilter || 'None', '']));
  rows.push(toRow(['', '', '']));
  rows.push(toRow(['PRs Raised', data.summary.totalPRs, '100%']));
  rows.push(toRow(['Merged PRs', data.summary.mergedPRs, `${mergedPct}%`]));
  rows.push(toRow(['Open PRs', data.summary.openPRs, `${openPRPct}%`]));
  rows.push(toRow(['Closed PRs (not merged)', data.summary.closedPRs, `${closedPRPct}%`]));
  rows.push(toRow(['Repos Contributed', data.summary.reposContributed, '']));
  rows.push(toRow(['Total Comments', data.summary.totalComments, '']));
  rows.push(toRow(['Avg Comments/PR', data.summary.avgCommentsPerPR, '']));
  rows.push(toRow(['Total Changes Requested', data.summary.totalChangesRequested, '']));
  rows.push(toRow(['Avg Changes Requested/PR', data.summary.avgChangesRequestedPerPR, '']));
  rows.push(toRow(['Avg Time to Merge (days)', data.summary.avgTimeToMerge, '']));
  rows.push(toRow(['', '', '']));
  rows.push(toRow(['Issues Created', data.summary.totalIssuesCreated, '']));
  rows.push(toRow(['Open Issues Created', data.summary.openIssuesCreated, '']));
  rows.push(toRow(['Closed Issues Created', data.summary.closedIssuesCreated, '']));
  rows.push(toRow(['', '', '']));
  rows.push(toRow(['Issues Assigned', data.summary.totalIssuesAssigned, '']));
  rows.push(toRow(['Open Issues Assigned', data.summary.openIssuesAssigned, '']));
  rows.push(toRow(['Closed Issues Assigned', data.summary.closedIssuesAssigned, '']));
  rows.push(toRow(['', '', '']));
  rows.push(toRow(['PRs Reviewed', data.summary.totalPRsReviewed, '']));
  rows.push(toRow(['AI-Assisted PRs', data.summary.aiAssistedPRs, `${data.summary.aiAssistedPercentage}%`]));

  // Code quality distribution
  const dist = data.summary.changesRequestedDistribution || {};
  const cleanPRs = dist['0'] || 0;
  const minorRevisions = dist['1'] || 0;
  const multipleRevisions = Object.entries(dist)
    .filter(([k]) => parseInt(k) >= 2)
    .reduce((sum, [, v]) => sum + v, 0);

  rows.push(toRow(['', '', '']));
  rows.push(toRow(['CODE QUALITY', '', '']));
  rows.push(toRow(['Clean PRs (0 changes requested)', cleanPRs, `${((cleanPRs / totalPRs) * 100).toFixed(1)}%`]));
  rows.push(toRow(['Minor Revisions (1 change)', minorRevisions, `${((minorRevisions / totalPRs) * 100).toFixed(1)}%`]));
  rows.push(toRow(['Multiple Revisions (2+)', multipleRevisions, `${((multipleRevisions / totalPRs) * 100).toFixed(1)}%`]));

  // AI tools breakdown
  Object.entries(data.summary.aiToolsBreakdown || {}).forEach(([tool, count]) => {
    rows.push(toRow([`AI Tool: ${tool}`, count, '']));
  });

  // === PULL REQUESTS RAISED ===
  rows.push(toRow(['', '', '', '', '', '', '', '', '', '', '', '']));
  rows.push(toRow(['=== PULL REQUESTS RAISED ===', '', '', '', '', '', '', '', '', '', '', '']));
  rows.push(toRow(['PR Number', 'Repository', 'Title', 'Status', 'Merged', 'Comments', 'Changes Requested', 'Time to Merge (days)', 'AI Assisted', 'AI Tools', 'Created At', 'URL']));
  data.prs.forEach(pr => {
    rows.push(toRow([
      pr.number,
      pr.repo,
      pr.title,
      pr.state,
      pr.merged ? 'Yes' : 'No',
      pr.comments,
      pr.changesRequested,
      pr.timeToMerge || '',
      pr.aiAssisted ? 'Yes' : 'No',
      (pr.aiTools || []).join('; '),
      pr.createdAt,
      pr.url,
    ]));
  });

  // === ISSUES CREATED ===
  rows.push(toRow(['', '', '', '', '', '', '', '']));
  rows.push(toRow(['=== ISSUES CREATED ===', '', '', '', '', '', '', '']));
  rows.push(toRow(['Issue Number', 'Repository', 'Title', 'Status', 'Comments', 'Created At', 'Closed At', 'URL']));
  (data.issuesCreated || []).forEach(issue => {
    rows.push(toRow([
      issue.number,
      issue.repo,
      issue.title,
      issue.state,
      issue.comments,
      issue.createdAt,
      issue.closedAt || '',
      issue.url,
    ]));
  });

  // === ISSUES ASSIGNED ===
  rows.push(toRow(['', '', '', '', '', '', '', '']));
  rows.push(toRow(['=== ISSUES ASSIGNED ===', '', '', '', '', '', '', '']));
  rows.push(toRow(['Issue Number', 'Repository', 'Title', 'Status', 'Comments', 'Created At', 'Closed At', 'URL']));
  (data.issuesAssigned || []).forEach(issue => {
    rows.push(toRow([
      issue.number,
      issue.repo,
      issue.title,
      issue.state,
      issue.comments,
      issue.createdAt,
      issue.closedAt || '',
      issue.url,
    ]));
  });

  // === PRS REVIEWED ===
  rows.push(toRow(['', '', '', '', '', '', '']));
  rows.push(toRow(['=== PRS REVIEWED ===', '', '', '', '', '', '']));
  rows.push(toRow(['PR Number', 'Repository', 'Title', 'Status', 'Merged', 'Created At', 'URL']));
  (data.prsReviewed || []).forEach(pr => {
    rows.push(toRow([
      pr.number,
      pr.repo,
      pr.title,
      pr.state,
      pr.merged ? 'Yes' : 'No',
      pr.createdAt,
      pr.url,
    ]));
  });

  // === REPOSITORY BREAKDOWN ===
  rows.push(toRow(['', '', '', '', '', '']));
  rows.push(toRow(['=== REPOSITORY BREAKDOWN ===', '', '', '', '', '']));
  rows.push(toRow(['Repository', 'Total PRs', 'Merged PRs', 'Total Comments', 'Changes Requested', 'Avg Time to Merge (days)']));
  data.repoBreakdown.forEach(repo => {
    rows.push(toRow([
      repo.repo,
      repo.totalPRs,
      repo.mergedPRs,
      repo.totalComments,
      repo.changesRequested,
      repo.avgTimeToMerge || '',
    ]));
  });

  // Write single file
  const csvFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  fs.writeFileSync(csvFilename, rows.join('\n'));

  return csvFilename;
}

/**
 * Format complete summary as table
 */
function formatSummaryTable(data) {
  console.log('\n' + chalk.bold.blue('═'.repeat(105)));
  console.log(chalk.bold.white(`  GitHub Contribution Summary: ${data.user}`));
  console.log(chalk.bold.blue('═'.repeat(105)));

  if (data.orgFilter) {
    console.log(`  ${chalk.gray('Organization(s):')} ${chalk.white(data.orgFilter)}`);
  }
  if (data.dateRange.since || data.dateRange.until) {
    console.log(`  ${chalk.gray('Period:')} ${data.dateRange.since || 'all time'} to ${data.dateRange.until || 'now'}`);
  }

  // Overall Stats
  console.log('\n' + chalk.bold.yellow('  Overview'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const overviewTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  overviewTable.push(
    { 'PRs Raised': chalk.cyan(data.summary.totalPRs) },
    { 'PRs Reviewed': chalk.cyan(data.summary.totalPRsReviewed) },
    { 'Issues Created': chalk.cyan(data.summary.totalIssuesCreated) },
    { 'Issues Assigned': chalk.cyan(data.summary.totalIssuesAssigned) },
    { 'Repos Contributed': chalk.cyan(data.summary.reposContributed) },
  );
  console.log(overviewTable.toString());

  // PR Stats
  console.log('\n' + chalk.bold.yellow('  Pull Request Metrics'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const prStatsTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  const totalPRs = data.summary.totalPRs || 1; // Avoid division by zero
  const mergedPct = ((data.summary.mergedPRs / totalPRs) * 100).toFixed(1);
  const openPRPct = ((data.summary.openPRs / totalPRs) * 100).toFixed(1);
  const closedPRPct = ((data.summary.closedPRs / totalPRs) * 100).toFixed(1);

  prStatsTable.push(
    { 'Merged': chalk.green(`${data.summary.mergedPRs} (${mergedPct}%)`) },
    { 'Open': chalk.yellow(`${data.summary.openPRs} (${openPRPct}%)`) },
    { 'Closed (not merged)': chalk.red(`${data.summary.closedPRs} (${closedPRPct}%)`) },
    { 'Total Comments Received': data.summary.totalComments },
    { 'Avg Comments/PR': data.summary.avgCommentsPerPR },
    { 'Total Changes Requested': data.summary.totalChangesRequested },
    { 'Avg Changes Requested/PR': data.summary.avgChangesRequestedPerPR },
    { 'Avg Time to Merge': `${data.summary.avgTimeToMerge} days` },
  );
  console.log(prStatsTable.toString());

  // Code Quality - Changes Requested Distribution
  console.log('\n' + chalk.bold.yellow('  Code Quality (Changes Requested Distribution)'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const qualityTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  const dist = data.summary.changesRequestedDistribution || {};
  const cleanPRs = dist['0'] || 0;
  const minorRevisions = dist['1'] || 0;
  const multipleRevisions = Object.entries(dist)
    .filter(([k]) => parseInt(k) >= 2)
    .reduce((sum, [, v]) => sum + v, 0);

  const cleanPct = ((cleanPRs / totalPRs) * 100).toFixed(1);
  const minorPct = ((minorRevisions / totalPRs) * 100).toFixed(1);
  const multiplePct = ((multipleRevisions / totalPRs) * 100).toFixed(1);

  qualityTable.push(
    { 'Clean PRs (0 changes requested)': chalk.green(`${cleanPRs} (${cleanPct}%)`) },
    { 'Minor Revisions (1 change requested)': chalk.yellow(`${minorRevisions} (${minorPct}%)`) },
    { 'Multiple Revisions (2+ changes requested)': chalk.red(`${multipleRevisions} (${multiplePct}%)`) },
  );

  // Show detailed breakdown if there are PRs with many revisions
  const maxChanges = Math.max(...Object.keys(dist).map(Number), 0);
  if (maxChanges >= 3) {
    qualityTable.push({ '': '' });
    qualityTable.push({ [chalk.gray('Detailed breakdown:')]: '' });
    Object.entries(dist)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([changes, count]) => {
        const pct = ((count / totalPRs) * 100).toFixed(1);
        qualityTable.push({ [`  ${changes} changes requested`]: `${count} PRs (${pct}%)` });
      });
  }

  console.log(qualityTable.toString());

  // Issue Stats - Created by user
  console.log('\n' + chalk.bold.yellow('  Issues Created (by user)'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const issueCreatedTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  const totalIssuesCreated = data.summary.totalIssuesCreated || 1;
  const openIssueCreatedPct = ((data.summary.openIssuesCreated / totalIssuesCreated) * 100).toFixed(1);
  const closedIssueCreatedPct = ((data.summary.closedIssuesCreated / totalIssuesCreated) * 100).toFixed(1);

  issueCreatedTable.push(
    { 'Total Created': chalk.cyan(data.summary.totalIssuesCreated) },
    { 'Open': chalk.yellow(`${data.summary.openIssuesCreated} (${openIssueCreatedPct}%)`) },
    { 'Closed': chalk.green(`${data.summary.closedIssuesCreated} (${closedIssueCreatedPct}%)`) },
  );
  console.log(issueCreatedTable.toString());

  // Issue Stats - Assigned to user
  console.log('\n' + chalk.bold.yellow('  Issues Assigned (to user)'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const issueAssignedTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  const totalIssuesAssigned = data.summary.totalIssuesAssigned || 1;
  const openIssueAssignedPct = ((data.summary.openIssuesAssigned / totalIssuesAssigned) * 100).toFixed(1);
  const closedIssueAssignedPct = ((data.summary.closedIssuesAssigned / totalIssuesAssigned) * 100).toFixed(1);

  issueAssignedTable.push(
    { 'Total Assigned': chalk.cyan(data.summary.totalIssuesAssigned) },
    { 'Open': chalk.yellow(`${data.summary.openIssuesAssigned} (${openIssueAssignedPct}%)`) },
    { 'Closed': chalk.green(`${data.summary.closedIssuesAssigned} (${closedIssueAssignedPct}%)`) },
  );
  console.log(issueAssignedTable.toString());

  // PRs Reviewed
  console.log('\n' + chalk.bold.yellow('  PRs Reviewed (by user)'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const reviewedTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  reviewedTable.push(
    { 'Total PRs Reviewed': chalk.cyan(data.summary.totalPRsReviewed) },
  );
  console.log(reviewedTable.toString());

  // AI Stats
  console.log('\n' + chalk.bold.yellow('  AI Assistance Detection'));
  console.log(chalk.gray('  ' + '─'.repeat(101)));

  const aiTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  const aiPct = data.summary.aiAssistedPercentage;
  const humanPct = (100 - aiPct).toFixed(1);

  aiTable.push(
    { 'AI-Assisted PRs': `${data.summary.aiAssistedPRs} (${aiPct}%)` },
    { 'Human-Only PRs': `${data.summary.totalPRs - data.summary.aiAssistedPRs} (${humanPct}%)` },
  );

  if (Object.keys(data.summary.aiToolsBreakdown).length > 0) {
    Object.entries(data.summary.aiToolsBreakdown).forEach(([tool, count]) => {
      aiTable.push({ [`  └─ ${tool}`]: count });
    });
  }
  console.log(aiTable.toString());
  console.log(chalk.gray('  Note: Based on Co-Authored-By commit trailers'));

  // Repo Breakdown
  if (data.repoBreakdown && data.repoBreakdown.length > 0) {
    console.log('\n' + chalk.bold.yellow('  Contribution by Repository'));
    console.log(chalk.gray('  ' + '─'.repeat(101)));

    const repoTable = new Table({
      head: ['Repository', 'PRs', 'Merged', 'Comments', 'Changes Req', 'Avg Merge Time'],
      colWidths: [35, 8, 9, 11, 13, 15],
      style: { head: ['cyan'], border: ['gray'] },
    });

    data.repoBreakdown.forEach(repo => {
      repoTable.push([
        repo.repo.length > 33 ? repo.repo.substring(0, 30) + '...' : repo.repo,
        repo.totalPRs,
        chalk.green(repo.mergedPRs),
        repo.totalComments,
        repo.changesRequested,
        repo.avgTimeToMerge ? `${repo.avgTimeToMerge} days` : '-',
      ]);
    });

    console.log(repoTable.toString());
  }

  // PRs Table
  if (data.prs && data.prs.length > 0) {
    const changesReqValues = data.prs.map(pr => pr.changesRequested).sort((a, b) => b - a);
    const highlightThreshold = changesReqValues[Math.floor(changesReqValues.length * 0.2)] || 2;

    console.log('\n' + chalk.bold.yellow('  Pull Requests'));
    console.log(chalk.gray('  ' + '─'.repeat(101)));
    console.log(chalk.gray(`  (Highlighted: PRs with ${highlightThreshold}+ changes requested)`));

    const prTable = new Table({
      head: ['PR', 'Repository', 'Status', 'Comments', 'Chg Req', 'AI', 'Link'],
      colWidths: [8, 25, 10, 10, 9, 6, 50],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    data.prs.forEach(pr => {
      const repo = pr.repo.length > 23 ? pr.repo.substring(0, 20) + '...' : pr.repo;
      const isHighlighted = pr.changesRequested >= highlightThreshold;

      const prNum = isHighlighted ? chalk.bgRed.white(` #${pr.number} `) : `#${pr.number}`;
      const chgReq = isHighlighted ? chalk.red.bold(pr.changesRequested) : pr.changesRequested;

      prTable.push([
        prNum,
        repo,
        pr.merged ? chalk.green('Merged') : pr.state === 'open' ? chalk.yellow('Open') : chalk.gray('Closed'),
        pr.comments,
        chgReq,
        pr.aiAssisted ? chalk.magenta('Yes') : chalk.gray('-'),
        chalk.blue.underline(pr.url),
      ]);
    });

    console.log(prTable.toString());
  }

  // Issues Created Table
  if (data.issuesCreated && data.issuesCreated.length > 0) {
    console.log('\n' + chalk.bold.yellow('  Issues Created (by user)'));
    console.log(chalk.gray('  ' + '─'.repeat(101)));

    const issueCreatedTable = new Table({
      head: ['Issue', 'Repository', 'Status', 'Comments', 'Link'],
      colWidths: [8, 25, 10, 10, 55],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    data.issuesCreated.forEach(issue => {
      const repo = issue.repo.length > 23 ? issue.repo.substring(0, 20) + '...' : issue.repo;

      issueCreatedTable.push([
        `#${issue.number}`,
        repo,
        issue.state === 'open' ? chalk.yellow('Open') : chalk.green('Closed'),
        issue.comments,
        chalk.blue.underline(issue.url),
      ]);
    });

    console.log(issueCreatedTable.toString());
  }

  // Issues Assigned Table
  if (data.issuesAssigned && data.issuesAssigned.length > 0) {
    console.log('\n' + chalk.bold.yellow('  Issues Assigned (to user)'));
    console.log(chalk.gray('  ' + '─'.repeat(101)));

    const issueAssignedTable = new Table({
      head: ['Issue', 'Repository', 'Status', 'Comments', 'Link'],
      colWidths: [8, 25, 10, 10, 55],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    data.issuesAssigned.forEach(issue => {
      const repo = issue.repo.length > 23 ? issue.repo.substring(0, 20) + '...' : issue.repo;

      issueAssignedTable.push([
        `#${issue.number}`,
        repo,
        issue.state === 'open' ? chalk.yellow('Open') : chalk.green('Closed'),
        issue.comments,
        chalk.blue.underline(issue.url),
      ]);
    });

    console.log(issueAssignedTable.toString());
  }

  // PRs Reviewed Table
  if (data.prsReviewed && data.prsReviewed.length > 0) {
    console.log('\n' + chalk.bold.yellow('  PRs Reviewed (by user)'));
    console.log(chalk.gray('  ' + '─'.repeat(101)));

    const prsReviewedTable = new Table({
      head: ['PR', 'Repository', 'Status', 'Link'],
      colWidths: [8, 25, 12, 60],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    data.prsReviewed.forEach(pr => {
      const repo = pr.repo.length > 23 ? pr.repo.substring(0, 20) + '...' : pr.repo;

      prsReviewedTable.push([
        `#${pr.number}`,
        repo,
        pr.merged ? chalk.green('Merged') : pr.state === 'open' ? chalk.yellow('Open') : chalk.gray('Closed'),
        chalk.blue.underline(pr.url),
      ]);
    });

    console.log(prsReviewedTable.toString());
  }

  console.log('\n' + chalk.bold.blue('═'.repeat(105)));
  console.log();
}

/**
 * Main summary command handler
 */
export async function summary(options) {
  const token = options.token || process.env.GITHUB_TOKEN;

  try {
    const client = new GitHubClient(token);

    const orgFilter = options.org ? ` in org(s): ${options.org}` : '';
    printInfo(`Fetching all metrics for ${options.user}${orgFilter}...`);

    // Fetch PRs, issues, assigned issues, and reviewed PRs in parallel
    const [prs, issuesCreated, issuesAssigned, prsReviewed] = await Promise.all([
      client.fetchUserPRsAcrossRepos(options.user, {
        since: options.since,
        until: options.until,
        org: options.org,
      }),
      client.fetchUserIssuesAcrossRepos(options.user, {
        since: options.since,
        until: options.until,
        org: options.org,
      }),
      client.fetchAssignedIssues(options.user, {
        since: options.since,
        until: options.until,
        org: options.org,
      }),
      client.fetchReviewRequestedPRs(options.user, {
        since: options.since,
        until: options.until,
        org: options.org,
      }),
    ]);

    if (prs.length === 0 && issuesCreated.length === 0 && issuesAssigned.length === 0) {
      printInfo(`No PRs or issues found for user ${options.user}`);
      return;
    }

    printInfo(`Found ${prs.length} PRs raised, ${issuesCreated.length} issues created, ${issuesAssigned.length} issues assigned, ${prsReviewed.length} PRs reviewed. Fetching details...`);

    // Process PRs
    const prDetails = [];
    const repoMap = new Map();

    for (const pr of prs) {
      const urlParts = pr.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      const repoFullName = `${owner}/${repo}`;

      try {
        const [reviews, comments, commits] = await Promise.all([
          client.octokit.pulls.listReviews({ owner, repo, pull_number: pr.number, per_page: 100 }),
          client.octokit.issues.listComments({ owner, repo, issue_number: pr.number, per_page: 100 }),
          client.fetchPRCommits(owner, repo, pr.number),
        ]);

        const changesRequested = reviews.data.filter(r => r.state === 'CHANGES_REQUESTED').length;
        const totalComments = comments.data.length + (pr.comments || 0);

        // AI detection
        let aiAssisted = false;
        const aiToolsUsed = new Set();
        for (const commit of commits) {
          const detection = client.detectAICoAuthorship(commit.commit.message);
          if (detection.isAIAssisted) {
            aiAssisted = true;
            detection.aiTools.forEach(tool => aiToolsUsed.add(tool));
          }
        }

        // Time to merge
        let timeToMerge = null;
        if (pr.pull_request?.merged_at) {
          const created = new Date(pr.created_at);
          const merged = new Date(pr.pull_request.merged_at);
          timeToMerge = Number(((merged - created) / (1000 * 60 * 60 * 24)).toFixed(2));
        }

        const prData = {
          number: pr.number,
          title: pr.title,
          repo: repoFullName,
          state: pr.state,
          merged: !!pr.pull_request?.merged_at,
          comments: totalComments,
          changesRequested,
          timeToMerge,
          createdAt: pr.created_at,
          url: pr.html_url,
          aiAssisted,
          aiTools: Array.from(aiToolsUsed),
        };

        prDetails.push(prData);

        // Repo aggregation
        if (!repoMap.has(repoFullName)) {
          repoMap.set(repoFullName, {
            repo: repoFullName,
            totalPRs: 0,
            mergedPRs: 0,
            totalComments: 0,
            changesRequested: 0,
            mergeTimesSum: 0,
            mergeTimesCount: 0,
          });
        }

        const repoStats = repoMap.get(repoFullName);
        repoStats.totalPRs++;
        if (prData.merged) repoStats.mergedPRs++;
        repoStats.totalComments += totalComments;
        repoStats.changesRequested += changesRequested;
        if (timeToMerge) {
          repoStats.mergeTimesSum += timeToMerge;
          repoStats.mergeTimesCount++;
        }

        process.stdout.write('.');
      } catch (err) {
        process.stdout.write('x');
      }
    }
    console.log();

    // Process issues created by user
    const openIssuesCreated = issuesCreated.filter(i => i.state === 'open');
    const closedIssuesCreated = issuesCreated.filter(i => i.state === 'closed');

    const issueCreatedDetails = issuesCreated.map(issue => {
      const urlParts = issue.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      return {
        number: issue.number,
        title: issue.title,
        repo: `${owner}/${repo}`,
        state: issue.state,
        comments: issue.comments || 0,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        url: issue.html_url,
        type: 'created',
      };
    });

    // Process issues assigned to user
    const openIssuesAssigned = issuesAssigned.filter(i => i.state === 'open');
    const closedIssuesAssigned = issuesAssigned.filter(i => i.state === 'closed');

    const issueAssignedDetails = issuesAssigned.map(issue => {
      const urlParts = issue.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      return {
        number: issue.number,
        title: issue.title,
        repo: `${owner}/${repo}`,
        state: issue.state,
        comments: issue.comments || 0,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
        url: issue.html_url,
        type: 'assigned',
      };
    });

    // Process PRs reviewed by user
    const prsReviewedDetails = prsReviewed.map(pr => {
      const urlParts = pr.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      return {
        number: pr.number,
        title: pr.title,
        repo: `${owner}/${repo}`,
        state: pr.state,
        merged: !!pr.pull_request?.merged_at,
        createdAt: pr.created_at,
        url: pr.html_url,
      };
    });

    // Calculate summaries
    const mergedPRs = prDetails.filter(pr => pr.merged);
    const openPRs = prDetails.filter(pr => pr.state === 'open');
    const closedPRs = prDetails.filter(pr => pr.state === 'closed' && !pr.merged);

    const totalComments = prDetails.reduce((sum, pr) => sum + pr.comments, 0);
    const totalChangesRequested = prDetails.reduce((sum, pr) => sum + pr.changesRequested, 0);
    const mergeTimes = mergedPRs.map(pr => pr.timeToMerge).filter(t => t !== null);

    const avgTimeToMerge = mergeTimes.length > 0
      ? Number((mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length).toFixed(2))
      : 0;

    // AI stats
    const aiAssistedPRs = prDetails.filter(pr => pr.aiAssisted);
    const aiToolsCount = {};
    aiAssistedPRs.forEach(pr => {
      pr.aiTools.forEach(tool => {
        aiToolsCount[tool] = (aiToolsCount[tool] || 0) + 1;
      });
    });

    // Changes requested distribution (code quality metric)
    const changesRequestedDistribution = {};
    prDetails.forEach(pr => {
      const changes = pr.changesRequested;
      changesRequestedDistribution[changes] = (changesRequestedDistribution[changes] || 0) + 1;
    });

    // Repo breakdown
    const repoBreakdown = Array.from(repoMap.values())
      .map(r => ({
        ...r,
        avgTimeToMerge: r.mergeTimesCount > 0
          ? Number((r.mergeTimesSum / r.mergeTimesCount).toFixed(2))
          : null,
      }))
      .sort((a, b) => b.totalPRs - a.totalPRs)
      .slice(0, Number(options.top));

    const result = {
      user: options.user,
      orgFilter: options.org || null,
      dateRange: {
        since: options.since || null,
        until: options.until || null,
      },
      summary: {
        totalPRs: prDetails.length,
        mergedPRs: mergedPRs.length,
        openPRs: openPRs.length,
        closedPRs: closedPRs.length,
        reposContributed: repoMap.size,
        totalComments,
        avgCommentsPerPR: prDetails.length > 0 ? Number((totalComments / prDetails.length).toFixed(2)) : 0,
        totalChangesRequested,
        avgChangesRequestedPerPR: prDetails.length > 0 ? Number((totalChangesRequested / prDetails.length).toFixed(2)) : 0,
        avgTimeToMerge,
        aiAssistedPRs: aiAssistedPRs.length,
        aiAssistedPercentage: prDetails.length > 0 ? Number(((aiAssistedPRs.length / prDetails.length) * 100).toFixed(1)) : 0,
        aiToolsBreakdown: aiToolsCount,
        changesRequestedDistribution,
        // Issues created by user
        totalIssuesCreated: issuesCreated.length,
        openIssuesCreated: openIssuesCreated.length,
        closedIssuesCreated: closedIssuesCreated.length,
        // Issues assigned to user
        totalIssuesAssigned: issuesAssigned.length,
        openIssuesAssigned: openIssuesAssigned.length,
        closedIssuesAssigned: closedIssuesAssigned.length,
        // PRs reviewed by user
        totalPRsReviewed: prsReviewed.length,
      },
      repoBreakdown,
      prs: prDetails,
      issuesCreated: issueCreatedDetails,
      issuesAssigned: issueAssignedDetails,
      prsReviewed: prsReviewedDetails,
    };

    // Output
    switch (options.format) {
      case 'json':
        formatJSON(result);
        break;
      default:
        formatSummaryTable(result);
    }

    // Export
    if (options.export) {
      const filename = options.export;
      if (filename.endsWith('.csv')) {
        const csvFile = exportToCSV(result, filename);
        printSuccess(`Data exported to: ${csvFile}`);
      } else {
        exportToFile(result, filename.endsWith('.json') ? filename : `${filename}.json`);
      }
    }

  } catch (error) {
    printError(error.message);
    process.exit(1);
  }
}
