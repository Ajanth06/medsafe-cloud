export interface UserProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  primaryDiagnosis: string | null;
  treatingClinic: string | null;
  emergencyContact: string | null;
  language: string;
  phone: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  displayName: string;
}
