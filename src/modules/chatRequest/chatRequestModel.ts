import {z} from 'zod';

export const CreateChatRequestSchema = z.object({
    sender_id: z.string().uuid(),
    receiver_id: z.string().uuid(),
});
export type CreateChatRequestInput = z.infer<typeof CreateChatRequestSchema>;

export const ChatRequestRowSchema = z.object({
    id: z.string().uuid(),
    sender_id: z.string().uuid(),
    receiver_id: z.string().uuid(),
    status: z.enum(['pending', 'accepted', 'rejected', 'blocked']),
    created_at: z.string(),
    responded_at: z.string().nullable().optional(),
    rejected_reason: z.string().nullable().optional(),
    cooldown_until: z.string().nullable().optional(),
});
export type ChatRequestRow = z.infer<typeof ChatRequestRowSchema>;

export const ChatRequestResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    sender_id: z.string().uuid(),
    receiver_id: z.string().uuid(),
    status: z.string(),
    created_at: z.string(),
    responded_at: z.string().nullable().optional(),
    rejected_reason: z.string().nullable().optional(),
    cooldown_until: z.string().nullable().optional(),
});
export type ChatRequestResponse = z.infer<typeof ChatRequestResponseSchema>;
