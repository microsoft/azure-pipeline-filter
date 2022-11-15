# Azure Pipeline Filter

Tools for conditional azure pipeline execution. Currently only supports run triggerd by github pull request.

## Usage

The script `src/cli.mjs` (could be invoked with npx) will check if current pipeline run passes following checks and the output pipeline variable `skipsubsequent` will be set to True or False according to checks' results.

The script should be put in a seperated job / stage and following jobs / stages could use the output variable to judge if it should be skipped.

```yaml
stages:
- stage: Filter
  jobs:
  - job: Check
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '16.x'
    - script: npm install npm@latest -g
      displayName: Update npm to use npx with github url
    - script: npx github:microsoft/azure-pipeline-filter
      env:
        FILTER_GITHUBPAT: $(filter.githubPAT)
      name: execution
      displayName: Execution
- stage: Main
  dependsOn: Check
  # dependencies.$(StageName).outputs['$(JobName).$(TaskName).$(VariableName)']
  condition: and(succeeded(), ne(dependencies.Filter.outputs['Check.execution.skipsubsequent'], 'true'))
  jobs:
  - job: Main
    steps:
    - script: echo end
      displayName: 'Run main test'
```

## Checks

### Basic Check

If pipeline run is not triggered by github pull request, `skipsubsequent` will be set to **False**, and the script will exit.

Otherwise, run following checks.

### Modified Files Check

Check if any modified files matches the glob patterns provided by pipeline variable `filter.modified.globs`.

*Due to github rest api's limitation, `skipsubsequent` will be set to **False** when changed file count > 3000*

If true, `skipsubsequent` will be set to **False**, and the script will exit.

Otherwise, run following checks.

### Pull Request Body Check

The script will try to find the task list under the heading provided by pipeline variable `filter.prbody.heading` from the pull request markdown body.

If the task list is not found, `skipsubsequent` will be set to **True**.

If **ANY** selected options match provided index (`filter.prbody.optionIndex`) / value (`filter.prbody.optionValue`), `skipsubsequent` will be set to **False**.

Otherwise, `skipsubsequent` will be set to **True**.

## Pipeline Variables

### `filter.githubPAT`

Github personal access token used to access the pull request info. Could be ignored if the repo is public.

It should be a secret variable and need to be exposed to the script explicitly.

```yaml
- script: node src/main.mjs
  env:
    FILTER_GITHUBPAT: $(filter.githubPAT)
```

### [PR body check] `filter.prbody.heading`

Heading used by pull request body check to locate the task list.

### [PR body check] `filter.prbody.optionIndex` / `filter.prbody.optionValue`

Option index (start from 0) / value to be compared with selected options in the located task list.

### [File Changes Check] `filter.modified.globs`

Comma seperated glob patterns. See [multimatch](https://github.com/sindresorhus/multimatch#globbing-patterns)'s doc for more information.

### [Output] `skipsubsequent`

Output variable. If following tests need to be skipped, it will be set to true.

Please refer to [azure pipeline's doc](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/conditions?view=azure-devops&tabs=yaml) for more information.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
