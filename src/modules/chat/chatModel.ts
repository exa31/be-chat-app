import {z} from 'zod';

export const ChatCreateSchema = z.object({
    type: z.enum(['private', 'group']).default('private'),
    title: z.string().max(255).optional().nullable(),
    created_by: z.string().uuid().optional(),
    member_ids: z.array(z.string().uuid()).min(1),
});
export type ChatCreateInput = z.infer<typeof ChatCreateSchema>;

export const ChatRowSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(['private', 'group']),
    title: z.string().nullable().optional(),
    created_by: z.string().uuid().nullable().optional(),
    created_at: z.string(),
});
export type ChatRow = z.infer<typeof ChatRowSchema>;

export const ChatMemberSchema = z.object({
    id: z.string().uuid(),
    chat_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.enum(['admin', 'member']),
    joined_at: z.string(),
    last_read_message_id: z.string().uuid().nullable().optional(),
});
export type ChatMember = z.infer<typeof ChatMemberSchema>;

