// ============================================================================
// DirectRefer V2.0 — Module Exports
// ============================================================================

export { calculateTrustScore, recalculateAndPersist, batchRecalculate, getTrustScore, getTier, getTierLabel, getTierColor } from './trust-score'
export type { TrustScore, TrustTier } from './trust-score'

export { recordStateTransition, getEntityHistory, getUserStateHistory, getHistoryByDateRange, getCurrentState, getStateTransitionCounts, getAvgTimeInState, isValidTransition, REFERRAL_TRANSITIONS } from './state-history'
export type { StateHistoryEntry, EntityType } from './state-history'

export { getActiveCriteria, getCriteria, createCriteria, runScreening, getCandidateScreening, reviewAttempt } from './screening'
export type { ScreeningCriteria, ScreeningAttempt, ScreeningDecision, ValidationRule } from './screening'

export { createApplication, getApplication, getCandidateApplications, getJobApplications, updateApplicationStatus, withdrawApplication, shortlistApplication, rejectApplication, getCandidateStats, getJobStats } from './applications'
export type { Application, ApplicationCreate, ApplicationStatus } from './applications'

export { calculateMatchScore, findMatchesForJobSeeker, findMatchesForProfessional, storeMatches, getJobMatches } from './matching'
export type { MatchCandidate, MatchProfessional, MatchResult } from './matching'

export { fetchTrustScore, fetchTrustScores, recordReferralTransition, recordApplicationTransition, getReferralHistory, runCandidateScreening, submitApplication, updateAppStatus, notifyStateChange, calculateProfileCompleteness } from './api'

export { trustScoresSupported, stateHistorySupported, screeningSupported, applicationsSupported, matchesSupported, getV2FeatureFlags } from './probes'

export { recordBehaviorAdjustment, getBehaviorAdjustments, onReferralAccepted, onReferralRejected, onLateResponse, onScreeningPassed, onInactivity, applyBehaviorAdjustments } from './behaviorScore'
export type { BehaviorAdjustment } from './behaviorScore'
