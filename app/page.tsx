import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Code2,
  Sparkles,
} from 'lucide-react';
import { articles, projects } from '@/lib/content';
import { WaveDivider } from '@/components/wave-divider';

export default function Home() {
  const featured = articles.filter((article) => article.featured);
  const featuredProjects = projects.filter((project) => project.featured);
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> 私人星图 · 公开阅读
          </span>
          <h1>
            把代码、生活与
            <br />
            <em>微小的灵感</em>写进夜色。
          </h1>
          <p className="lead">
            这里记录工程实践、创作札记和正在生长的个人项目。慢一点写，认真一点想。
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/articles">
              开始阅读 <ArrowRight />
            </Link>
            <Link className="button ghost" href="/projects">
              看看项目
            </Link>
          </div>
        </div>
        <a className="scroll-cue" href="#discover" aria-label="向下探索">
          <ChevronDown aria-hidden="true" />
          <span>向下探索</span>
        </a>
      </section>
      <WaveDivider />
      <section className="section shell" id="discover">
        <div className="home-intro-grid">
          <div id="home-music-slot" className="home-music-slot" />
          <div className="home-stats-card">
            <span className="kicker">SITE STATS</span>
            <dl className="hero-stats">
              <div>
                <dt>{articles.length}</dt>
                <dd>篇文章</dd>
              </div>
              <div>
                <dt>{projects.length}</dt>
                <dd>个示例项目</dd>
              </div>
              <div>
                <dt>∞</dt>
                <dd>继续更新</dd>
              </div>
            </dl>
            <p className="home-stats-note">
              音乐会持续播放——去别的页面逛逛也不会停。
            </p>
          </div>
        </div>
      </section>
      <section className="section shell">
        <div className="section-heading">
          <div>
            <span className="kicker">EDITOR&apos;S PICK</span>
            <h2>精选文章</h2>
          </div>
          <Link href="/articles">
            全部文章 <ArrowRight />
          </Link>
        </div>
        <div className="article-grid">
          {featured.map((article, index) => (
            <article
              className={index === 0 ? 'article-card feature' : 'article-card'}
              key={article.slug}
            >
              <div className="card-icon">
                {index === 0 ? <BookOpen /> : <Code2 />}
              </div>
              <div className="meta">
                <span>{article.category}</span>
                <span>{article.readingMinutes} 分钟阅读</span>
              </div>
              <h3>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>{article.description}</p>
              <div className="card-foot">
                <time dateTime={article.publishedAt}>
                  <CalendarDays /> {article.publishedAt}
                </time>
                <Link
                  aria-label={`阅读《${article.title}》`}
                  href={`/articles/${article.slug}`}
                >
                  <ArrowRight />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="latest-strip shell" aria-labelledby="latest-title">
        <div>
          <span className="kicker">LATEST NOTES</span>
          <h2 id="latest-title">最近更新</h2>
        </div>
        <div className="latest-list">
          {articles.slice(0, 3).map((article) => (
            <Link href={`/articles/${article.slug}`} key={article.slug}>
              <time dateTime={article.updatedAt}>{article.updatedAt}</time>
              <strong>{article.title}</strong>
              <ArrowRight />
            </Link>
          ))}
        </div>
      </section>
      <section className="section shell project-section">
        <div className="section-heading">
          <div>
            <span className="kicker">SIDE QUESTS</span>
            <h2>正在做的项目</h2>
          </div>
          <Link href="/projects">
            项目档案 <ArrowRight />
          </Link>
        </div>
        <div className="project-grid">
          {featuredProjects.map((project) => (
            <a
              className="project-card"
              href={project.website}
              target="_blank"
              rel="noopener noreferrer"
              key={project.slug}
            >
              <div className="project-mark" aria-hidden="true">
                {project.mark}
              </div>
              <div>
                <div className="meta">
                  <span>{project.category}</span>
                  <span className="project-status">{project.status}</span>
                </div>
                <h3>{project.name}</h3>
                <p>{project.description}</p>
                <div className="tags">
                  {project.tech.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              <ArrowRight className="project-arrow" />
            </a>
          ))}
        </div>
        <p className="demo-note">
          以上项目均为明确标注的虚构演示内容，不代表站点所有者的真实经历。
        </p>
      </section>
    </main>
  );
}
