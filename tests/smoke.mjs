// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'
import nock from 'nock'
import { stdout } from 'test-console'

import { main, ENV_VARS } from '../src/core.mjs'
import { setEnv, nockInit, REPO_ID, PR_NUMBER, MARKDOWN_HEADING } from './utils.mjs'

const parseOutput = (outputLines) => {
  for (const line of outputLines) {
    console.log(line.trimEnd())
  }
  const vsoLine = outputLines.find(x => x.startsWith('##vso'))
  assert(vsoLine)
  const matchResult = /##vso\[.*?\](.*?)$/.exec(vsoLine.trim())
  assert(matchResult.length === 2)
  assert(matchResult[1] === 'true' || matchResult[1] === 'false')
  return matchResult[1] === 'true'
}

describe('Smoke test', () => {
  let envCache
  beforeEach(() => {
    envCache = process.env
    process.env = {}
    process.env.NODE_ENV = 'test'
    process.env.BUILD_REPOSITORY_ID = REPO_ID
    process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER = PR_NUMBER
    process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub'
    process.env.BUILD_REASON = 'PullRequest'
  })

  afterEach(() => {
    process.env = envCache
    nock.cleanAll()
  })

  it('changed files (continue)', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, 'a/**/x.py')
    nockInit({ opt0: false, opt1: false }, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parseOutput(inspect.output)
    // skip == false
    assert(!res)
  })

  it('changed files (skip)', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, 'a/**/x.py')
    nockInit({ opt0: false, opt1: false }, ['b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parseOutput(inspect.output)
    // skip == true
    assert(res)
  })

  it('pull request body (selected)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionValue, 'opt1')
    nockInit({ opt0: false, opt1: true }, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parseOutput(inspect.output)
    // skip == false
    assert(!res)
  })

  it('pull request body (not selected)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionValue, 'opt1')
    nockInit({ opt0: false, opt1: false }, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parseOutput(inspect.output)
    // skip == true
    assert(res)
  })
})
