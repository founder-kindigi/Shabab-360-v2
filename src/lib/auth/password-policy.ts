export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
// Keep every application-created password on the same bcrypt work factor.
export const PASSWORD_HASH_ROUNDS = 12;

export function getPasswordValidationError(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (password.trim().length === 0) {
    return "Password cannot be blank";
  }

  return null;
}
