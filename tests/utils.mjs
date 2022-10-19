// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import nock from 'nock'

const REPO_ID = 'microsoft/azure-pipeline-filter'
const PR_NUMBER = 3
const MARKDOWN_HEADING = '#### Test Options'

const set_env = (key, val) => {
  key = key.replaceAll('.', '_').toUpperCase()
  process.env[key] = val
}

const nock_init = (options, changed_files) => {
  options = options || {}

  let text_options = Object.entries(options).map(([key, val]) => `- [${val ? 'x' : ' '}] ${key}\r\n`)
  text_options = text_options.join('')
  nock('https://api.github.com')
    .get(`/repos/${REPO_ID}/pulls/${PR_NUMBER}`)
    .reply(200, {body: `# Test Template\r\n\r\n${MARKDOWN_HEADING}\r\n\r\n${text_options}`})

  changed_files = changed_files || []

  nock('https://api.github.com')
    .get(`/repos/${REPO_ID}/pulls/${PR_NUMBER}/files`)
    .reply(200, changed_files.map(x => ({ filename: x })))
}

export { set_env, nock_init, REPO_ID, PR_NUMBER, MARKDOWN_HEADING }
