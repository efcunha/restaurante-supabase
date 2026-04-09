'use client'

import { useEffect, useMemo, useState } from 'react'

type BuildInfo = {
  fileLatest?: string
}

type LatestBuildsManifest = {
  android?: BuildInfo
  ios?: BuildInfo
}

type DownloadLinks = {
  androidHref: string
  iosHref: string
  hasAndroidManifest: boolean
  hasIOSIpa: boolean
}

const DEFAULT_ANDROID_FILE = 'android-latest.apk'
const DEFAULT_IOS_FILE = 'ios-latest.ipa'
const DOWNLOADS_BASE_PATH = '/downloads'

export function useLatestBuildDownloads(): DownloadLinks {
  const [manifest, setManifest] = useState<LatestBuildsManifest | null>(null)

  useEffect(() => {
    let alive = true

    fetch(`${DOWNLOADS_BASE_PATH}/latest-builds.json`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar latest-builds.json: ${response.status}`)
        }
        return response.json() as Promise<LatestBuildsManifest>
      })
      .then((data) => {
        if (!alive) return
        setManifest(data)
      })
      .catch(() => {
        if (!alive) return
        setManifest(null)
      })

    return () => {
      alive = false
    }
  }, [])

  return useMemo(() => {
    const androidFile = manifest?.android?.fileLatest || DEFAULT_ANDROID_FILE
    const iosFile = manifest?.ios?.fileLatest || DEFAULT_IOS_FILE
    const hasIOSIpa = Boolean(manifest?.ios?.fileLatest?.toLowerCase().endsWith('.ipa'))

    return {
      androidHref: `${DOWNLOADS_BASE_PATH}/${androidFile}`,
      iosHref: `${DOWNLOADS_BASE_PATH}/${iosFile}`,
      hasAndroidManifest: Boolean(manifest?.android?.fileLatest),
      hasIOSIpa,
    }
  }, [manifest])
}
