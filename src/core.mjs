// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import got from 'got'
import multimatch from 'multimatch'

import { parsePullRequstBody } from './parsePullRequestBody.mjs'

const SKIP_VARIABLE = 'skipsubsequent'
const DEFAULT_PAT_SECRET_VALUE = '$(filter.githubPAT)'

const ENV_VARS = {
  githubPAT: 'filter.githubPAT',
  markdownHeading: 'filter.prbody.heading',
  markdownOptionIndex: 'filter.prbody.optionIndex',
  markdownOptionValue: 'filter.prbody.optionValue',
  fileChangeGlobs: 'filter.modified.globs'
}

const getPipelineVar = (pipelineVar) => {
  const key = pipelineVar.replaceAll('.', '_').toUpperCase()
  return process.env[key]
}

let prInfoCache = null
const getGithubPullRequestInfo = async () => {
  if (prInfoCache != null && process.env.NODE_ENV !== 'test') {
    return prInfoCache
  }
  const repoId = process.env.BUILD_REPOSITORY_ID
  const prNumber = process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER
  const prUrl = `https://api.github.com/repos/${repoId}/pulls/${prNumber}`
  prInfoCache = await _requestGithub(prUrl)
  return prInfoCache
}

const getGithubPullRequestChanges = async (numFiles) => {
  const repoId = process.env.BUILD_REPOSITORY_ID
  const prNumber = process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER

  const pages = Math.ceil(numFiles / 100)
  const results = []
  // page starts from 1
  for (let page = 1; page <= pages; page += 1) {
    const fileUrl = `https://api.github.com/repos/${repoId}/pulls/${prNumber}/files?per_page=100&page=${page}`
    const response = await _requestGithub(fileUrl)
    results.push(...response)
  }
  return results
}

const _requestGithub = async (url) => {
  const githubPAT = getPipelineVar(ENV_VARS.githubPAT)
  const opt = {}
  if (typeof (githubPAT) === 'string' && githubPAT.length > 0 && githubPAT.toLowerCase() !== DEFAULT_PAT_SECRET_VALUE.toLowerCase()) {
    const auth = Buffer.from(`:${githubPAT}`).toString('base64')
    opt.headers = {
      Authorization: `Basic ${auth}`
    }
  }
  try {
    const resp = await got(url, opt).json()
    return resp
  } catch (e) {
    throw new Error(`HTTP Error when get ${url}`)
  }
}

const isTriggeredByGithubPR = () => {
  console.log('[Basic Check]')
  const repoProvider = process.env.BUILD_REPOSITORY_PROVIDER
  console.log('Repo Provider:', repoProvider)
  if (repoProvider !== 'GitHub') {
    console.log(`Invalid repo provider ${repoProvider}, run following tests.`)
    return false
  }

  const buildReason = process.env.BUILD_REASON
  console.log('Build Reason:', buildReason)
  if (buildReason !== 'PullRequest') {
    console.log('Not triggered by pull request, run following tests.')
    return false
  }

  return true
}

const prBodyCheck = async () => {
  console.log('[Pull Request Body]')
  const markdownHeading = getPipelineVar(ENV_VARS.markdownHeading)
  console.log('Hint Heading:', markdownHeading)
  if (typeof (markdownHeading) !== 'string' || markdownHeading.length === 0) {
    console.log('Hint heading not provided, skip')
    return false
  }
  let selectedOptions = []
  const prInfo = await getGithubPullRequestInfo()
  const prBody = prInfo.body || ''
  try {
    selectedOptions = parsePullRequstBody(prBody, markdownHeading)
    console.log('Selected Options:', selectedOptions)
  } catch (e) {
    console.log('Error when parsing pull request body, skip.')
    console.log(e)
    return false
  }

  const optIdx = parseInt(getPipelineVar(ENV_VARS.markdownOptionIndex), '10')
  const optValue = getPipelineVar(ENV_VARS.markdownOptionValue)
  console.log(`Target Option Index: ${optIdx}`)
  console.log(`Target Option Value: ${optValue}`)

  for (const [value, idx] of selectedOptions) {
    if (value === optValue || idx === optIdx) {
      console.log(`Option ${idx} "${value}" selected, run following tests`)
      return true
    }
  }

  console.log('Option not selected.')
  return false
}

const fileChangeCheck = async () => {
  console.log('[File Changes]')
  const globs = getPipelineVar(ENV_VARS.fileChangeGlobs)
  if (typeof (globs) !== 'string' || globs.length === 0) {
    console.log('Glob pattern not provided, skip')
    return false
  }
  const patterns = globs.split(',')
  console.log(`Glob patterns: ${globs}`)
  // get changed files
  const prInfo = await getGithubPullRequestInfo()
  const numFiles = parseInt(prInfo.changed_files, 10)
  console.log(`Changed files: ${numFiles}`)
  if (numFiles >= 3000) {
    console.log('Changed files > 3000, run following tests')
    return true
  }
  const resp = await getGithubPullRequestChanges(numFiles)
  const files = resp.map(x => x.filename)
  const result = multimatch(files, patterns)
  if (result.length > 0) {
    console.log('Following changes match provided patterns:')
    for (const path of result) {
      console.log(path)
    }
    console.log('Run following tests')
    return true
  }

  console.log('No changes match provided patterns')
  return false
}

const setOutputVariable = (key, value) => {
  console.log(`Set variable: ${key} -> ${value}`)
  console.log(`##vso[task.setvariable variable=${key};isoutput=true]${value}`)
}

const main = async () => {
  if (!isTriggeredByGithubPR()) {
    setOutputVariable(SKIP_VARIABLE, false)
    return
  }

  if (await fileChangeCheck()) {
    setOutputVariable(SKIP_VARIABLE, false)
    return
  }

  if (await prBodyCheck()) {
    setOutputVariable(SKIP_VARIABLE, false)
    return
  }

  setOutputVariable(SKIP_VARIABLE, true)
}

export { isTriggeredByGithubPR, fileChangeCheck, prBodyCheck, setOutputVariable, SKIP_VARIABLE, ENV_VARS, main }
