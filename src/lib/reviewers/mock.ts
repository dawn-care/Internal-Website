import { MOCK_USER } from '../auth/mock'
import type { ReviewerMetrics } from './types'

/** Fake metrics/reviewers.json for VITE_TASKS_MOCK=true, so local dev needs no network. */
export function mockReviewerMetrics(): ReviewerMetrics {
  return {
    generatedAt: new Date().toISOString(),
    windowDays: 14,
    allTime: {
      'river-b': 14,
      'priya-n': 11,
      [MOCK_USER.login]: 9,
      'sam-k': 6,
    },
    trailingWindow: {
      'river-b': 5,
      'priya-n': 3,
      [MOCK_USER.login]: 2,
      'sam-k': 0,
    },
  }
}
