// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'
import nock from 'nock'
import { stdout } from 'test-console'

import { main, ENV_VARS } from "../src/core.mjs"
import { set_env, nock_init, REPO_ID, PR_NUMBER, MARKDOWN_HEADING } from "./utils.mjs"

const parse_output = (output_list) => {
  for (const line of output_list) {
    console.log(line.trimEnd())
  }
  const vso_output_str = output_list.find(x=>x.startsWith('##vso'))
  assert(vso_output_str)
  const match_res = /##vso\[.*?\](.*?)$/.exec(vso_output_str.trim())
  assert(match_res.length === 2)
  assert(match_res[1] === 'true' || match_res[1] === 'false')
  return match_res[1] === 'true'
}

describe('Smoke test', () => {
  let envCache
  beforeEach(() => {
    envCache = process.env
    process.env = {}
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
    set_env(ENV_VARS.fileChangeGlobs, 'a/**/x.py')
    nock_init({opt0: false, opt1: false}, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parse_output(inspect.output)
    // skip == false
    assert(!res)
  })

  it('changed files (skip)', async () => {
    set_env(ENV_VARS.fileChangeGlobs, 'a/**/x.py')
    nock_init({opt0: false, opt1: false}, ['b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parse_output(inspect.output)
    // skip == true
    assert(res)
  })

  it('pull request body (selected)', async () => {
    set_env(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    set_env(ENV_VARS.markdownOptionValue, 'opt1')
    nock_init({opt0: false, opt1: true}, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parse_output(inspect.output)
    // skip == false
    assert(!res)

  })

  it('pull request body (not selected)', async () => {
    set_env(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    set_env(ENV_VARS.markdownOptionValue, 'opt1')
    nock_init({opt0: false, opt1: false}, ['a/b/c/d/x.py'])
    const inspect = stdout.inspect()
    await main()
    inspect.restore()
    const res = parse_output(inspect.output)
    // skip == true
    assert(res)
  })
})