/**
 * User Stats Command
 * Analyze a user's PRs and contributions across ALL repositories
 */

import { GitHubClient } from '../lib/github-client.js';
import {
  formatJSON,
  exportToFile,
  printError,
  printInfo,
} from '../lib/formatters.js';
import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Format user PR stats as table
 */
function formatUserPRStatsTable(data) {
  console.log('\n' + chalk.bold.blue('═'.repeat(80)));
  console.log(chalk.bold.white('  GitHub User PR Metrics (Cross-Repository)'));
  console.log(chalk.bold.blue('═'.repeat(80)));

  console.log(`  ${chalk.gray('User:')} ${chalk.white(data.user)}`);
  if (data.orgFilter) {
    console.log(`  ${chalk.gray('Organization(s):')} ${chalk.white(data.orgFilter)}`);
  }
  if (data.dateRange.since || data.dateRange.until) {
    console.log(`  ${chalk.gray('Period:')} ${data.dateRange.since || 'start'} to ${data.dateRange.until || 'now'}`);
  }

  console.log('\n' + chalk.bold.yellow('  Overall PR Statistics'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const statsTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  statsTable.push(
    { 'Total PRs Raised': chalk.cyan(data.summary.totalPRs) },
    { 'Merged PRs': chalk.green(data.summary.mergedPRs) },
    { 'Open PRs': chalk.yellow(data.summary.openPRs) },
    { 'Closed (not merged)': chalk.red(data.summary.closedPRs) },
    { 'Repos Contributed': chalk.cyan(data.summary.reposContributed) },
  );
  console.log(statsTable.toString());

  // Issue Stats
  console.log('\n' + chalk.bold.yellow('  Issue Statistics'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const issueTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  issueTable.push(
    { 'Total Issues Opened': chalk.cyan(data.summary.totalIssues) },
    { 'Open Issues': chalk.yellow(data.summary.openIssues) },
    { 'Closed Issues': chalk.green(data.summary.closedIssues) },
  );
  console.log(issueTable.toString());

  console.log('\n' + chalk.bold.yellow('  Review Feedback Summary'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const reviewTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  reviewTable.push(
    { 'Total Comments Received': data.summary.totalComments },
    { 'Avg Comments per PR': data.summary.avgCommentsPerPR },
    { 'Total Changes Requested': data.summary.totalChangesRequested },
    { 'Avg Changes Requested/PR': data.summary.avgChangesRequestedPerPR },
    { 'Avg Time to Merge': `${data.summary.avgTimeToMerge} days` },
  );
  console.log(reviewTable.toString());

  // AI Assistance Stats
  console.log('\n' + chalk.bold.yellow('  AI Assistance Detection'));
  console.log(chalk.gray('  ' + '─'.repeat(76)));

  const aiTable = new Table({
    chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    style: { head: ['cyan'], border: ['gray'] },
  });

  aiTable.push(
    { 'AI-Assisted PRs': `${data.summary.aiAssistedPRs} (${data.summary.aiAssistedPercentage}%)` },
    { 'Human-Only PRs': data.summary.totalPRs - data.summary.aiAssistedPRs },
  );

  if (Object.keys(data.summary.aiToolsBreakdown).length > 0) {
    Object.entries(data.summary.aiToolsBreakdown).forEach(([tool, count]) => {
      aiTable.push({ [`  └─ ${tool}`]: count });
    });
  }
  console.log(aiTable.toString());
  console.log(chalk.gray('  Note: AI detection based on Co-Authored-By commit trailers'));

  if (data.repoBreakdown && data.repoBreakdown.length > 0) {
    console.log('\n' + chalk.bold.yellow('  PRs by Repository'));
    console.log(chalk.gray('  ' + '─'.repeat(76)));

    const repoTable = new Table({
      head: ['Repository', 'PRs', 'Merged', 'Comments', 'Changes Req', 'Avg Time'],
      colWidths: [30, 8, 9, 11, 13, 12],
      style: { head: ['cyan'], border: ['gray'] },
    });

    data.repoBreakdown.forEach(repo => {
      repoTable.push([
        repo.repo.length > 28 ? repo.repo.substring(0, 25) + '...' : repo.repo,
        repo.totalPRs,
        chalk.green(repo.mergedPRs),
        repo.totalComments,
        repo.changesRequested,
        repo.avgTimeToMerge ? `${repo.avgTimeToMerge}d` : '-',
      ]);
    });

    console.log(repoTable.toString());
  }

  if (data.prs && data.prs.length > 0) {
    // Find threshold for highlighting (top 20% by changes requested)
    const changesReqValues = data.prs.map(pr => pr.changesRequested).sort((a, b) => b - a);
    const highlightThreshold = changesReqValues[Math.floor(changesReqValues.length * 0.2)] || 2;

    console.log('\n' + chalk.bold.yellow('  Pull Requests'));
    console.log(chalk.gray('  ' + '─'.repeat(100)));
    console.log(chalk.gray(`  (Highlighted: PRs with ${highlightThreshold}+ changes requested)`));

    const prTable = new Table({
      head: ['PR', 'Repository', 'Status', 'Comments', 'Chg Req', 'AI', 'Link'],
      colWidths: [8, 25, 10, 10, 9, 6, 45],
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

  // Issues table
  if (data.issues && data.issues.length > 0) {
    console.log('\n' + chalk.bold.yellow('  Issues'));
    console.log(chalk.gray('  ' + '─'.repeat(100)));

    const issueTable = new Table({
      head: ['Issue', 'Repository', 'Status', 'Comments', 'Link'],
      colWidths: [8, 25, 10, 10, 55],
      style: { head: ['cyan'], border: ['gray'] },
      wordWrap: true,
    });

    data.issues.forEach(issue => {
      const repo = issue.repo.length > 23 ? issue.repo.substring(0, 20) + '...' : issue.repo;

      issueTable.push([
        `#${issue.number}`,
        repo,
        issue.state === 'open' ? chalk.yellow('Open') : chalk.green('Closed'),
        issue.comments,
        chalk.blue.underline(issue.url),
      ]);
    });

    console.log(issueTable.toString());
  }

  console.log();
}

/**
 * Main user stats command handler
 */
export async function userStats(options) {
  const token = options.token || process.env.GITHUB_TOKEN;

  try {
    const client = new GitHubClient(token);

    const orgFilter = options.org ? ` in org(s): ${options.org}` : ' across all repositories';
    printInfo(`Fetching PRs and issues by ${options.user}${orgFilter}...`);

    // Fetch PRs and issues in parallel
    const [prs, issues] = await Promise.all([
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
    ]);

    if (prs.length === 0 && issues.length === 0) {
      printInfo(`No PRs or issues found for user ${options.user}`);
      return;
    }

    printInfo(`Found ${prs.length} PRs and ${issues.length} issues. Fetching details...`);

    // Process each PR to get comment and review stats
    const prDetails = [];
    const repoMap = new Map();

    for (const pr of prs) {
      // Extract owner/repo from PR URL
      const urlParts = pr.repository_url.split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];
      const repoFullName = `${owner}/${repo}`;

      try {
        // Fetch review details and commits
        const [reviews, comments, commits] = await Promise.all([
          client.octokit.pulls.listReviews({ owner, repo, pull_number: pr.number, per_page: 100 }),
          client.octokit.issues.listComments({ owner, repo, issue_number: pr.number, per_page: 100 }),
          client.fetchPRCommits(owner, repo, pr.number),
        ]);

        const changesRequested = reviews.data.filter(r => r.state === 'CHANGES_REQUESTED').length;
        const totalComments = comments.data.length + (pr.comments || 0);

        // Detect AI co-authorship in commits
        let aiAssisted = false;
        const aiToolsUsed = new Set();
        for (const commit of commits) {
          const detection = client.detectAICoAuthorship(commit.commit.message);
          if (detection.isAIAssisted) {
            aiAssisted = true;
            detection.aiTools.forEach(tool => aiToolsUsed.add(tool));
          }
        }

        // Calculate time to merge
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
          commitCount: commits.length,
        };

        prDetails.push(prData);

        // Aggregate by repo
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
        // Skip PRs we can't access (private repos, etc.)
        process.stdout.write('x');
      }
    }
    console.log();

    // Calculate summary
    const mergedPRs = prDetails.filter(pr => pr.merged);
    const openPRs = prDetails.filter(pr => pr.state === 'open');
    const closedPRs = prDetails.filter(pr => pr.state === 'closed' && !pr.merged);

    const totalComments = prDetails.reduce((sum, pr) => sum + pr.comments, 0);
    const totalChangesRequested = prDetails.reduce((sum, pr) => sum + pr.changesRequested, 0);
    const mergeTimes = mergedPRs.map(pr => pr.timeToMerge).filter(t => t !== null);

    const avgTimeToMerge = mergeTimes.length > 0
      ? Number((mergeTimes.reduce((a, b) => a + b, 0) / mergeTimes.length).toFixed(2))
      : 0;

    // AI assistance stats
    const aiAssistedPRs = prDetails.filter(pr => pr.aiAssisted);
    const aiToolsCount = {};
    aiAssistedPRs.forEach(pr => {
      pr.aiTools.forEach(tool => {
        aiToolsCount[tool] = (aiToolsCount[tool] || 0) + 1;
      });
    });

    // Process issues
    const openIssues = issues.filter(i => i.state === 'open');
    const closedIssues = issues.filter(i => i.state === 'closed');

    const issueDetails = issues.map(issue => {
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
      };
    });

    // Prepare repo breakdown
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
        // PR stats
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
        // AI stats
        aiAssistedPRs: aiAssistedPRs.length,
        aiAssistedPercentage: prDetails.length > 0 ? Number(((aiAssistedPRs.length / prDetails.length) * 100).toFixed(1)) : 0,
        aiToolsBreakdown: aiToolsCount,
        // Issue stats
        totalIssues: issues.length,
        openIssues: openIssues.length,
        closedIssues: closedIssues.length,
      },
      repoBreakdown,
      prs: prDetails,
      issues: issueDetails,
    };

    // Output based on format
    switch (options.format) {
      case 'json':
        formatJSON(result);
        break;
      default:
        formatUserPRStatsTable(result);
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
