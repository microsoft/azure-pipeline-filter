// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'

import { isTriggeredByGithubPR } from '../../src/core.mjs'

describe('Trigger check', () => {
  let envCache

  beforeEach(() => {
    envCache = process.env
    process.env = {}
  })

  afterEach(() => {
    process.env = envCache
  })

  it('should return false if repo privder is not github', async () => {
    process.env.BUILD_REPOSITORY_PROVIDER = 'Git'
    process.env.BUILD_REASON = 'PullRequest'
    assert(!isTriggeredByGithubPR())
  })

  it('should return false if trigger reason is not pull request', async () => {
    process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub'
    process.env.BUILD_REASON = 'Manual'
    assert(!isTriggeredByGithubPR())
  })

  it('should return true if trigger reason is pull request', async () => {
    process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub'
    process.env.BUILD_REASON = 'PullRequest'
    assert(isTriggeredByGithubPR())
  })
})
