import { context, getOctokit } from "@actions/github";
import { getInput } from "@actions/core";
import { run } from "./ai";
import {
  getPromptFilesFromLabels,
  getAILabelAssessmentValue,
  writeActionSummary,
  getPromptOptions,
} from "./utils";
import {
  getIssueLabels,
  createIssueComment,
  addIssueLabels,
  removeIssueLabel,
} from "./api";
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

  const regexPattern = getInput("assessment_regex_pattern");
  const regexFlags = getInput("assessment_regex_flags");
  let aiAssessmentRegex;
  try {
    aiAssessmentRegex = new RegExp(regexPattern, regexFlags);
  } catch (error) {
    throw new Error(
      `Invalid regex pattern or flags provided: pattern="${regexPattern}", flags="${regexFlags}". Error: ${error}`,
    );
  }

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

  // Get Labels from the issue
  let issueLabels: Label[] = context?.payload?.issue?.labels ?? [];
  if (!issueLabels || issueLabels.length === 0) {
    const labels = await getIssueLabels({
      octokit,
      owner,
      repo,
      issueNumber,
    });
    if (labels) {
      issueLabels = labels.map((name) => ({ name })) as Label[];
    } else {
      console.log("No labels found on the issue.");
      return;
    }
  }

  // Check if the issue requires AI review based on the aiReviewLabel
  const requireAiReview = issueLabels.some(
    (label) => label?.name == aiReviewLabel,
  );
  if (!requireAiReview) {
    console.log(
      `No AI review required. Issue does not have label: ${aiReviewLabel}`,
    );
    return;
  }

  // Remove the aiReviewLabel trigger label
  console.log(`Removing label: ${aiReviewLabel}`);
  await removeIssueLabel({
    octokit,
    owner,
    repo,
    issueNumber,
    label: aiReviewLabel,
  });

  // Get Prompt file based on issue labels and mapping
  const promptFiles = getPromptFilesFromLabels({
    issueLabels,
    labelsToPromptsMapping,
  });

  if (promptFiles.length === 0) {
    console.log("No prompt files found.");
    return;
  }

  const labelsToAdd: string[] = [];
  for (const promptFile of promptFiles) {
    console.log(`Using prompt file: ${promptFile}`);
    const promptOptions = getPromptOptions(promptFile, promptsDirectory);

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
      const assessmentLabel = getAILabelAssessmentValue(
        promptFile,
        aiResponse,
        aiAssessmentRegex,
      );
      labelsToAdd.push(assessmentLabel);

      writeActionSummary({
        promptFile,
        aiResponse,
        assessmentLabel,
      });
    } else {
      console.log("No response received from AI.");
    }
  }

  if (labelsToAdd.length > 0) {
    console.log(`Adding labels: ${labelsToAdd.join(", ")}`);
    await addIssueLabels({
      octokit,
      owner,
      repo,
      issueNumber,
      labels: labelsToAdd,
    });
  } else {
    console.log("No labels to add found.");
  }
};

if (process.env.NODE_ENV !== "test") {
  main();
}
