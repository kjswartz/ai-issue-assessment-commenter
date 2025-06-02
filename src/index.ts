import { context, getOctokit } from "@actions/github";
import { getInput } from "@actions/core";
import { run } from "./ai";
import {
  getPromptFileFromLabels,
  getAILabelAssessmentValue,
  writeActionSummary,
  getPromptOptions,
} from "./utils";
import { createIssueComment, addIssueLabels, removeIssueLabel } from "./api";
import type { Label } from "./types";

const main = async () => {
  // Required inputs
  const token = getInput("token") || process.env.GITHUB_TOKEN;
  const owner = getInput("owner") || context?.repo?.owner;
  const repo = getInput("repo_name") || context?.repo?.repo;

  const issueNumber = getInput("issue_number")
    ? parseInt(getInput("issue_number"), 10)
    : context?.payload?.issue?.number;
  const issueBody = getInput("issue_body");

  const promptsDirectory = getInput("prompts_directory");
  const aiReviewLabel = getInput("ai_review_label");
  const labelsToPromptsMapping = getInput("labels_to_prompts_mapping");

  if (
    !token ||
    !owner ||
    !repo ||
    !issueNumber ||
    !issueBody ||
    !promptsDirectory ||
    !aiReviewLabel ||
    !labelsToPromptsMapping
  ) {
    throw new Error("Required inputs are not set");
  }

  const octokit = getOctokit(token);

  // AI configuration
  const endpoint = getInput("endpoint");
  const modelName = getInput("model");
  const maxTokens = getInput("max_tokens")
    ? parseInt(getInput("max_tokens"), 10)
    : undefined;

  const issueLabels: Label[] = context?.payload?.issue?.labels ?? [];

  // Get Prompt file based on issue labels and mapping
  const promptFile = getPromptFileFromLabels({
    issueLabels,
    aiReviewLabel,
    labelsToPromptsMapping,
  });

  if (!promptFile) {
    console.log("No prompt file found.");
    return;
  }

  const promptOptions = getPromptOptions(promptFile, promptsDirectory);

  console.log("Executing AI assessment...");
  const aiResponse = await run({
    token,
    content: issueBody,
    systemPromptMsg: promptOptions.systemMsg,
    endpoint: endpoint || promptOptions.endpoint,
    maxTokens: maxTokens || promptOptions.maxTokens,
    modelName: modelName || promptOptions.model,
  });
  if (aiResponse) {
    const commentCreated = await createIssueComment({
      octokit,
      owner,
      repo,
      issueNumber,
      body: aiResponse,
    });
    if (!commentCreated) {
      throw new Error("Failed to create comment");
    }

    // Add the assessment label to the issue
    const assessmentLabel = getAILabelAssessmentValue(aiResponse);
    await addIssueLabels({
      octokit,
      owner,
      repo,
      issueNumber,
      labels: [assessmentLabel],
    });

    // Remove the aiReviewLabel trigger label
    await removeIssueLabel({
      octokit,
      owner,
      repo,
      issueNumber,
      label: aiReviewLabel,
    });

    writeActionSummary({
      promptFile,
      aiResponse,
      assessmentLabel,
    });
  } else {
    console.log("No response received from AI.");
  }
};

if (process.env.NODE_ENV !== "test") {
  main();
}
