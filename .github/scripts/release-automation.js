// Import required packages
const core = require('@actions/core');
const github = require('@actions/github');
const http = require('@actions/http-client');

async function run() {
  try {
    // --- 1. Get Inputs & Context ---
    core.startGroup('Getting inputs and context');
    const {
      JIRA_BASE_URL,
      JIRA_USER_EMAIL,
      JIRA_API_TOKEN,
      JIRA_PROJECT_KEY,
      SLACK_WEBHOOK_URL,
      FULL_COMMIT_MESSAGES,
      COMMIT_SUBJECTS,
    } = process.env;

    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY || !SLACK_WEBHOOK_URL || !FULL_COMMIT_MESSAGES || !COMMIT_SUBJECTS) {
      throw new Error('Missing required environment variables');
    }

    console.log(github.context);

    const releaseTag = github.context.payload.release.tag_name;
    const releaseUrl = github.context.payload.release.html_url;
    
    // Create an authenticated HTTP client for Jira
    const jiraClient = new http.HttpClient('github-actions-jira', [], {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    core.endGroup();

    // --- 2. Extract Data from Commits ---
    core.startGroup('Analyzing commit messages');
    const jiraKeyRegex = /[A-Z]+-[0-9]+/g;
    
    const allJiraKeys = FULL_COMMIT_MESSAGES.match(jiraKeyRegex) || [];
    const uniqueJiraKeys = [...new Set(allJiraKeys)];
    core.info(`Found ${uniqueJiraKeys.length} unique Jira keys: ${uniqueJiraKeys.join(', ')}`);

    const nonCompliantCommits = COMMIT_SUBJECTS.split('\n').filter(subject => subject && !jiraKeyRegex.test(subject));
    core.info(`Found ${nonCompliantCommits.length} non-compliant commits.`);
    core.endGroup();

    // --- 3. JIRA API Interactions (Asynchronous) ---
    core.startGroup('Running Jira Automation');
    if (uniqueJiraKeys.length > 0) {
      // a) Create the Fix Version (must complete first)
      const versionPayload = {
        name: releaseTag,
        project: JIRA_PROJECT_KEY,
        description: `Automated release from GitHub Actions. See: ${releaseUrl}`,
        released: true,
      };
      const versionRes = await jiraClient.post(`${JIRA_BASE_URL}/rest/api/3/version`, JSON.stringify(versionPayload));
      const statusCode = versionRes.message.statusCode;

      if (statusCode === 201) {
        core.info(`Successfully created new Jira version: ${releaseTag}`);
      } else if (statusCode === 400) {
        core.info('Jira version likely already exists. Continuing...');
      } else {
        throw new Error(`Failed to create Jira version. Status: ${statusCode}, Body: ${await versionRes.readBody()}`);
      }

      // b) Update all Jira issues concurrently
      core.info('Updating all Jira issues in parallel...');
      const updatePromises = uniqueJiraKeys.map(key => {
        const updateVersionPromise = jiraClient.put(`${JIRA_BASE_URL}/rest/api/3/issue/${key}`, JSON.stringify({ update: { fixVersions: [{ add: { name: releaseTag } }] } }));
        const addCommentPromise = jiraClient.post(`${JIRA_BASE_URL}/rest/api/3/issue/${key}/comment`, JSON.stringify({ body: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ "type": "text", text: `Released in version *${releaseTag}*.` }]}]}}));
        return Promise.allSettled([updateVersionPromise, addCommentPromise]);
      });
      
      const results = await Promise.all(updatePromises);
      results.forEach((result, index) => {
        const issueKey = uniqueJiraKeys[index];
        const hasFailed = result.some(promise => promise.status === 'rejected');
        if (!hasFailed) {
            core.info(`Successfully updated issue ${issueKey}.`);
        } else {
            core.warning(`Failed to fully update issue ${issueKey}.`);
        }
      });
    } else {
      core.info('No Jira issues found to update. Skipping Jira interactions.');
    }
    core.endGroup();

    // --- 4. SLACK Notification ---
    core.startGroup('Sending Slack Notification');
    const color = nonCompliantCommits.length > 0 ? 'warning' : 'good';
    const updatedTasksText = uniqueJiraKeys.length > 0
      ? uniqueJiraKeys.map(key => `<${JIRA_BASE_URL}/browse/${key}|${key}>`).join(', ')
      : '_No Jira tasks were found in this release._';

    let slackMessage = `*✅ Updated Jira Tasks*\n${updatedTasksText}`;

    if (nonCompliantCommits.length > 0) {
      slackMessage += `\n\n*⚠️ Commits Missing Jira Keys*\n>• ${nonCompliantCommits.join('\n>• ')}\n\n_Please remind the team to prefix commit messages with Jira keys._`;
    }

    const slackPayload = {
      attachments: [{ color, title: `Release ${releaseTag} Deployed`, title_link: releaseUrl, text: slackMessage, footer: "GitHub Release Workflow" }]
    };

    const slackClient = new http.HttpClient('github-actions-slack');
    await slackClient.post(SLACK_WEBHOOK_URL, JSON.stringify(slackPayload));
    core.info('Slack notification sent.');
    core.endGroup();

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();