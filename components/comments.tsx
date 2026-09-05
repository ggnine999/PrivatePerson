export function Comments() {
  return (
    <section className="comments" aria-label="评论区">
      <p className="comments-hint">
        评论功能在当前同源部署中已安全停用。博客与私人保险库共享同一 origin
        时，不加载可读取页面上下文的第三方脚本；未来将两者拆分到不同 origin
        后再接入评论服务。
      </p>
    </section>
  );
}
