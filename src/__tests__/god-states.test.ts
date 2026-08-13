/**
 * 십성 기운(투출·통근) 검증 — docs/specs/god-states-spec.md 검증 절.
 * 카논 2건은 명세 표가 기댓값이다. 투출무근 케이스는 엔진 일시 탐색으로 고정.
 */

import { correctPillars } from '../correction/correct-pillars';

const DAEGU = { timezone: 'Asia/Seoul', longitude: 128.6014, latitude: 35.8714 };

/** 교차 불변식용: rooted/roots 배열 → (pillar, branch) 중복 제거 집합. */
const pairSet = (entries: { pillar: string; branch: string }[]) =>
  new Set(entries.map((e) => `${e.pillar}:${e.branch}`));

describe('godStates - 카논 1 (1992-07-23 04:30 대구 → 임신 정미 경자 무인, 일간 경금)', () => {
  const r = correctPillars({ year: 1992, month: 7, day: 23, hour: 4, minute: 30, ...DAEGU });

  it('비겁: 잠복 — 신(연지) 정기 경뿐, 천간 불투', () => {
    expect(r.godStates.비겁).toEqual({
      exposed: [],
      rooted: [{ branch: '신', pillar: '연지', layer: '정기', stem: '경', god: '비견', earth: null }],
      state: '잠복',
    });
  });

  it('식상: 투출유근 — 임(연간) + 신·자 뿌리 3', () => {
    expect(r.godStates.식상).toEqual({
      exposed: [{ position: '연간', stem: '임', god: '식신' }],
      rooted: [
        { branch: '신', pillar: '연지', layer: '중기', stem: '임', god: '식신', earth: null },
        { branch: '자', pillar: '일지', layer: '여기', stem: '임', god: '식신', earth: null },
        { branch: '자', pillar: '일지', layer: '정기', stem: '계', god: '상관', earth: null },
      ],
      state: '투출유근',
    });
  });

  it('재성: 잠복 — 천간 불투, 미(조토)·인 뿌리만', () => {
    expect(r.godStates.재성).toEqual({
      exposed: [],
      rooted: [
        { branch: '미', pillar: '월지', layer: '중기', stem: '을', god: '정재', earth: '조토' },
        { branch: '인', pillar: '시지', layer: '정기', stem: '갑', god: '편재', earth: null },
      ],
      state: '잠복',
    });
  });

  it('관성: 투출유근 — 정(월간) 정관 + 미(조토)·인 뿌리, 편관은 지장간 잠복', () => {
    expect(r.godStates.관성).toEqual({
      exposed: [{ position: '월간', stem: '정', god: '정관' }],
      rooted: [
        { branch: '미', pillar: '월지', layer: '여기', stem: '정', god: '정관', earth: '조토' },
        { branch: '인', pillar: '시지', layer: '중기', stem: '병', god: '편관', earth: null },
      ],
      state: '투출유근',
    });
  });

  it('인성: 투출유근 — 무(시간) + 신·미(조토)·인 뿌리 3', () => {
    expect(r.godStates.인성).toEqual({
      exposed: [{ position: '시간', stem: '무', god: '편인' }],
      rooted: [
        { branch: '신', pillar: '연지', layer: '여기', stem: '무', god: '편인', earth: null },
        { branch: '미', pillar: '월지', layer: '정기', stem: '기', god: '정인', earth: '조토' },
        { branch: '인', pillar: '시지', layer: '여기', stem: '무', god: '편인', earth: null },
      ],
      state: '투출유근',
    });
  });
});

describe('godStates - 카논 2 무·잠복 (1990-02-13 14:30 대구 → 경오 무인 기유 신미, 일간 기토)', () => {
  const r = correctPillars({ year: 1990, month: 2, day: 13, hour: 14, minute: 30, ...DAEGU });

  it('명식 확인', () => {
    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '경오', '무인', '기유', '신미',
    ]);
  });

  it('재성: 무 — 수가 지장간까지 완전 부재', () => {
    expect(r.godStates.재성).toEqual({ exposed: [], rooted: [], state: '무' });
  });

  it('관성: 잠복 — 인(월지) 정관 정기 + 미(시지) 편관 중기(조토)', () => {
    expect(r.godStates.관성).toEqual({
      exposed: [],
      rooted: [
        { branch: '인', pillar: '월지', layer: '정기', stem: '갑', god: '정관', earth: null },
        { branch: '미', pillar: '시지', layer: '중기', stem: '을', god: '편관', earth: '조토' },
      ],
      state: '잠복',
    });
  });

  it('인성: 잠복 — 오 2 + 인·미(조토) 뿌리 4', () => {
    expect(r.godStates.인성).toEqual({
      exposed: [],
      rooted: [
        { branch: '오', pillar: '연지', layer: '여기', stem: '병', god: '정인', earth: null },
        { branch: '오', pillar: '연지', layer: '정기', stem: '정', god: '편인', earth: null },
        { branch: '인', pillar: '월지', layer: '중기', stem: '병', god: '정인', earth: null },
        { branch: '미', pillar: '시지', layer: '여기', stem: '정', god: '편인', earth: '조토' },
      ],
      state: '잠복',
    });
  });

  it('비겁·식상: 투출유근', () => {
    expect(r.godStates.비겁.state).toBe('투출유근');
    expect(r.godStates.비겁.exposed).toEqual([{ position: '월간', stem: '무', god: '겁재' }]);
    expect(r.godStates.식상.state).toBe('투출유근');
    expect(r.godStates.식상.exposed).toEqual([
      { position: '연간', stem: '경', god: '상관' },
      { position: '시간', stem: '신', god: '식신' },
    ]);
  });
});

describe('godStates - 투출무근 (엔진 탐색으로 고정한 실제 명식)', () => {
  // 병화 일간, 갑목 편인이 시간에 떴으나 지지 축·자·신·오 지장간 어디에도 목이 없다(허부).
  const r = correctPillars({ year: 1950, month: 1, day: 1, hour: 12, minute: 30, ...DAEGU });

  it('1950-01-01 12:30 대구 → 기축 병자 병신 갑오, 인성 투출무근', () => {
    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '기축', '병자', '병신', '갑오',
    ]);
    expect(r.godStates.인성).toEqual({
      exposed: [{ position: '시간', stem: '갑', god: '편인' }],
      rooted: [],
      state: '투출무근',
    });
  });

  it('왕지 2엔트리: 비겁 rooted는 오(시지) 병·정 2개, strength.roots는 오(시지) 1개', () => {
    expect(r.godStates.비겁.rooted).toEqual([
      { branch: '오', pillar: '시지', layer: '여기', stem: '병', god: '비견', earth: null },
      { branch: '오', pillar: '시지', layer: '정기', stem: '정', god: '겁재', earth: null },
    ]);
    expect(r.strength.factors.roots).toHaveLength(1);
  });
});

describe('godStates - 교차 불변식 (비겁 rooted ↔ strength.roots, (pillar, branch) 집합 비교)', () => {
  // 두 모듈이 같은 사실(일간 오행의 통근)을 각자 계산하므로 반드시 일치해야 한다.
  // 엔트리 수 비교 금지: 왕지(자·오 등)는 godStates 2엔트리 ↔ strength 1엔트리가 정상.
  const cases: [string, Parameters<typeof correctPillars>[0]][] = [
    ['카논 1', { year: 1992, month: 7, day: 23, hour: 4, minute: 30, ...DAEGU }],
    ['카논 2', { year: 1990, month: 2, day: 13, hour: 14, minute: 30, ...DAEGU }],
    ['투출무근', { year: 1950, month: 1, day: 1, hour: 12, minute: 30, ...DAEGU }],
    ['태강(중복 지지)', { year: 1950, month: 1, day: 23, hour: 12, minute: 30, ...DAEGU }],
    ['태약(무근)', { year: 1950, month: 1, day: 10, hour: 10, minute: 30, ...DAEGU }],
  ];

  it.each(cases)('%s', (_label, input) => {
    const r = correctPillars(input);
    expect(pairSet(r.godStates.비겁.rooted)).toEqual(pairSet(r.strength.factors.roots));
  });
});

describe('godStates - 시간 모름 (시주 제외)', () => {
  const r = correctPillars({ year: 1992, month: 7, day: 23, ...DAEGU });

  it('시간·시지 엔트리가 어디에도 없다', () => {
    expect(r.timeUnknown).toBe(true);
    for (const g of ['비겁', '식상', '재성', '관성', '인성'] as const) {
      expect(r.godStates[g].exposed.every((e) => e.position !== '시간')).toBe(true);
      expect(r.godStates[g].rooted.every((e) => e.pillar !== '시지')).toBe(true);
    }
  });

  it('인성은 투출(시간 무)이 빠져 잠복이 된다', () => {
    expect(r.godStates.인성.state).toBe('잠복');
    expect(r.godStates.인성.exposed).toEqual([]);
  });
});
