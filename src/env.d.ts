interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY?: string
  readonly VITE_AGENDAS_FOLDER_ID?: string
  readonly VITE_ARTIFACTS_URL?: string
  readonly VITE_TASKS_MOCK?: string
  readonly VITE_PR_METRICS_URL?: string
  readonly VITE_SHAME_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
