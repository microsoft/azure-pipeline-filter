// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'node:assert/strict'

import { set_env, nock_init, MARKDOWN_HEADING, REPO_ID, PR_NUMBER } from "../utils.mjs"
import { fileChangeCheck, ENV_VARS } from "../../src/core.mjs"



describe('Changed files check', () => {
  let envCache
  
  beforeEach(() => {
    envCache = process.env
    process.env = {}
    process.env.BUILD_REPOSITORY_ID = REPO_ID
    process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER = PR_NUMBER
  })

  afterEach(() => {
    process.env = envCache
  })

  it('should skip if glob is not provided', async () => {
    assert(!await fileChangeCheck())
  })

  it('should continue if any changed file matches the pattern', async () => {
    set_env(ENV_VARS.fileChangeGlobs, '**/asd.py')
    nock_init({}, ['a.txt', 'a/b/c/d/asd.py', 'b.js'])
    assert(await fileChangeCheck())
  })

  it('should skip if no changed files matches the pattern', async () => {
    set_env(ENV_VARS.fileChangeGlobs, '**/asd.js')
    nock_init({}, ['a.txt', 'a/b/c/d/asd.py', 'b.js'])
    assert(!await fileChangeCheck())
  })
})