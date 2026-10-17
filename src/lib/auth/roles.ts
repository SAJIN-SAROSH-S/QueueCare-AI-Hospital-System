import { UserRole, UserProfile } from '@/types/database';

export class AuthorizationError extends Error {
  constructor(message: string = 'Unauthorized: Insufficient permissions for this action') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validates that the active user possesses one of the authorized roles.
 */
export function enforceRole(currentRole: UserRole, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(currentRole)) {
    throw new AuthorizationError(
      `Role '${currentRole}' is not permitted to perform this action. Required: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Ensures patients can only access their own records,
 * while staff (Receptionist, Doctor, Admin) can access clinic patient records.
 */
export function canAccessPatientRecord(
  currentUser: Pick<UserProfile, 'id' | 'role'>,
  targetPatientId: string
): boolean {
  if (currentUser.role === 'ADMIN' || currentUser.role === 'RECEPTIONIST') {
    return true;
  }
  if (currentUser.role === 'DOCTOR') {
    return true; // Doctors can access patients assigned to their clinic
  }
  // Patient can only access their own
  return currentUser.id === targetPatientId;
}

/**
 * Checks if user is permitted to manage clinical queue operations (Start/Complete/Triage)
 */
export function canManageQueueOperations(role: UserRole): boolean {
  return role === 'DOCTOR' || role === 'RECEPTIONIST' || role === 'ADMIN';
}

/**
 * Checks if user is permitted to trigger Emergency Clinical Override
 */
export function canOverrideEmergencyTriage(role: UserRole): boolean {
  return role === 'DOCTOR' || role === 'RECEPTIONIST' || role === 'ADMIN';
}
