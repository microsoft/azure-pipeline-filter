import got from 'got'
import multimatch from 'multimatch'

import { parsePullRequstBody } from './parsePullRequestBody.mjs'

const SKIP_VARIABLE = 'skipsubsequent'
const DEFAULT_PAT_SECRET_VALUE = '$(filter.githubPAT)'

const VARIABLES = {
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

const getGithubPullRequestInfo = async () => {
  const repoId = process.env.BUILD_REPOSITORY_ID
  const prNumber = process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER
  const prUrl = `https://api.github.com/repos/${repoId}/pulls/${prNumber}`
  return await _requestGithub(prUrl)
}

const getGithubPullRequestChanges = async () => {
  const repoId = process.env.BUILD_REPOSITORY_ID
  const prNumber = process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER
  const fileUrl = `https://api.github.com/repos/${repoId}/pulls/${prNumber}/files`
  return await _requestGithub(fileUrl)
}

const _requestGithub = async (url) => {
  const githubPAT = getPipelineVar(VARIABLES.githubPAT)
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

const basicCheck = async () => {
  console.log('[Basic Check]')
  const repoProvider = process.env.BUILD_REPOSITORY_PROVIDER
  console.log('Repo Provider:', repoProvider)
  if (repoProvider !== 'GitHub') {
    console.log(`Invalid repo provider ${repoProvider}, run following tests by default.`)
    return true
  }

  const buildReason = process.env.BUILD_REASON
  console.log('Build Reason:', buildReason)
  if (buildReason !== 'PullRequest') {
    console.log('Not triggered by pull request, run following tests by default.')
    return true
  }

  return false
}

const prBodyCheck = async () => {
  console.log('[Pull Request Body]')
  const markdownHeading = getPipelineVar(VARIABLES.markdownHeading)
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

  const optIdx = parseInt(getPipelineVar(VARIABLES.markdownOptionIndex), '10')
  const optValue = getPipelineVar(VARIABLES.markdownOptionValue)
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
  const globs = getPipelineVar(VARIABLES.fileChangeGlobs)
  if (typeof (globs) !== 'string' || globs.length === 0) {
    console.log('Glob pattern not provided, skip')
    return false
  }
  const patterns = globs.split(',')
  console.log(`Glob patterns: ${globs}`)

  const resp = await getGithubPullRequestChanges()
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
  const checks = [
    basicCheck,
    fileChangeCheck,
    prBodyCheck
  ]
  for (const check of checks) {
    const res = await check()
    if (res) {
      setOutputVariable(SKIP_VARIABLE, false)
      return
    }
  }

  setOutputVariable(SKIP_VARIABLE, true)
}
main()
