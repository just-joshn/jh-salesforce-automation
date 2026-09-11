import { z } from 'zod';
import { loose } from './primitives';

export const tokenResponseSchema = loose({ access_token: z.string().min(1), usid: z.string().min(1), customer_id: z.string().min(1), token_type: z.string().optional(), expires_in: z.number().optional() });
export const problemDetailSchema = loose({ type: z.string().optional(), title: z.string().optional(), detail: z.string().optional(), message: z.string().optional(), status: z.number().optional() });
