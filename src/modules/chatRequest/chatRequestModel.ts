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
    status: z.enum(['pending', 'accepted', 'rejected']),
    created_at: z.string(),
    responded_at: z.string().nullable().optional(),
});
export type ChatRequestRow = z.infer<typeof ChatRequestRowSchema>;

