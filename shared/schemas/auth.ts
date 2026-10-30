import { z } from 'zod'
import { PASSWORD_MAX, USERNAME_MAX, USERNAME_MIN } from '../constants/limits'

export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, { error: 'too_short' })
  .max(USERNAME_MAX, { error: 'too_long' })
  .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/, { error: 'invalid_characters' })

const passwordInput = z
  .string()
  .min(1, { error: 'required' })
  .max(PASSWORD_MAX * 4, { error: 'too_long' })

export const loginSchema = z.object({
  username: z.string().max(64).default(''),
  password: z
    .string()
    .max(PASSWORD_MAX * 4)
    .default(''),
  website: z.string().max(256).default(''),
  formToken: z.string().max(200).default(''),
})

export const secondFactorSchema = z.object({
  challenge: z.string().min(1).max(100),
  code: z.string().min(1, { error: 'required' }).max(40),
})

export const newPasswordSchema = z.object({ password: passwordInput })

export const usernameSchema = z.object({ username: usernameField })

export const reauthSchema = z.object({
  password: passwordInput,
  code: z.string().max(40).optional(),
})

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: 'six_digits' }),
})

export const totpDisableSchema = z.object({
  password: passwordInput,
  code: z.string().min(1, { error: 'required' }).max(40),
})

export const localeSchema = z.object({ locale: z.enum(['de', 'en']) })

export type MeResponse =
  | { authenticated: false }
  | {
      authenticated: true
      csrfToken: string
      reauthUntil: number | null
      user: {
        username: string
        locale: 'de' | 'en'
        totpEnabled: boolean
        mustChangePassword: boolean
        setupComplete: boolean
        recoveryCodesLeft: number
      }
    }
