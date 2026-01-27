#!/usr/bin/env node

/**
 * GitHub Metrics Calculator CLI
 * Production-ready tool for analyzing GitHub contributions and PR metrics
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import { prMetrics } from '../src/commands/pr-metrics.js';
import { userStats } from '../src/commands/user-stats.js';
import { repoStats } from '../src/commands/repo-stats.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('ghmetrics')
  .description('GitHub Metrics Calculator - Analyze PR metrics and user contributions')
  .version('1.0.0');

// PR Metrics Command
program
  .command('pr')
  .description('Analyze PR metrics for a user in a specific repository')
  .requiredOption('-o, --owner <owner>', 'Repository owner (org or user)')
  .requiredOption('-r, --repo <repo>', 'Repository name')
  .requiredOption('-u, --user <username>', 'GitHub username to analyze')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env var)')
  .option('--since <date>', 'Filter PRs created after this date (YYYY-MM-DD)')
  .option('--until <date>', 'Filter PRs created before this date (YYYY-MM-DD)')
  .option('--state <state>', 'PR state: all, open, closed, merged', 'all')
  .option('--export <filename>', 'Export results to JSON file')
  .option('--format <format>', 'Output format: table, json, csv', 'table')
  .action(prMetrics);

// User Stats Command (cross-repo)
program
  .command('user')
  .description('Analyze a user\'s contributions across repositories')
  .requiredOption('-u, --user <username>', 'GitHub username to analyze')
  .option('-o, --org <orgs>', 'Filter by organization(s), comma-separated (e.g., adobe,aemdemos)')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env var)')
  .option('--since <date>', 'Filter contributions after this date (YYYY-MM-DD)')
  .option('--until <date>', 'Filter contributions before this date (YYYY-MM-DD)')
  .option('--top <number>', 'Show top N repositories by contribution', '10')
  .option('--export <filename>', 'Export results to JSON file')
  .option('--format <format>', 'Output format: table, json, csv', 'table')
  .action(userStats);

// Repo Stats Command
program
  .command('repo')
  .description('Analyze overall repository contribution statistics')
  .requiredOption('-o, --owner <owner>', 'Repository owner (org or user)')
  .requiredOption('-r, --repo <repo>', 'Repository name')
  .option('-t, --token <token>', 'GitHub token (or use GITHUB_TOKEN env var)')
  .option('--since <date>', 'Filter contributions after this date (YYYY-MM-DD)')
  .option('--until <date>', 'Filter contributions before this date (YYYY-MM-DD)')
  .option('--top <number>', 'Show top N contributors', '10')
  .option('--export <filename>', 'Export results to JSON file')
  .option('--format <format>', 'Output format: table, json, csv', 'table')
  .action(repoStats);

program.parse();
