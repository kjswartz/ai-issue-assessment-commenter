import { summary } from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";
import type { Label, YamlData } from "./types";

interface GetPromptFileFromLabelsParams {
  issueLabels: Label[];
  labelsToPromptsMapping: string;
}
interface WriteActionSummaryParams {
  promptFile: string;
  aiResponse: string;
  assessmentLabel: string;
}

type GetPromptOptions = (
  promptFile: string,
  promptsDirectory: string,
) => {
  systemMsg: string;
  model: string;
  maxTokens: number;
  endpoint: string;
};

const MAX_TOKENS = 200;
const AI_MODEL = "openai/gpt-4o-mini";
const ENDPOINT = "https://models.github.ai/inference";

export const writeActionSummary = ({
  promptFile,
  aiResponse,
  assessmentLabel,
}: WriteActionSummaryParams) => {
  summary
    .addHeading("Assessment Result")
    .addHeading("Assessment")
    .addCodeBlock(assessmentLabel)
    .addHeading("Prompt File")
    .addCodeBlock(promptFile)
    .addHeading("Details")
    .addCodeBlock(aiResponse)
    .write();
};

export const getAILabelAssessmentValue = (
  promptFile: string,
  aiResponse: string,
): string => {
  const fileName = promptFile.replace(".prompt.yml", "");
  const lines = aiResponse.split("\n");
  const assessmentLine = lines.find((line) => /^###.*Assessment:/.test(line));

  if (assessmentLine) {
    const assessment = assessmentLine.split(":")[1].trim().toLowerCase();
    return assessment
      ? `ai:${fileName}:${assessment}`
      : `ai:${fileName}:unsure`;
  }

  return `ai:${fileName}:unsure`;
};

export const getPromptFilesFromLabels = ({
  issueLabels,
  labelsToPromptsMapping,
}: GetPromptFileFromLabelsParams): string[] => {
  const promptFiles = [];
  const labelsToPromptsMappingArr = labelsToPromptsMapping.split("|");
  for (const labelPromptMapping of labelsToPromptsMappingArr) {
    const labelPromptArr = labelPromptMapping.split(",").map((s) => s.trim());
    const labelMatch = issueLabels.some(
      (label) => label?.name == labelPromptArr[0],
    );
    if (labelMatch) {
      promptFiles.push(labelPromptArr[1]);
    }
  }

  return promptFiles;
};

export const getPromptOptions: GetPromptOptions = (
  promptFile,
  promptsDirectory,
) => {
  const fileContents = fs.readFileSync(
    path.resolve(process.cwd(), promptsDirectory, promptFile),
    "utf-8",
  );
  if (!fileContents) {
    throw new Error(`System prompt file not found: ${promptFile}`);
  }
  // Parse the YAML content
  try {
    const yamlData = yaml.load(fileContents) as YamlData;
    if (!yamlData || !Array.isArray(yamlData?.messages)) {
      throw new Error("Invalid YAML format in the prompt file");
    }
    // Find the system message
    const systemMsg = yamlData.messages.find(
      (msg: { role: string }) => msg.role === "system",
    );
    if (!systemMsg || !systemMsg.content) {
      throw new Error("System message not found in the prompt file");
    }
    // Return the content of the system message
    return {
      systemMsg: systemMsg.content,
      model: yamlData?.model || AI_MODEL,
      maxTokens: yamlData?.modelParameters?.max_tokens || MAX_TOKENS,
      endpoint: ENDPOINT,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error("Unable to parse system prompt file: " + error.message);
    } else {
      throw new Error("Unable to parse system prompt file");
    }
  }
};
