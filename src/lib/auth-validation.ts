import { z } from 'zod';

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Email é obrigatório' })
  .email({ message: 'Formato de email inválido' })
  .max(255, { message: 'Email muito longo' });

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  .max(128, { message: 'Senha muito longa' });

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Signup form schema with restaurant name
export const signupSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(1, { message: 'Nome do restaurante é obrigatório' })
    .max(100, { message: 'Nome muito longo' }),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// Validate login input
export const validateLoginInput = (email: string, password: string) => {
  const result = loginSchema.safeParse({ email, password });
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return {
      isValid: false,
      errors: {
        email: errors.email?.[0],
        password: errors.password?.[0],
      },
    };
  }
  return { isValid: true, errors: {} };
};

// Validate signup input
export const validateSignupInput = (restaurantName: string, email: string, password: string) => {
  const result = signupSchema.safeParse({ restaurantName, email, password });
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return {
      isValid: false,
      errors: {
        restaurantName: errors.restaurantName?.[0],
        email: errors.email?.[0],
        password: errors.password?.[0],
      },
    };
  }
  return { isValid: true, errors: {} };
};
