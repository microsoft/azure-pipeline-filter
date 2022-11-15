// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'
import nock from 'nock'

import { setEnv, nockInit, REPO_ID, PR_NUMBER } from '../utils.mjs'
import { fileChangeCheck, ENV_VARS } from '../../src/core.mjs'

describe('Changed files check', () => {
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

  it('should skip if glob is not provided', async () => {
    assert(!await fileChangeCheck())
  })

  it('should continue if any changed file matches the pattern', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, '**/asd.py')
    nockInit({}, ['a.txt', 'a/b/c/d/asd.py', 'b.js'])
    assert(await fileChangeCheck())
  })

  it('should skip if no changed files matches the pattern', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, '**/asd.js')
    nockInit({}, ['a.txt', 'a/b/c/d/asd.py', 'b.js'])
    assert(!await fileChangeCheck())
  })

  it('should continue if any changed file matches the pattern (multiple pages)', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, '**/asd.js')
    const list = []
    for (let i = 0; i < 301; i++) {
      list.push(`${i}.txt`)
    }
    list.push('a/b/c/d/asd.js')
    for (let i = 0; i < 301; i++) {
      list.push(`${i}.txt`)
    }
    nockInit({}, list)
    assert(await fileChangeCheck())
  })

  it('should skip if no changed files matches the pattern (multiple pages)', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, '**/asd.js')
    const list = []
    for (let i = 0; i < 301; i++) {
      list.push(`${i}.txt`)
    }
    nockInit({}, list)
    assert(!await fileChangeCheck())
  })

  it('should continue if changed files > 3000', async () => {
    setEnv(ENV_VARS.fileChangeGlobs, '**/asd.js')
    const list = []
    for (let i = 0; i < 3001; i++) {
      list.push(`${i}.txt`)
    }
    nockInit({}, list)
    assert(await fileChangeCheck())
  })
})
