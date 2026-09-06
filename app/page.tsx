import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Code2,
  Sparkles,
} from 'lucide-react';
import { heroSlides } from '@/lib/content';
import { countWords } from '@/lib/word-count';
import { ViewsBadge } from '@/components/article-stats';
import { HeroCarousel } from '@/components/hero-carousel';
import { WaveDivider } from '@/components/wave-divider';
import {
  listPublishedArticles,
  listPublishedProjects,
} from '@/lib/site-content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const articles = await listPublishedArticles();
  const projects = await listPublishedProjects();
  const featured = articles.filter((article) => article.featured);
  const featuredProjects = projects.filter((project) => project.featured);
  return (
    <main>
      <section className="hero">
        <HeroCarousel slides={heroSlides} />
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles aria-hidden="true" /> 私人星图 · 公开阅读
          </span>
          <h1>星屿手记</h1>
          <p className="lead">
            把代码、生活与微小的灵感写进夜色。慢一点写，认真一点想。
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
      </section>
      <WaveDivider />
      <section className="section shell home-discover" id="discover">
        <div className="home-intro-grid">
          <div id="home-music-slot" className="home-music-slot" />
          <div className="rhythm-card">
            <span className="kicker">RHYTHM GAME</span>
            <h2>音游排行榜</h2>
            <div className="rhythm-empty">
              <span className="rhythm-ghost" aria-hidden="true">
                🎮
              </span>
              <p>音游还在开发中——排行榜先在这里占个位置。</p>
              <p className="rhythm-sub">COMING SOON</p>
            </div>
          </div>
          <div className="home-profile-card">
            <span className="kicker">PROFILE</span>
            <div className="home-profile-head">
              <span className="brand-mark" aria-hidden="true">
                星
              </span>
              <div>
                <h2>阿枫</h2>
                <p>星屿手记 · 站主</p>
              </div>
            </div>
            <p className="home-profile-bio">
              喜欢把复杂问题讲清楚的独立开发者，也在练习摄影、写作与长期主义。
            </p>
            <p className="home-profile-quote">
              「愿每一次认真记录，都成为照亮来路的小小星光。」
            </p>
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
            <Link className="home-profile-more" href="/about">
              关于阿枫 <ArrowRight />
            </Link>
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
                <span>{countWords(article.content)} 字</span>
                <ViewsBadge slug={article.slug} />
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
