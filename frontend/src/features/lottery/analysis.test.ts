import { describe, expect, it } from 'vitest';
import { analyzeTicket } from './analysis';
import { DLT_CONFIG, SSQ_CONFIG } from './config';

describe('analyzeTicket（TC-010）', () => {
  it('双色球已知号码的分布指标正确', () => {
    const result = analyzeTicket(SSQ_CONFIG, {
      red: [1, 6, 12, 19, 26, 33],
      blue: [8],
    });
    expect(result.oddEven).toBe('3:3');
    expect(result.bigSmall).toBe('3:3');
    expect(result.sum).toBe(97);
    expect(result.zones).toBe('2:2:2');
  });

  it('大乐透只分析主区（前区）', () => {
    const result = analyzeTicket(DLT_CONFIG, {
      front: [1, 10, 18, 27, 35],
      back: [3, 9],
    });
    // 1..35 三等分：1–12、13–24、25–35；中位数 18
    expect(result.oddEven).toBe('3:2');
    expect(result.bigSmall).toBe('3:2');
    expect(result.sum).toBe(91);
    expect(result.zones).toBe('2:1:2');
  });

  it('空号码返回零值而不是抛错', () => {
    expect(analyzeTicket(SSQ_CONFIG, {})).toEqual({
      oddEven: '0:0',
      bigSmall: '0:0',
      sum: 0,
      zones: '0:0:0',
    });
  });
});
