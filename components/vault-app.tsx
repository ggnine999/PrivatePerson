'use client';
import {
  ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Check,
  Clipboard,
  Download,
  Eye,
  FileKey,
  Heart,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  createVaultProfile,
  decryptJson,
  encryptJson,
  unlockVault,
  type VaultProfile,
} from '@/lib/vault-crypto';
type Kind = 'account' | 'apiKey';
type Secret = {
  username?: string;
  password?: string;
  key?: string;
  secret?: string;
  scopes?: string;
  notes?: string;
  createdDate?: string;
};
type RecordItem = {
  id: string;
  type: Kind;
  platform: string;
  title: string;
  category: string;
  tags: string[];
  favorite: boolean;
  environment?: '测试' | '生产' | null;
  expiresAt?: string | null;
  rotateAt?: string | null;
  secretSuffix: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
};
type FormState = {
  type: Kind;
  platform: string;
  title: string;
  category: string;
  tags: string;
  favorite: boolean;
  environment: '测试' | '生产';
  expiresAt: string;
  rotateAt: string;
  username: string;
  password: string;
  key: string;
  secret: string;
  scopes: string;
  notes: string;
  createdDate: string;
};
type FormSubmitEvent = SyntheticEvent<HTMLFormElement, globalThis.SubmitEvent>;
function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
const emptyForm = (type: Kind = 'account'): FormState => ({
  type,
  platform: '',
  title: '',
  category: '未分类',
  tags: '',
  favorite: false,
  environment: '测试',
  expiresAt: '',
  rotateAt: '',
  username: '',
  password: '',
  key: '',
  secret: '',
  scopes: '',
  notes: '',
  createdDate: '',
});
async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  if (response.status === 401) {
    location.replace('/vault/login');
    throw new Error('会话已过期');
  }
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? '请求失败');
  return data;
}
export function VaultApp() {
  const [csrf, setCsrf] = useState(''),
    [profile, setProfile] = useState<VaultProfile | null | undefined>(
      undefined,
    ),
    [key, setKey] = useState<CryptoKey | null>(null),
    [records, setRecords] = useState<RecordItem[]>([]),
    [query, setQuery] = useState(''),
    [form, setForm] = useState<FormState>(emptyForm()),
    [editing, setEditing] = useState<RecordItem | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [reveal, setReveal] = useState<{
      record: RecordItem;
      action: 'view' | 'copy' | 'edit';
    } | null>(null),
    [revealed, setRevealed] = useState<{
      record: RecordItem;
      secret: Secret;
    } | null>(null),
    [deleteTarget, setDeleteTarget] = useState<RecordItem | null>(null),
    [notice, setNotice] = useState(''),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState('');
  const lastActivity = useRef(0);

  const clearSensitiveState = useCallback(() => {
    setForm(emptyForm());
    setEditing(null);
    setFormOpen(false);
    setRevealed(null);
    setReveal(null);
    setDeleteTarget(null);
  }, []);

  const lock = useCallback(() => {
    clearSensitiveState();
    setKey(null);
    setRecords([]);
    setQuery('');
    setNotice(
      '保险库已锁定，所有已解密表单、记录列表与密钥均已从页面状态中移除。',
    );
  }, [clearSensitiveState]);

  const loadInitialState = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [session, loadedProfile] = await Promise.all([
        jsonFetch<{ csrfToken: string }>('/api/auth/session'),
        jsonFetch<VaultProfile | null>('/api/vault/profile'),
      ]);
      setCsrf(session.csrfToken);
      setProfile(loadedProfile);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadInitialState(), 0);
    return () => clearTimeout(timer);
  }, [loadInitialState]);
  useEffect(() => {
    if (!key) return;
    lastActivity.current = Date.now();
    void jsonFetch<RecordItem[]>('/api/vault/records')
      .then(setRecords)
      .catch((error) =>
        setNotice(
          error instanceof Error
            ? error.message
            : '保险库记录加载失败，请重试。',
        ),
      );
    const activity = () => {
      lastActivity.current = Date.now();
    };
    for (const name of ['pointerdown', 'keydown', 'scroll'] as const)
      addEventListener(name, activity, { passive: true });
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current > 5 * 60_000) lock();
    }, 15_000);
    return () => {
      clearInterval(timer);
      for (const name of ['pointerdown', 'keydown', 'scroll'] as const)
        removeEventListener(name, activity);
    };
  }, [key, lock]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'lock_vault',
          title: '锁定保险库',
          description: '立即锁定当前已解锁的私人保险库并清除页面内存中的密钥。',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== 'object' ||
              Array.isArray(input) ||
              Object.keys(input as Record<string, unknown>).length > 0
            ) {
              throw new Error('lock_vault 不接受任何参数。');
            }
            lock();
            return { locked: true };
          },
        },
        { signal: controller.signal },
      ),
    );
    return () => controller.abort();
  }, [lock]);
  const visible = useMemo(
    () =>
      records.filter((item) =>
        `${item.platform}${item.title}${item.category}${item.tags.join('')}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [records, query],
  );
  async function initialize(event: FormSubmitEvent) {
    event.preventDefault();
    const data = new FormData(event.currentTarget),
      master = field(data, 'master'),
      confirm = field(data, 'confirm');
    if (master.length < 12 || master !== confirm) {
      setNotice('主密码至少 12 位，且两次输入必须一致。');
      return;
    }
    const created = await createVaultProfile(master);
    await jsonFetch('/api/vault/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify(created.profile),
    });
    setProfile(created.profile);
    setKey(created.key);
    setNotice('保险库已初始化。请立即记住主密码；忘记后无法恢复。');
  }
  async function unlock(event: FormSubmitEvent) {
    event.preventDefault();
    if (!profile) return;
    const password = field(new FormData(event.currentTarget), 'master');
    try {
      setKey(await unlockVault(password, profile));
      lastActivity.current = Date.now();
      setNotice('保险库已解锁。5 分钟无操作后自动锁定。');
    } catch {
      setNotice('主密码不正确。');
    }
  }
  function openCreate(type: Kind = 'account') {
    clearSensitiveState();
    setForm(emptyForm(type));
    setFormOpen(true);
  }

  function openDecryptedEditor(record: RecordItem, secret: Secret) {
    setForm({
      type: record.type,
      platform: record.platform,
      title: record.title,
      category: record.category,
      tags: record.tags.join(', '),
      favorite: record.favorite,
      environment: record.environment ?? '测试',
      expiresAt: record.expiresAt ?? '',
      rotateAt: record.rotateAt ?? '',
      username: secret.username ?? '',
      password: secret.password ?? '',
      key: secret.key ?? '',
      secret: secret.secret ?? '',
      scopes: secret.scopes ?? '',
      notes: secret.notes ?? '',
      createdDate: secret.createdDate ?? '',
    });
    setEditing(record);
    setFormOpen(true);
  }
  function generatePassword() {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_-+=';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setForm((value) => ({
      ...value,
      password: Array.from(
        bytes,
        (byte) => alphabet[byte % alphabet.length],
      ).join(''),
    }));
  }
  async function save(event: FormSubmitEvent) {
    event.preventDefault();
    if (!key) return;
    const secret: Secret =
      form.type === 'account'
        ? {
            username: form.username,
            password: form.password,
            notes: form.notes,
          }
        : {
            key: form.key,
            secret: form.secret,
            scopes: form.scopes,
            notes: form.notes,
            createdDate: form.createdDate,
          };
    const encrypted = await encryptJson(key, secret);
    const body = {
      type: form.type,
      platform: form.platform,
      title: form.title || form.platform,
      category: form.category,
      tags: form.tags
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      favorite: form.favorite,
      environment: form.type === 'apiKey' ? form.environment : null,
      expiresAt: form.expiresAt || null,
      rotateAt: form.rotateAt || null,
      secretSuffix: form.type === 'apiKey' ? form.key.slice(-4) : '',
      ...encrypted,
    };
    await jsonFetch(
      editing ? `/api/vault/records/${editing.id}` : '/api/vault/records',
      {
        method: editing ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify(body),
      },
    );
    setRecords(await jsonFetch('/api/vault/records'));
    clearSensitiveState();
    setNotice(
      editing ? '记录已更新并重新加密。' : '记录已在浏览器加密后保存。',
    );
  }
  async function confirmReveal(event: FormSubmitEvent) {
    event.preventDefault();
    if (!profile || !reveal) return;
    try {
      const rekey = await unlockVault(
        field(new FormData(event.currentTarget), 'master'),
        profile,
      );
      const secret = await decryptJson<Secret>(rekey, reveal.record);
      if (reveal.action === 'copy') {
        const text =
          reveal.record.type === 'account'
            ? (secret.password ?? '')
            : (secret.key ?? secret.secret ?? '');
        await navigator.clipboard.writeText(text);
        setNotice(
          '已复制。30 秒后会尽力清空剪贴板；浏览器与系统可能阻止或被其他内容覆盖。',
        );
        setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText();
            if (current === text) await navigator.clipboard.writeText('');
          } catch {}
        }, 30_000);
      } else if (reveal.action === 'edit') {
        openDecryptedEditor(reveal.record, secret);
      } else {
        setRevealed({ record: reveal.record, secret });
      }
      setReveal(null);
    } catch {
      setNotice('再次验证失败。');
    }
  }
  async function remove() {
    if (!deleteTarget) return;
    await jsonFetch(`/api/vault/records/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf },
    });
    setRecords((items) => items.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
    setNotice('记录已删除。');
  }
  async function logout() {
    lock();
    await jsonFetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf },
    });
    location.replace('/vault/login');
  }
  function exportBackup() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'starry-vault-backup-v1',
            exportedAt: new Date().toISOString(),
            profile,
            records,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `starry-vault-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('加密备份已导出。它仍需主密码才能解开。');
  }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !key) return;
    try {
      const backup = JSON.parse(await file.text()) as {
        format: string;
        records: RecordItem[];
      };
      if (
        backup.format !== 'starry-vault-backup-v1' ||
        !Array.isArray(backup.records)
      )
        throw new Error();
      for (const record of backup.records) {
        await decryptJson(key, record);
        const { id: _, createdAt: __, updatedAt: ___, ...body } = record;
        await jsonFetch('/api/vault/records', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify(body),
        });
      }
      setRecords(await jsonFetch('/api/vault/records'));
      setNotice('备份已验证并恢复。重复记录会作为新记录导入。');
    } catch {
      setNotice('恢复失败：文件无效，或不是由当前主密码加密。');
    }
    event.target.value = '';
  }
  if (loading)
    return (
      <main className="vault-loading">
        <RefreshCw className="spin" />
        <p>正在确认安全会话…</p>
      </main>
    );
  if (loadError)
    return (
      <main className="vault-gate">
        <section>
          <AlertTriangle />
          <h1>无法加载保险库</h1>
          <p>{loadError}。请检查本地服务和数据库后重试。</p>
          <button
            className="button primary"
            onClick={() => void loadInitialState()}
          >
            <RefreshCw /> 重试
          </button>
        </section>
      </main>
    );
  if (!profile)
    return (
      <main className="vault-gate">
        <section>
          <ShieldCheck />
          <h1>初始化零知识保险库</h1>
          <p>
            主密码永远不会发送到服务器。它只在本页内派生密钥；如果忘记，任何人都无法帮你恢复。
          </p>
          <form onSubmit={initialize}>
            <label>
              创建主密码
              <input
                name="master"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              再次输入
              <input
                name="confirm"
                type="password"
                minLength={12}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="button primary">创建并解锁</button>
          </form>
          {notice && <p className="vault-notice">{notice}</p>}
        </section>
      </main>
    );
  if (!key)
    return (
      <main className="vault-gate">
        <section>
          <Lock />
          <h1>保险库已锁定</h1>
          <p>
            输入主密码在本设备上解锁。刷新或关闭页面会丢弃内存中的解密密钥。
          </p>
          <form onSubmit={unlock}>
            <label>
              主密码
              <input
                name="master"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>
            <button className="button primary">
              解锁保险库 <KeyRound />
            </button>
          </form>
          {notice && <p className="vault-notice">{notice}</p>}
          <button className="text-button" onClick={logout}>
            退出所有者账号
          </button>
        </section>
      </main>
    );
  return (
    <main className="vault-shell">
      <header className="vault-top">
        <div>
          <span className="secure-state">
            <ShieldCheck /> 已登录 · 已解锁
          </span>
          <h1>私人保险库</h1>
          <p>
            所有敏感字段均在浏览器中解密。服务器只持有密文和筛选所需的非敏感元数据。
          </p>
        </div>
        <div className="vault-actions">
          <button onClick={exportBackup}>
            <Download /> 导出密文备份
          </button>
          <label>
            <Upload /> 恢复备份
            <input
              type="file"
              accept="application/json"
              onChange={importBackup}
            />
          </label>
          <button onClick={lock}>
            <Lock /> 锁定
          </button>
          <button onClick={logout}>
            <LogOut /> 退出
          </button>
        </div>
      </header>
      {notice && (
        <div className="vault-notice">
          <Check />
          {notice}
        </div>
      )}
      <div className="vault-toolbar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索平台、分类或标签…"
          />
        </label>
        <button className="button primary" onClick={() => openCreate()}>
          <Plus /> 新建记录
        </button>
      </div>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">
            <Lock /> 账号密码
          </TabsTrigger>
          <TabsTrigger value="apiKey">
            <FileKey /> API Keys
          </TabsTrigger>
        </TabsList>
        {(['account', 'apiKey'] as Kind[]).map((type) => (
          <TabsContent value={type} key={type}>
            <div className="vault-grid">
              {visible
                .filter((item) => item.type === type)
                .map((record) => (
                  <article className="vault-card" key={record.id}>
                    <div className="vault-card-head">
                      <div className="project-mark">
                        {record.platform.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span>{record.category}</span>
                        <h2>{record.platform}</h2>
                        <p>{record.title}</p>
                      </div>
                      {record.favorite && <Heart className="favorite" />}
                    </div>
                    {record.type === 'apiKey' && (
                      <div className="key-preview">
                        •••• •••• ••••{' '}
                        <strong>{record.secretSuffix || '????'}</strong>
                      </div>
                    )}
                    <div className="tags">
                      {record.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    {record.type === 'apiKey' &&
                      (record.expiresAt || record.rotateAt) && (
                        <p className="key-date">
                          <AlertTriangle />{' '}
                          {record.expiresAt
                            ? `到期 ${record.expiresAt}`
                            : `轮换 ${record.rotateAt}`}
                        </p>
                      )}
                    <div className="record-actions">
                      <button
                        onClick={() => setReveal({ record, action: 'view' })}
                      >
                        <Eye /> 查看
                      </button>
                      <button
                        onClick={() => setReveal({ record, action: 'copy' })}
                      >
                        <Clipboard /> 复制
                      </button>
                      <button
                        onClick={() => setReveal({ record, action: 'edit' })}
                      >
                        编辑
                      </button>
                      <button onClick={() => setDeleteTarget(record)}>
                        <Trash2 /> 删除
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {!visible.some((item) => item.type === type) && (
              <div className="vault-empty">
                <FileKey />
                <h2>还没有{type === 'account' ? '账号' : '密钥'}记录</h2>
                <button onClick={() => openCreate(type)}>添加第一条</button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <Dialog
        open={formOpen}
        onOpenChange={(open) => !open && clearSensitiveState()}
      >
        <DialogContent className="vault-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑记录' : '新建加密记录'}</DialogTitle>
            <DialogDescription>
              敏感字段会在提交前于浏览器内加密。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="record-form">
            <div className="form-grid">
              <label>
                类型
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as Kind })
                  }
                >
                  <option value="account">账号密码</option>
                  <option value="apiKey">API Key</option>
                </select>
              </label>
              <label>
                平台名称
                <input
                  required
                  value={form.platform}
                  onChange={(e) =>
                    setForm({ ...form, platform: e.target.value })
                  }
                />
              </label>
              <label>
                记录名称
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label>
                分类
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </label>
              <label className="span-2">
                标签（逗号分隔）
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </label>
              {form.type === 'account' ? (
                <>
                  <label>
                    用户名或邮箱
                    <input
                      required
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    密码
                    <span className="input-action">
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                      />
                      <button type="button" onClick={generatePassword}>
                        生成
                      </button>
                    </span>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    环境
                    <select
                      value={form.environment}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          environment: e.target.value as '测试' | '生产',
                        })
                      }
                    >
                      <option>测试</option>
                      <option>生产</option>
                    </select>
                  </label>
                  <label>
                    创建日期
                    <input
                      type="date"
                      value={form.createdDate}
                      onChange={(e) =>
                        setForm({ ...form, createdDate: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    API Key / Token
                    <input
                      type="password"
                      autoComplete="off"
                      required
                      value={form.key}
                      onChange={(e) =>
                        setForm({ ...form, key: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Secret（可选）
                    <input
                      type="password"
                      autoComplete="off"
                      value={form.secret}
                      onChange={(e) =>
                        setForm({ ...form, secret: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    权限范围
                    <input
                      value={form.scopes}
                      onChange={(e) =>
                        setForm({ ...form, scopes: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    到期日期
                    <input
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) =>
                        setForm({ ...form, expiresAt: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    轮换日期
                    <input
                      type="date"
                      value={form.rotateAt}
                      onChange={(e) =>
                        setForm({ ...form, rotateAt: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              <label className="span-2">
                备注
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.favorite}
                  onChange={(e) =>
                    setForm({ ...form, favorite: e.target.checked })
                  }
                />{' '}
                收藏
              </label>
            </div>
            <DialogFooter>
              <button
                type="button"
                className="button ghost"
                onClick={clearSensitiveState}
              >
                取消
              </button>
              <button className="button primary">加密并保存</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(reveal)}
        onOpenChange={(open) => !open && setReveal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>再次验证主密码</DialogTitle>
            <DialogDescription>
              查看、复制或编辑完整敏感信息前需要重新验证。本次输入不会发送到服务器。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmReveal}>
            <label className="dialog-label">
              主密码
              <input
                name="master"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>
            <DialogFooter>
              <button className="button primary">验证并继续</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(revealed)}
        onOpenChange={(open) => !open && setRevealed(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{revealed?.record.platform}</DialogTitle>
            <DialogDescription>
              完整敏感信息仅在此对话框打开期间保留在页面状态中。
            </DialogDescription>
          </DialogHeader>
          <div className="secret-view">
            {revealed &&
              Object.entries(revealed.secret)
                .filter(([, v]) => v)
                .map(([name, value]) => (
                  <div key={name}>
                    <span>{name}</span>
                    <code>{value}</code>
                  </div>
                ))}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条记录？</AlertDialogTitle>
            <AlertDialogDescription>
              密文与元数据将从数据库删除，此操作不能通过界面撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
