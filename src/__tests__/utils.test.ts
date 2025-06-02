import { describe, it, expect } from "bun:test";
import {
  getPromptOptions,
  getAILabelAssessmentValue,
  getPromptFileFromLabels,
} from "../utils";

describe("getPromptOptions", () => {
  it("should return the system content field from test-intake.yml", () => {
    const requestIntakePrompt =
      'You are a world-class product manager that will help decide whether a particular Request is in alignment with the Team charter.\n1. Review the request that is given to you.\n2. Use the Team charter to give feedback on how aligned it is.\n3. Determine whether or not the request is `aligned`, `not-aligned`, or `neutral` based on the alignment with each of the following four strategic trade-offs:\n    - **Scalable > bespoke**: Scalable, customizable solutions **over** individual or team-specific solutions.\n    - **GitHub + AI > scratch-built tools**: Build with GitHub (and improve GitHub if that doesn\'t work) and AI **over** building from scratch and by hand.  \n    - **Bold > safe**: Try something new and ambitious (including unproven technologies) **over** doing what everyone else is doing.\n    - **Ship to learn > plan to plan**: Fast experimentation and research **over** long-term, large programs - as in “ship to learn” a core GitHub value.\n4. The title of the response should be based on the overall alignment of all the strategic trade-offs. For example: "### Alignment Assessment: Aligned", "### Alignment Assessment: Neutral", or "### Alignment Assessment: Not-aligned"\n5. Give feedback on how the request might be more in alignment with the charter.\n\nCharter: Our mission is to reduce inefficiencies, eliminate repetitive toil, and enable higher velocity. We will empower teams with smarter processes and tools by building innovative automation solutions. By thinking big and experimenting ambitiously with cutting-edge technologies, we’re here to make your work easier, faster, and more impactful in ways that differentiate us from broader Core Ops initiatives.\n\n';
    expect(
      getPromptOptions("test-intake.yml", "./src/__tests__/test_prompts"),
    ).toEqual({
      systemMsg: requestIntakePrompt,
      model: "openai/gpt-4o-mini",
      maxTokens: 100,
      endpoint: "https://models.github.ai/inference",
    });
  });

  it("should return the system content field from test-bug.yml", () => {
    const bugIntakePrompt =
      'You are a world-class product manager that will help decide whether a particular bug report is completely filled out and able to start being worked on by a team member. 1. Given a bug report analyze it for the following key elements: a clear description of the problem, steps to reproduce, expected versus actual behavior, and any relevant visual proof.  2. Rate each element provided in the report as `complete`, `incomplete`, or `unable to determine` except for Screenshots if included. Justify the rating by explaining what is missing or unclear in each element. 3. The title of the response should be based on the overall completeness rating of all the provided elements. For example: "### AI Assessment: Ready for Review" if complete, "### AI Assessment: Missing Details" if incomplete, or "### AI Assessment: Unsure" if unable to determine. 4. When determining the overall completeness rating do not include the Screenshots or relevant visual proof section. This section is more of a "nice to have" versus "hard requirement" and it should be ignored. \n';
    expect(
      getPromptOptions("test-bug.yml", "./src/__tests__/test_prompts"),
    ).toEqual({
      systemMsg: bugIntakePrompt,
      model: "openai/gpt-4o-mini",
      maxTokens: 100,
      endpoint: "https://models.github.ai/inference",
    });
  });
});

describe("getAILabelAssessmentValue", () => {
  it("should return 'ai:aligned' for aligned assessment", () => {
    const aiResponse =
      "### Alignment Assessment: Aligned\nThe request is fully aligned with the team charter.";
    expect(getAILabelAssessmentValue(aiResponse)).toEqual("ai:aligned");
  });

  it("should return 'ai:not aligned' for not aligned assessment", () => {
    const aiResponse =
      "### Alignment Assessment: Not Aligned\nThe request does not align with the team charter.";
    expect(getAILabelAssessmentValue(aiResponse)).toEqual("ai:not aligned");
  });

  it("should return 'ai:unsure' if no assessment present", () => {
    const aiResponse =
      "### AI Assessment:\nThe request lacks sufficient information.";
    expect(getAILabelAssessmentValue(aiResponse)).toEqual("ai:unsure");
  });
});

describe("getPromptFileFromLabels", () => {
  it("should return the request-intake.prompt.yml file for the suport request label", () => {
    const issueLabels = [
      { name: "request ai review" },
      { name: "support request" },
    ];
    const aiReviewLabel = "request ai review";
    const labelsToPromptsMapping =
      "support request,request-intake.prompt.yml|bug,bug-review.prompt.yml";

    expect(
      getPromptFileFromLabels({
        issueLabels,
        aiReviewLabel,
        labelsToPromptsMapping,
      }),
    ).toEqual("request-intake.prompt.yml");
  });

  it("should return the bug-review.prompt.yml file for the bug label", () => {
    const issueLabels = [{ name: "request ai review" }, { name: "bug" }];
    const aiReviewLabel = "request ai review";
    const labelsToPromptsMapping =
      "support request,request-intake.prompt.yml|bug,bug-review.prompt.yml";

    expect(
      getPromptFileFromLabels({
        issueLabels,
        aiReviewLabel,
        labelsToPromptsMapping,
      }),
    ).toEqual("bug-review.prompt.yml");
  });

  it("should return the file for the first label matched to the mapping", () => {
    const issueLabels = [
      { name: "request ai review" },
      { name: "bug" },
      { name: "support request" },
    ];
    const aiReviewLabel = "request ai review";
    const labelsToPromptsMapping =
      "support request,request-intake.prompt.yml|bug,bug-review.prompt.yml";

    expect(
      getPromptFileFromLabels({
        issueLabels,
        aiReviewLabel,
        labelsToPromptsMapping,
      }),
    ).toEqual("request-intake.prompt.yml");
  });

  it("should return null if aiReviewLabel not in issueLabels", () => {
    const issueLabels = [{ name: "bug" }];
    const aiReviewLabel = "request ai review";
    const labelsToPromptsMapping =
      "support request,request-intake.prompt.yml|bug,bug-review.prompt.yml";

    expect(
      getPromptFileFromLabels({
        issueLabels,
        aiReviewLabel,
        labelsToPromptsMapping,
      }),
    ).toBeNull();
  });
});
