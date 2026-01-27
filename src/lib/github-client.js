/**
 * GitHub API Client
 * Centralized client for all GitHub API interactions
 */

import { Octokit } from '@octokit/rest';

export class GitHubClient {
  constructor(token) {
    if (!token) {
      throw new Error('GitHub token is required. Set GITHUB_TOKEN env var or use --token flag');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'github-metrics-calculator/1.0.0',
    });
  }

  /**
   * Fetch all PRs by a user in a repository with pagination
   */
  async fetchUserPRs(owner, repo, username, options = {}) {
    const prs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.octokit.pulls.list({
        owner,
        repo,
        state: options.state || 'all',
        per_page: 100,
        page,
      });

      let userPRs = response.data.filter(pr => pr.user.login === username);

      // Apply date filters
      if (options.since) {
        const sinceDate = new Date(options.since);
        userPRs = userPRs.filter(pr => new Date(pr.created_at) >= sinceDate);
      }
      if (options.until) {
        const untilDate = new Date(options.until);
        userPRs = userPRs.filter(pr => new Date(pr.created_at) <= untilDate);
      }

      prs.push(...userPRs);
      hasMore = response.data.length === 100;
      page++;
    }

    return prs;
  }

  /**
   * Fetch detailed metrics for a single PR
   */
  async fetchPRDetails(owner, repo, prNumber) {
    const [prDetails, issueComments, reviewComments, reviews, commits] = await Promise.all([
      this.octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      this.octokit.issues.listComments({ owner, repo, issue_number: prNumber, per_page: 100 }),
      this.octokit.pulls.listReviewComments({ owner, repo, pull_number: prNumber, per_page: 100 }),
      this.octokit.pulls.listReviews({ owner, repo, pull_number: prNumber, per_page: 100 }),
      this.octokit.pulls.listCommits({ owner, repo, pull_number: prNumber, per_page: 100 }),
    ]);

    return {
      pr: prDetails.data,
      issueComments: issueComments.data,
      reviewComments: reviewComments.data,
      reviews: reviews.data,
      commits: commits.data,
    };
  }

  /**
   * Fetch user's commits across all repositories using search API
   */
  async fetchUserCommits(username, options = {}) {
    let query = `author:${username}`;

    if (options.since) {
      query += ` committer-date:>=${options.since}`;
    }
    if (options.until) {
      query += ` committer-date:<=${options.until}`;
    }

    const commits = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 1000 commits (10 pages)
      const response = await this.octokit.search.commits({
        q: query,
        per_page: 100,
        page,
        sort: 'committer-date',
        order: 'desc',
      });

      commits.push(...response.data.items);
      hasMore = response.data.items.length === 100;
      page++;
    }

    return commits;
  }

  /**
   * Fetch commit details including stats (additions/deletions)
   */
  async fetchCommitStats(owner, repo, sha) {
    const response = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });
    return response.data;
  }

  /**
   * Fetch user's public events (recent activity)
   */
  async fetchUserEvents(username, options = {}) {
    const events = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 3) { // Events API limited to 300 events
      const response = await this.octokit.activity.listPublicEventsForUser({
        username,
        per_page: 100,
        page,
      });

      events.push(...response.data);
      hasMore = response.data.length === 100;
      page++;
    }

    return events;
  }

  /**
   * Fetch user profile information
   */
  async fetchUserProfile(username) {
    const response = await this.octokit.users.getByUsername({ username });
    return response.data;
  }

  /**
   * Fetch repository contributors with stats
   */
  async fetchRepoContributors(owner, repo) {
    const response = await this.octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    return response.data;
  }

  /**
   * Fetch repository commit activity
   */
  async fetchRepoCommitActivity(owner, repo) {
    const response = await this.octokit.repos.getCommitActivityStats({
      owner,
      repo,
    });
    return response.data;
  }

  /**
   * Fetch contributor stats for a repository
   */
  async fetchContributorStats(owner, repo) {
    const response = await this.octokit.repos.getContributorsStats({
      owner,
      repo,
    });
    return response.data;
  }

  /**
   * Fetch all PRs by a user across repositories using search API
   * Can be scoped to specific orgs/owners
   */
  async fetchUserPRsAcrossRepos(username, options = {}) {
    let query = `author:${username} is:pr`;

    // Filter by organization(s) - can be comma-separated
    if (options.org) {
      const orgs = options.org.split(',').map(o => o.trim());
      const orgQuery = orgs.map(o => `org:${o}`).join(' ');
      query += ` (${orgQuery})`;
    }

    // Filter by specific repo
    if (options.repo) {
      query += ` repo:${options.repo}`;
    }

    if (options.since) {
      query += ` created:>=${options.since}`;
    }
    if (options.until) {
      query += ` created:<=${options.until}`;
    }
    if (options.state === 'merged') {
      query += ` is:merged`;
    } else if (options.state === 'open') {
      query += ` is:open`;
    } else if (options.state === 'closed') {
      query += ` is:closed`;
    }

    const prs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 1000 PRs
      const response = await this.octokit.search.issuesAndPullRequests({
        q: query,
        per_page: 100,
        page,
        sort: 'created',
        order: 'desc',
      });

      prs.push(...response.data.items);
      hasMore = response.data.items.length === 100;
      page++;
    }

    return prs;
  }

  /**
   * Fetch commits for a PR to check for AI co-authorship
   */
  async fetchPRCommits(owner, repo, prNumber) {
    const response = await this.octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    return response.data;
  }

  /**
   * Fetch all issues by a user across repositories using search API
   */
  async fetchUserIssuesAcrossRepos(username, options = {}) {
    let query = `author:${username} is:issue`;

    // Filter by organization(s)
    if (options.org) {
      const orgs = options.org.split(',').map(o => o.trim());
      const orgQuery = orgs.map(o => `org:${o}`).join(' ');
      query += ` (${orgQuery})`;
    }

    if (options.since) {
      query += ` created:>=${options.since}`;
    }
    if (options.until) {
      query += ` created:<=${options.until}`;
    }

    const issues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 1000 issues
      const response = await this.octokit.search.issuesAndPullRequests({
        q: query,
        per_page: 100,
        page,
        sort: 'created',
        order: 'desc',
      });

      issues.push(...response.data.items);
      hasMore = response.data.items.length === 100;
      page++;
    }

    return issues;
  }

  /**
   * Detect AI co-authorship from commit message
   * Returns { isAIAssisted: boolean, aiTools: string[] }
   */
  detectAICoAuthorship(commitMessage) {
    const aiPatterns = [
      { pattern: /co-authored-by:.*claude/i, tool: 'Claude' },
      { pattern: /co-authored-by:.*anthropic/i, tool: 'Claude' },
      { pattern: /co-authored-by:.*copilot/i, tool: 'GitHub Copilot' },
      { pattern: /co-authored-by:.*openai/i, tool: 'OpenAI' },
      { pattern: /co-authored-by:.*chatgpt/i, tool: 'ChatGPT' },
      { pattern: /co-authored-by:.*cursor/i, tool: 'Cursor' },
      { pattern: /\[ai\]|\[ai-generated\]|\[copilot\]|\[claude\]/i, tool: 'AI (tagged)' },
    ];

    const detectedTools = [];
    for (const { pattern, tool } of aiPatterns) {
      if (pattern.test(commitMessage)) {
        if (!detectedTools.includes(tool)) {
          detectedTools.push(tool);
        }
      }
    }

    return {
      isAIAssisted: detectedTools.length > 0,
      aiTools: detectedTools,
    };
  }

  /**
   * Fetch all PRs for a repository
   */
  async fetchRepoPRs(owner, repo, options = {}) {
    const prs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.octokit.pulls.list({
        owner,
        repo,
        state: options.state || 'all',
        per_page: 100,
        page,
      });

      let filteredPRs = response.data;

      if (options.since) {
        const sinceDate = new Date(options.since);
        filteredPRs = filteredPRs.filter(pr => new Date(pr.created_at) >= sinceDate);
      }
      if (options.until) {
        const untilDate = new Date(options.until);
        filteredPRs = filteredPRs.filter(pr => new Date(pr.created_at) <= untilDate);
      }

      prs.push(...filteredPRs);
      hasMore = response.data.length === 100;
      page++;
    }

    return prs;
  }
}
