import { describe, expect, it } from 'vitest';
import { SSQ_CONFIG } from './config';
import { formatAmount, formatBall, formatTicketText, formatTicketsText } from './format';

describe('format（TC-011 文本格式）', () => {
  it('号码补零为两位数', () => {
    expect(formatBall(1)).toBe('01');
    expect(formatBall(33)).toBe('33');
  });

  it('单注文本包含区域名称与号码', () => {
    const text = formatTicketText(SSQ_CONFIG, {
      red: [1, 5, 12, 19, 26, 33],
      blue: [8],
    });
    expect(text).toBe('红球 01 05 12 19 26 33 | 蓝球 08');
  });

  it('多注文本按序号分行', () => {
    const text = formatTicketsText(SSQ_CONFIG, [
      { red: [1, 2, 3, 4, 5, 6], blue: [7] },
      { red: [7, 8, 9, 10, 11, 12], blue: [8] },
    ]);
    expect(text.split('\n')).toHaveLength(2);
    expect(text.startsWith('1. 红球')).toBe(true);
    expect(text).toContain('2. 红球');
  });

  it('金额格式化', () => {
    expect(formatAmount(14)).toBe('14 元');
  });
});
