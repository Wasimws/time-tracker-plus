import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
  .regex(/[^A-Za-z0-9]/, 'Hasło musi zawierać co najmniej jeden znak specjalny');

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const result = passwordSchema.safeParse(password);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => e.message),
  };
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 3) return 'weak';
  if (score <= 5) return 'strong';
  return 'strong';
};
