// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'
import nock from 'nock'

import { setEnv, nockInit, MARKDOWN_HEADING, REPO_ID, PR_NUMBER } from '../utils.mjs'
import { prBodyCheck, ENV_VARS } from '../../src/core.mjs'

describe('Pull request body check', () => {
  let envCache

  beforeEach(() => {
    envCache = process.env
    process.env = {}
    process.env.NODE_ENV = 'test'
    process.env.BUILD_REPOSITORY_ID = REPO_ID
    process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER = PR_NUMBER
  })

  afterEach(() => {
    process.env = envCache
    nock.cleanAll()
  })

  it('should skip if heading hint is not provided', async () => {
    assert(!await prBodyCheck())
  })

  it('should skip if heading hint is invalid', async () => {
    setEnv(ENV_VARS.markdownHeading, '234')
    setEnv(ENV_VARS.markdownOptionIndex, 0)
    nockInit({ 'Option 0': true }, [])
    assert(!await prBodyCheck())
  })

  it('should skip if pr body is illegal', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionIndex, 0)
    nock('https://api.github.com')
      .get(`/repos/${REPO_ID}/pulls/${PR_NUMBER}`)
      .reply(200, { body: '# Test Template\r\n\r\n## INVALID_HEADING\r\n\r\n- [ ] Options 0\r\n' })
    assert(!await prBodyCheck())
  })

  it('should continue if option is selected (index)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionIndex, 1)
    nockInit({ opt0: false, opt1: true }, [])
    assert(await prBodyCheck())
  })

  it('should continue if option is selected (value)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionValue, 'opt1')
    nockInit({ opt0: false, opt1: true }, [])
    assert(await prBodyCheck())
  })

  it('should skip if option is not selected (index)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionIndex, 1)
    nockInit({ opt0: true, opt1: false }, [])
    assert(!await prBodyCheck())
  })

  it('should skip if option is not selected (value)', async () => {
    setEnv(ENV_VARS.markdownHeading, MARKDOWN_HEADING)
    setEnv(ENV_VARS.markdownOptionValue, 'opt0')
    nockInit({ opt0: false, opt1: true }, [])
    assert(!await prBodyCheck())
  })
})
