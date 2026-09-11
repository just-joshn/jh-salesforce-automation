import { z } from 'zod';

export const loose = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
export const nullableString = z.string().nullable().optional();
