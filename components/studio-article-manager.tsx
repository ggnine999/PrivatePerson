'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ManagerArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  featured: boolean;
  status: 'published' | 'draft';
  content: string;
};

type ArticleForm = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tagsText: string;
  publishedAt: string;
  updatedAt: string;
  featured: boolean;
  status: 'published' | 'draft';
  content: string;
};

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  if (response.status === 401) {
    location.replace('/vault/login');
    throw new Error('需要站主身份');
  }
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? '请求失败');
  return data;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): ArticleForm => ({
  slug: '',
  title: '',
  description: '',
  category: '',
  tagsText: '',
  publishedAt: today(),
  updatedAt: today(),
  featured: false,
  status: 'draft',
  content: '',
});

// 站主文章管理：列表 + Dialog 表单（新建/编辑）+ AlertDialog 删除确认（硬删除）
export function StudioArticleManager() {
  const [articles, setArticles] = useState<ManagerArticle[] | null>(null);
  const [csrf, setCsrf] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ManagerArticle | null>(null);

  const load = useCallback(async () => {
    const data = await jsonFetch<{ articles: ManagerArticle[] }>(
      '/api/studio/articles',
    );
    setArticles(data.articles);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const session = await jsonFetch<{ csrfToken: string }>(
          '/api/auth/session',
        );
        setCsrf(session.csrfToken);
      } catch {
        // jsonFetch 401 时已跳转登录页
      }
      try {
        await load();
      } catch (error) {
        setMessage((error as Error).message);
        setArticles([]);
      }
    })();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMessage('');
    setEditorOpen(true);
  };

  const openEdit = (article: ManagerArticle) => {
    setForm({
      slug: article.slug,
      title: article.title,
      description: article.description,
      category: article.category,
      tagsText: article.tags.join(', '),
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      featured: article.featured,
      status: article.status,
      content: article.content,
    });
    setEditingId(article.id);
    setMessage('');
    setEditorOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setMessage('');
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      tags: form.tagsText
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      publishedAt: form.publishedAt,
      updatedAt: form.updatedAt,
      featured: form.featured,
      status: form.status,
      content: form.content,
    };
    try {
      await jsonFetch(
        editingId ? `/api/studio/articles/${editingId}` : '/api/studio/articles',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify(payload),
        },
      );
      setEditorOpen(false);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await jsonFetch(`/api/studio/articles/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrf },
      });
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setField = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="studio-manager">
      <div className="studio-toolbar">
        <button type="button" className="button primary" onClick={openCreate}>
          <Plus aria-hidden="true" /> 新建文章
        </button>
        {message && <p className="comments-error">{message}</p>}
      </div>

      {articles === null ? (
        <p className="comments-loading">文章加载中…</p>
      ) : articles.length === 0 ? (
        <p className="comments-empty">还没有文章，点上面的「新建文章」写第一篇。</p>
      ) : (
        <ul className="studio-list">
          {articles.map((article) => (
            <li key={article.id}>
              <div className="studio-item-main">
                <strong>
                  {article.title}
                  {article.status === 'draft' && (
                    <span className="studio-chip is-draft">草稿</span>
                  )}
                  {article.featured && (
                    <span className="studio-chip is-featured">精选</span>
                  )}
                </strong>
                <span className="studio-item-meta">
                  /{article.slug} · {article.category} · 发布 {article.publishedAt}
                </span>
              </div>
              <div className="studio-item-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => openEdit(article)}
                >
                  <Pencil aria-hidden="true" /> 编辑
                </button>
                <button
                  type="button"
                  className="button ghost is-danger"
                  onClick={() => setDeleteTarget(article)}
                >
                  <Trash2 aria-hidden="true" /> 删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="studio-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑文章' : '新建文章'}</DialogTitle>
          </DialogHeader>
          <div className="studio-form">
            <div className="studio-form-row">
              <Label htmlFor="sa-title">标题</Label>
              <Input
                id="sa-title"
                value={form.title}
                maxLength={120}
                onChange={(event) => setField('title', event.target.value)}
              />
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sa-slug">slug（URL 标识）</Label>
                <Input
                  id="sa-slug"
                  value={form.slug}
                  placeholder="my-new-post"
                  onChange={(event) => setField('slug', event.target.value)}
                />
              </div>
              <div className="studio-form-row">
                <Label htmlFor="sa-category">分类</Label>
                <Input
                  id="sa-category"
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
              </div>
            </div>
            <div className="studio-form-row">
              <Label htmlFor="sa-description">摘要</Label>
              <Input
                id="sa-description"
                value={form.description}
                maxLength={300}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
            <div className="studio-form-row">
              <Label htmlFor="sa-tags">标签（逗号分隔）</Label>
              <Input
                id="sa-tags"
                value={form.tagsText}
                placeholder="博客, 设计"
                onChange={(event) => setField('tagsText', event.target.value)}
              />
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sa-published">发布日期</Label>
                <Input
                  id="sa-published"
                  type="date"
                  value={form.publishedAt}
                  onChange={(event) => setField('publishedAt', event.target.value)}
                />
              </div>
              <div className="studio-form-row">
                <Label htmlFor="sa-updated">更新日期</Label>
                <Input
                  id="sa-updated"
                  type="date"
                  value={form.updatedAt}
                  onChange={(event) => setField('updatedAt', event.target.value)}
                />
              </div>
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sa-status">状态</Label>
                <select
                  id="sa-status"
                  className="studio-select"
                  value={form.status}
                  onChange={(event) =>
                    setField('status', event.target.value as 'published' | 'draft')
                  }
                >
                  <option value="draft">草稿（不对外）</option>
                  <option value="published">已发布</option>
                </select>
              </div>
              <label className="studio-check">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => setField('featured', event.target.checked)}
                />
                首页精选
              </label>
            </div>
            <div className="studio-form-row">
              <Label htmlFor="sa-content">正文（Markdown）</Label>
              <Textarea
                id="sa-content"
                rows={14}
                value={form.content}
                onChange={(event) => setField('content', event.target.value)}
              />
              <small className="studio-form-hint">
                支持 Markdown 与代码块；阅读时长按字数自动计算。
              </small>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditorOpen(false)}
              disabled={busy}
            >
              取消
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? '保存中…' : '保存'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这篇文章？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」将被彻底删除，相关评论会保留但不再展示入口。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
