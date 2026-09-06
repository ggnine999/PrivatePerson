// 纯函数：统计文章正文字数。中日韩字符按字计，拉丁字母数字按词计；
// 代码块与行内代码不计入。不依赖 marked/hljs，可在客户端组件中安全使用。
export function countWords(source: string): number {
  const plain = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_~[\]()!|]/g, ' ');
  const cjk =
    plain.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = plain.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g)?.length ?? 0;
  return cjk + latin;
}
