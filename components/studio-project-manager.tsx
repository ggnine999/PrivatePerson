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

type ManagerProject = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tech: string[];
  status: string;
  website: string;
  repository: string | null;
  featured: boolean;
  mark: string;
};

type ProjectForm = {
  slug: string;
  name: string;
  description: string;
  category: string;
  techText: string;
  status: string;
  website: string;
  repository: string;
  featured: boolean;
  mark: string;
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

const emptyForm = (): ProjectForm => ({
  slug: '',
  name: '',
  description: '',
  category: '',
  techText: '',
  status: '概念验证',
  website: '',
  repository: '',
  featured: false,
  mark: '月',
});

// 站主项目管理：列表 + Dialog 表单 + AlertDialog 删除确认（硬删除）
export function StudioProjectManager() {
  const [projects, setProjects] = useState<ManagerProject[] | null>(null);
  const [csrf, setCsrf] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ManagerProject | null>(null);

  const load = useCallback(async () => {
    const data = await jsonFetch<{ projects: ManagerProject[] }>(
      '/api/studio/projects',
    );
    setProjects(data.projects);
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
        setProjects([]);
      }
    })();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMessage('');
    setEditorOpen(true);
  };

  const openEdit = (project: ManagerProject) => {
    setForm({
      slug: project.slug,
      name: project.name,
      description: project.description,
      category: project.category,
      techText: project.tech.join(', '),
      status: project.status,
      website: project.website,
      repository: project.repository ?? '',
      featured: project.featured,
      mark: project.mark,
    });
    setEditingId(project.id);
    setMessage('');
    setEditorOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setMessage('');
    const payload = {
      slug: form.slug.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      tech: form.techText
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      status: form.status.trim(),
      website: form.website.trim(),
      repository: form.repository.trim() || null,
      featured: form.featured,
      mark: form.mark.trim() || '月',
    };
    try {
      await jsonFetch(
        editingId ? `/api/studio/projects/${editingId}` : '/api/studio/projects',
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
      await jsonFetch(`/api/studio/projects/${deleteTarget.id}`, {
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

  const setField = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="studio-manager">
      <div className="studio-toolbar">
        <button type="button" className="button primary" onClick={openCreate}>
          <Plus aria-hidden="true" /> 新建项目
        </button>
        {message && <p className="comments-error">{message}</p>}
      </div>

      {projects === null ? (
        <p className="comments-loading">项目加载中…</p>
      ) : projects.length === 0 ? (
        <p className="comments-empty">还没有项目条目，点上面的「新建项目」添加。</p>
      ) : (
        <ul className="studio-list">
          {projects.map((project) => (
            <li key={project.id}>
              <div className="studio-item-main">
                <strong>
                  <span className="studio-mark" aria-hidden="true">
                    {project.mark}
                  </span>
                  {project.name}
                  {project.featured && (
                    <span className="studio-chip is-featured">精选</span>
                  )}
                </strong>
                <span className="studio-item-meta">
                  /{project.slug} · {project.category} · {project.status}
                </span>
              </div>
              <div className="studio-item-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => openEdit(project)}
                >
                  <Pencil aria-hidden="true" /> 编辑
                </button>
                <button
                  type="button"
                  className="button ghost is-danger"
                  onClick={() => setDeleteTarget(project)}
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
            <DialogTitle>{editingId ? '编辑项目' : '新建项目'}</DialogTitle>
          </DialogHeader>
          <div className="studio-form">
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sp-name">项目名称</Label>
                <Input
                  id="sp-name"
                  value={form.name}
                  maxLength={80}
                  onChange={(event) => setField('name', event.target.value)}
                />
              </div>
              <div className="studio-form-row">
                <Label htmlFor="sp-slug">slug</Label>
                <Input
                  id="sp-slug"
                  value={form.slug}
                  placeholder="my-project"
                  onChange={(event) => setField('slug', event.target.value)}
                />
              </div>
            </div>
            <div className="studio-form-row">
              <Label htmlFor="sp-description">简介</Label>
              <Input
                id="sp-description"
                value={form.description}
                maxLength={300}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sp-category">分类</Label>
                <Input
                  id="sp-category"
                  value={form.category}
                  onChange={(event) => setField('category', event.target.value)}
                />
              </div>
              <div className="studio-form-row">
                <Label htmlFor="sp-status">状态（开发中 / 维护中…）</Label>
                <Input
                  id="sp-status"
                  value={form.status}
                  maxLength={20}
                  onChange={(event) => setField('status', event.target.value)}
                />
              </div>
            </div>
            <div className="studio-form-row">
              <Label htmlFor="sp-tech">技术栈（逗号分隔）</Label>
              <Input
                id="sp-tech"
                value={form.techText}
                placeholder="React, TypeScript"
                onChange={(event) => setField('techText', event.target.value)}
              />
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sp-website">网站链接</Label>
                <Input
                  id="sp-website"
                  type="url"
                  value={form.website}
                  placeholder="https://"
                  onChange={(event) => setField('website', event.target.value)}
                />
              </div>
              <div className="studio-form-row">
                <Label htmlFor="sp-repository">仓库链接（可空）</Label>
                <Input
                  id="sp-repository"
                  type="url"
                  value={form.repository}
                  placeholder="https://"
                  onChange={(event) => setField('repository', event.target.value)}
                />
              </div>
            </div>
            <div className="studio-form-cols">
              <div className="studio-form-row">
                <Label htmlFor="sp-mark">标识字（单字）</Label>
                <Input
                  id="sp-mark"
                  value={form.mark}
                  maxLength={4}
                  onChange={(event) => setField('mark', event.target.value)}
                />
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
            <AlertDialogTitle>删除这个项目？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.name}」将被彻底删除。此操作无法撤销。
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
