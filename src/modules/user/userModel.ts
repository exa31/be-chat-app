import {z} from 'zod';

export const RegisterSchema = z.object({
    name: z.string().min(1, 'name_required').max(255),
    email: z.string().email('invalid_email').max(255),
    password: z.string().min(6, 'password_too_short').max(1024),
    avatar: z.string().url().nullable().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
    email: z.string().email('invalid_email').max(255),
    password: z.string().min(1, 'password_required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const UserRowSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    avatar: z.string().nullable().optional(),
    status: z.union([z.literal('online'), z.literal('offline'), z.literal('away')]),
    last_seen: z.string().nullable().optional(),
    created_at: z.string(),
});
export type UserRow = z.infer<typeof UserRowSchema>;

// For internal use when selecting password
export const UserWithPasswordSchema = UserRowSchema.extend({password: z.string()});
export type UserWithPassword = z.infer<typeof UserWithPasswordSchema>;

