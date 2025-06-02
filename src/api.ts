import { GitHub } from "@actions/github/lib/utils";
interface CreateComment {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}

interface AddLabels {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  labels: string[];
}

interface RemoveLabel {
  octokit: InstanceType<typeof GitHub>;
  owner: string;
  repo: string;
  issueNumber: number;
  label: string;
}

export const createIssueComment = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  body,
}: CreateComment): Promise<boolean> => {
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

export const addIssueLabels = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  labels,
}: AddLabels) => {
  try {
    await octokit.rest.issues.addLabels({ owner, repo, issue_number, labels });
  } catch (error) {
    console.error("Error adding labels to issue:", error);
  }
};

export const removeIssueLabel = async ({
  octokit,
  owner,
  repo,
  issueNumber: issue_number,
  label,
}: RemoveLabel) => {
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
