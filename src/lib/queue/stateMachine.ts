import { QueueEntry, QueueEntryStatus, PriorityLevel } from '@/types/database';

export const VALID_TRANSITIONS: Record<QueueEntryStatus, QueueEntryStatus[]> = {
  BOOKED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['WAITING', 'CANCELLED'],
  WAITING: ['IN_CONSULTATION', 'CANCELLED', 'NO_SHOW'],
  IN_CONSULTATION: ['COMPLETED', 'WAITING'], // WAITING allows doctor pausing consultation
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ['WAITING'], // Receptionist can reinstate patient within grace period
};

export class InvalidStateTransitionError extends Error {
  constructor(public from: QueueEntryStatus, public to: QueueEntryStatus) {
    super(`Cannot transition queue entry from state '${from}' to '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

export function validateStateTransition(
  currentStatus: QueueEntryStatus,
  targetStatus: QueueEntryStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new InvalidStateTransitionError(currentStatus, targetStatus);
  }
  return true;
}

/**
 * Checks if a patient can be marked as NO_SHOW based on grace period rules.
 * Default grace period: 30 minutes after scheduled time or turn announcement.
 */
export function checkNoShowEligibility(
  scheduledTimeOrCallTime: Date,
  gracePeriodMinutes: number = 30,
  currentTime: Date = new Date()
): { eligible: boolean; minutesElapsed: number; gracePeriodMinutes: number } {
  const elapsedMs = currentTime.getTime() - scheduledTimeOrCallTime.getTime();
  const minutesElapsed = Math.floor(elapsedMs / (1000 * 60));
  return {
    eligible: minutesElapsed >= gracePeriodMinutes,
    minutesElapsed,
    gracePeriodMinutes,
  };
}

/**
 * Re-orders and recalculates 1-based queue positions.
 * Ensures:
 * 1. EMERGENCY_OVERRIDE patients appear before NORMAL and URGENT patients in WAITING status.
 * 2. Active IN_CONSULTATION patient has position 0.
 * 3. Completed, Cancelled, and No-Show have position 0.
 * 4. No duplicate position numbers exist.
 */
export function recalculateQueuePositions(entries: QueueEntry[]): QueueEntry[] {
  // Separate active waiting entries from inactive / in-consultation
  const inConsultation = entries.filter((e) => e.status === 'IN_CONSULTATION');
  const waiting = entries.filter((e) => e.status === 'WAITING' || e.status === 'CHECKED_IN');
  const finishedOrInactive = entries.filter(
    (e) => e.status === 'COMPLETED' || e.status === 'CANCELLED' || e.status === 'NO_SHOW' || e.status === 'BOOKED'
  );

  // Sort waiting:
  // 1. EMERGENCY_OVERRIDE first
  // 2. URGENT next
  // 3. FIFO by token_number or created_at
  const priorityRank: Record<PriorityLevel, number> = {
    EMERGENCY_OVERRIDE: 0,
    URGENT: 1,
    NORMAL: 2,
  };

  const sortedWaiting = [...waiting].sort((a, b) => {
    const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.token_number - b.token_number;
  });

  // Assign 1-based positions
  const updatedWaiting = sortedWaiting.map((entry, index) => ({
    ...entry,
    position_in_queue: index + 1,
  }));

  const updatedInConsultation = inConsultation.map((entry) => ({
    ...entry,
    position_in_queue: 0,
  }));

  const updatedInactive = finishedOrInactive.map((entry) => ({
    ...entry,
    position_in_queue: 0,
  }));

  return [...updatedInConsultation, ...updatedWaiting, ...updatedInactive];
}
