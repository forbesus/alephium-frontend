/*
Copyright 2018 - 2024 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { exponentialBackoffFetchRetry } from '@alephium/shared'
import { compareVersions } from 'compare-versions'
import { useState } from 'react'

import useAnalytics from '@/features/analytics/useAnalytics'
import useThrottledGitHubApi from '@/hooks/useThrottledGitHubApi'
import { AlephiumWindow } from '@/types/window'
import { currentVersion, isRcVersion } from '@/utils/app-data'
import { links } from '@/utils/links'

const _window = window as unknown as AlephiumWindow
const electron = _window.electron
const semverRegex = isRcVersion ? /^(\d+\.\d+\.\d+)(?:-rc(\.\d+)?)?$/ : /^(\d+\.\d+\.\d+)?$/

const useLatestGitHubRelease = () => {
  const { sendAnalytics } = useAnalytics()

  const [newVersion, setNewVersion] = useState('')
  const [requiresManualDownload, setRequiresManualDownload] = useState(false)

  const checkForManualDownload = async () => {
    try {
      const response = await exponentialBackoffFetchRetry(links.latestReleaseApi)
      const data = await response.json()
      const version = data?.tag_name?.replace('alephium-desktop-wallet@', '')

      if (version && isVersionNewer(version)) {
        setNewVersion(version)
        setRequiresManualDownload(true)
      }
    } catch (error) {
      sendAnalytics({ type: 'error', error, message: 'Checking for latest release version for manual download' })
    }
  }

  useThrottledGitHubApi({
    lastGithubCallTimestampKey: 'lastTimeGitHubApiWasCalledForLatestVersion',
    githubApiCallback: async () => {
      const version = await electron?.updater.checkForUpdates()

      if (!version) {
        await checkForManualDownload()
      } else if (isVersionNewer(version)) {
        setNewVersion(version)
      }
    }
  })

  return { newVersion, requiresManualDownload }
}

export default useLatestGitHubRelease

const isVersionNewer = (version: string): boolean =>
  semverRegex.test(version) && !!currentVersion && compareVersions(version, currentVersion) > 0
