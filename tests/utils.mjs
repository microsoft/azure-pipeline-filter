// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import nock from 'nock'

const REPO_ID = 'microsoft/azure-pipeline-filter'
const PR_NUMBER = 3
const MARKDOWN_HEADING = '#### Test Options'

const setEnv = (key, val) => {
  key = key.replaceAll('.', '_').toUpperCase()
  process.env[key] = val
}

const nockInit = (options, changedFiles) => {
  options = options || {}

  let textOptions = Object.entries(options).map(([key, val]) => `- [${val ? 'x' : ' '}] ${key}\r\n`)
  textOptions = textOptions.join('')
  nock('https://api.github.com')
    .get(`/repos/${REPO_ID}/pulls/${PR_NUMBER}`)
    .reply(200, { body: `# Test Template\r\n\r\n${MARKDOWN_HEADING}\r\n\r\n${textOptions}`, changed_files: changedFiles.length })

  for (let offset = 0, i = 1; offset < changedFiles.length; offset += 100, i += 1) {
    nock('https://api.github.com')
      .get(`/repos/${REPO_ID}/pulls/${PR_NUMBER}/files`)
      .query({ per_page: 100, page: i })
      .reply(200, changedFiles.slice(offset, offset + 100).map(x => ({ filename: x })))
  }
}

export { setEnv, nockInit, REPO_ID, PR_NUMBER, MARKDOWN_HEADING }
