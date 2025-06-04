import { GitHub } from "@actions/github/lib/utils";
interface CreateCommentParams {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}

type CreateComment = (params: CreateCommentParams) => Promise<boolean>;

interface AddLabelsParams {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}

type AddLabels = (params: AddLabelsParams) => Promise<void>;

interface RemoveLabelParams {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  label: string;
}

type RemoveLabel = (params: RemoveLabelParams) => Promise<void>;

interface GetLabelsParams {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
}

type GetLabels = (params: GetLabelsParams) => Promise<string[] | undefined>;

export const createIssueComment: CreateComment = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  body,
}) => {
  try {
    const response = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
    if (response.status === 201) {
      console.log("Comment created successfully:", response.data.html_url);
      return true;
    } else {
      console.error("Failed to create comment:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error creating issue comment:", error);
    return false;
  }
};

export const getIssueLabels: GetLabels = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
}) => {
  try {
    const response = await octokit.rest.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number,
    });
    return response.data.map((label) => label.name);
  } catch (error) {
    console.error("Error listing labels on issue:", error);
  }
};

export const addIssueLabels: AddLabels = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  labels,
}) => {
  try {
    await octokit.rest.issues.addLabels({ owner, repo, issue_number, labels });
  } catch (error) {
    console.error("Error adding labels to issue:", error);
  }
};

export const removeIssueLabel: RemoveLabel = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  label,
}) => {
  try {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number,
      name: label,
    });
    console.log(`Label "${label}" removed from issue #${issue_number}`);
  } catch (error) {
    console.error("Error removing labels from issue:", error);
  }
};
