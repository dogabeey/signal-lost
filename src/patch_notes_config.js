import { t } from './localisation.js'

// Add a new object here for each update. The newest entry should be first.
export const PATCH_NOTES = [
  {
    heading: t('patch_notes.artifacts'),
    changes: [
      t('patch_notes.artifacts_1'), t('patch_notes.artifacts_2'), t('patch_notes.artifacts_3'),
    ],
  },
  {
    heading: t('patch_notes.improvements'),
    changes: [
      t('patch_notes.improvements_1'), t('patch_notes.improvements_2'),
    ],
  }
]
