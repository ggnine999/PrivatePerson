import { describe, expect, it } from 'vitest';
import { countWords } from '@/lib/word-count';

describe('countWords 字数统计', () => {
  it('中日韩字符按字计', () => {
    expect(countWords('你好世界')).toBe(4);
  });

  it('拉丁字母与数字按词计', () => {
    expect(countWords('hello world 2026')).toBe(3);
  });

  it('代码块与行内代码不计入', () => {
    const source = '一段中文说明\n\n```ts\nconst a = 1;\n```\n\n使用 `code` 内联。';
    // 中文：一段中文说明(6) + 使用(2) + 内联(2) = 10
    expect(countWords(source)).toBe(10);
  });

  it('Markdown 标记不产生额外计数', () => {
    expect(countWords('## 标题\n\n- **加粗** 列表')).toBe(
      countWords('标题\n\n加粗 列表'),
    );
  });
});
