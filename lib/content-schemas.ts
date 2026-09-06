import { z } from 'zod';

// 站主内容管理：文章与项目的输入校验（API 层使用）

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和中划线');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式为 YYYY-MM-DD');
const tagSchema = z.string().min(1).max(24);

export const articleInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  category: z.string().min(1).max(30),
  tags: z.array(tagSchema).max(8),
  publishedAt: dateSchema,
  updatedAt: dateSchema,
  featured: z.boolean(),
  status: z.enum(['published', 'draft']),
  content: z.string().min(1).max(60000),
});

export const articlePatchSchema = articleInputSchema.partial();

export const projectInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  category: z.string().min(1).max(30),
  tech: z.array(tagSchema).max(10),
  status: z.string().min(1).max(20),
  website: z.url().max(300),
  repository: z.url().max(300).nullable(),
  featured: z.boolean(),
  mark: z.string().min(1).max(4),
});

export const projectPatchSchema = projectInputSchema.partial();

export type ArticleInput = z.infer<typeof articleInputSchema>;
export type ArticlePatch = z.infer<typeof articlePatchSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type ProjectPatch = z.infer<typeof projectPatchSchema>;
