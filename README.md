# ai-issue-assessment-commenter

### Development
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

To run tests:

```bash
bun test
```

To build:

```bash
bun run build
```

### Description
This action is responsible for providing an Azure AI comment on issues based on their labels. You assign a `ai_review_label` trigger label in the workflow action file, and a string mapping of labels to prompt files separated by `|`. Format: `label1,prompt1.prompt.yml|label2,prompt2.prompt.yml`. The issue's labels determine which prompt file is used for the AI configuration options (model name, max tokens and system prompt). 

Example `.prompt.yml` file:
```yaml
messages:
  - role: system
    content: >+
      You are a world-class product manager that will help decide whether a particular bug report is completely filled out and able to start being worked on by a team member.
      1. Given a bug report analyze it for the following key elements: a clear description of the problem, steps to reproduce, expected versus actual behavior, and any relevant visual proof. 
      2. Rate each element provided in the report as `complete`, `incomplete`, or `unable to determine` except for Screenshots if included. Justify the rating by explaining what is missing or unclear in each element.
      3. The title of the response should be based on the overall completeness rating of all the provided elements. For example: "### AI Assessment: Ready for Review" if complete, "### AI Assessment: Missing Details" if incomplete, or "### AI Assessment: Unsure" if unable to determine.
      4. When determining the overall completeness rating do not include the Screenshots or relevant visual proof section. This section is more of a "nice to have" versus "hard requirement" and it should be ignored. 
  - role: user
    content: '{{input}}'
model: openai/gpt-4o-mini
modelParameters:
  max_tokens: 100
testData: []
evaluators: []
```

An assessment value will be attempted to be extracted from the AI response by trying to find a line matching `/^###.*Assessment:/` (i.e. `### AI Assessment` or `### Alignment Assessment`). If no value is found, then the value `unsure` will be used. The assessment is then downcased and prefixed with `ai:` and added as a label to the issue (i.e. `ai:aligned`, `ai:neutral`, `ai:not aligned`, `ai:ready for review`, `ai:missing details`, `ai:unsure`). The assessment values largely depend on the instructions in the system prompt section. Finally this action will remove the `ai_review_label` trigger label. If you want a new review you can edit your issue body and then re-add the `ai_review_label` trigger label.

### Inputs

Various inputs are defined in [action.yml](action.yml) to let you configure
the action:

| Name                 | Description                                                                                                                                       | Default                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `token`              | Token to use for inference. Typically the GITHUB_TOKEN secret                                                                                     | `github.token`                       |
| `ai_review_label`             | The label applied to the issue to trigger AI review                                                                                                                   | N/A                                  |
| `prompts_directory`        | The path to the directory where the `.prompt.yml` files are located                             | N/A                                 |
| `labels_to_prompts_mapping`      | A mapping of labels to prompt files, separated by `\|`. Format: `label1,prompt1.prompt.yml\|label2,prompt2.prompt.yml`                                                                                                            | N/A      |
| `model`              | The model to use for inference. Must be available in the [GitHub Models](https://github.com/marketplace?type=models) catalog. Format: `{publisher}/{model_name}`                      | `openai/gpt-4o-mini`                             |
| `endpoint`           | The endpoint to use for inference. If you're running this as part of an org, you should probably use the org-specific Models endpoint             | `https://models.github.ai/inference` |
| `max_tokens`         | The max number of tokens to generate                                                                                                              | 200                                  |

### Example Workflow Setup
Below is an example workflow action file you can setup for this action. This setup would trigger everytime an issue had a label assigned to it. You can configure your issue templates to assign default labels on creation that then map to specific `.prompt.yml` files you have saved in your repository. So when users open a `bug` issue that is created with the labels `bug` and `request ai review`. In the example below  `ai_review_label` is set to `request ai review`, which means every time `request ai review` label is added to an issue this action will run. Since we are mapping `bug` to `bug-review.prompt.yml` in the `labels_to_prompts_mapping` field, this action will use the `bug-review.prompt.yml` file to pull the `system prompt` to use and the `model` and `max_tokens` options. If you want to override the `model` and `max_token` options that are in your `.prompt.yml` file you can pass those into the workflow action below as `model` and `max_tokens` variables.

```yaml
name: Action Assessment of Request
on:
  issues:
    types:
      - labeled
jobs:
  assess:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      models: read
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js environment
        uses: actions/setup-node@v4

      - name: Run AI assessment for issue labeled
        if: github.event.label.name == 'request ai review' # This is optional to prevent the action from running on every label added event. Assessment will only happen when event == ai_review_label.
        id: ai-assessment-issue-labeled
        uses: kjswartz/ai-issue-assessment-commenter@main # main, tag, or commit sha
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          ai_review_label: 'request ai review'
          prompts_directory: './Prompts' # Path to the directory from root of repository to where your prompt files are saved.
          labels_to_prompts_mapping: 'bug,bug-review.prompt.yml|support request,request-intake.prompt.yml' # The labels map to the prompt file to use for assessment. If multiple label mappings present on the issue, then the first mapping found will be utilized.

```