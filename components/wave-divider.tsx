// 视差波浪分隔层：四层同路径波浪以不同速度水平漂移，形成纵深视差。
// 填充色取 --background（自动适配深浅主题），放置在首页 Hero 与内容区之间。
export function WaveDivider() {
  return (
    <div className="wave-divider" aria-hidden="true">
      <svg
        className="waves"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        shapeRendering="auto"
      >
        <defs>
          <path
            id="gentle-wave"
            d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
          />
        </defs>
        <g className="parallax">
          <use href="#gentle-wave" x="48" y="0" />
          <use href="#gentle-wave" x="48" y="3" />
          <use href="#gentle-wave" x="48" y="5" />
          <use href="#gentle-wave" x="48" y="7" />
        </g>
      </svg>
    </div>
  );
}
