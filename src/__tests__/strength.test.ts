/**
 * 신강/신약 판정 검증 — docs/specs/strength-spec.md 검증 절.
 * 카논 명식 1건 + 엔진 일시 탐색으로 고정한 극단 명식 3건(태강·태약·중화).
 * 극단 명식은 어느 학파로 계산해도 같은 답이 나오는 구조로 고른다(각 케이스 주석 참조).
 */

import { correctPillars } from '../correction/correct-pillars';
import { computeStrength } from '../correction/strength';
import { computeRelations } from '../correction/relations';

const DAEGU = { timezone: 'Asia/Seoul', longitude: 128.6014, latitude: 35.8714 };

describe('strength - 카논 (1992-07-23 04:30 대구 → 임신 정미 경자 무인)', () => {
  const r = correctPillars({ year: 1992, month: 7, day: 23, hour: 4, minute: 30, ...DAEGU });

  it('라벨 중화신강, favorable 식상·재성·관성', () => {
    expect(r.strength.label).toBe('중화신강');
    expect(r.strength.favorable).toBe('식상·재성·관성');
  });

  it('득령 O(미토 정인) · 득지 X(자수 상관) · 통근 신(건록 가중)', () => {
    expect(r.strength.factors.deukryeong).toBe(true);
    expect(r.strength.factors.deukji).toBe(false);
    expect(r.strength.factors.roots).toEqual([{ branch: '신', stage: '건록', boosted: true }]);
  });

  it('감점: 정임합(합반) · 인신충 — relations 출력 순서 그대로', () => {
    expect(r.strength.factors.damages).toEqual([
      { kind: '합반', targets: ['정', '임'] },
      { kind: '충', targets: ['인', '신'] },
    ]);
  });

  it('점수: 아군 63 / 적군 46 (v1 가중치 측정값 고정, ratio 0.578)', () => {
    expect(r.strength.score.support).toBe(63);
    expect(r.strength.score.drain).toBe(46);
    expect(r.strength.score.ratio).toBeCloseTo(63 / 109, 10);
  });

  it('조후: 여름·조열, 미=조토 (강약 점수에 미합산, 별도 필드)', () => {
    expect(r.strength.johu).toEqual({ season: '여름', label: '조열', earthFlags: ['미=조토'] });
  });

  it('strength는 gender와 무관하게 같다 (대운과 독립)', () => {
    const withGender = correctPillars({
      year: 1992, month: 7, day: 23, hour: 4, minute: 30, gender: 'male', ...DAEGU,
    });
    expect(withGender.strength).toEqual(r.strength);
  });
});

describe('strength - 극단 케이스 (엔진 탐색으로 고정한 실제 명식)', () => {
  // 무토 일간, 7자 전부 화·토(비겁·인성 7/7) + 오화 제왕 통근 2개 + 합·충 감점 없음.
  // 적군 오행이 천간·지지 표면에 하나도 없어 어느 학파로도 신강 극단 판정에 이견이 없다.
  it('태강: 1950-01-23 12:30 대구 → 기축 정축 무오 무오', () => {
    const r = correctPillars({ year: 1950, month: 1, day: 23, hour: 12, minute: 30, ...DAEGU });
    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '기축', '정축', '무오', '무오',
    ]);
    expect(r.strength.label).toBe('태강');
    expect(r.strength.score.ratio).toBeGreaterThanOrEqual(0.8);
    expect(r.strength.factors.roots.filter((x) => x.boosted)).toHaveLength(2);
    expect(r.strength.factors.damages).toEqual([]);
    expect(r.strength.favorable).toBe('식상·재성·관성');
  });

  // 을목 일간, 축·사 지장간 어디에도 목이 없어 통근 0(무근) + 표면 7자 아군 0
  // (재성 4·식상 2·관성 1). 뿌리도 인비도 없는 구조라 어느 학파로도 극약 판정에 이견이 없다.
  it('태약: 1950-01-10 10:30 대구 → 기축 정축 을사 신사', () => {
    const r = correctPillars({ year: 1950, month: 1, day: 10, hour: 10, minute: 30, ...DAEGU });
    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '기축', '정축', '을사', '신사',
    ]);
    expect(r.strength.label).toBe('태약');
    expect(r.strength.score.ratio).toBeLessThanOrEqual(0.2);
    expect(r.strength.factors.roots).toEqual([]);
    expect(r.strength.factors.deukryeong).toBe(false);
    expect(r.strength.favorable).toBe('인성·비겁');
  });

  // 갑목 일간. 아군: 계수 정인 + 인목 비견 2개(건록 통근 2) / 적군: 경·신·유 관살 3 + 무토 재.
  // 감점도 무계합(재·인)·인신충(비견·관)이 양편을 같이 깎아 상쇄된다. 강약 근거가 정면
  // 대치하는 균형 구조라 어느 학파로도 극단(신강·신약) 판정이 나올 수 없다.
  it('중화: 1950-02-18 18:30 대구 → 경인 무인 갑신 계유', () => {
    const r = correctPillars({ year: 1950, month: 2, day: 18, hour: 18, minute: 30, ...DAEGU });
    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '경인', '무인', '갑신', '계유',
    ]);
    expect(r.strength.label).toBe('중화');
    expect(r.strength.score.ratio).toBeCloseTo(0.502, 2);
    expect(r.strength.factors.damages).toEqual([
      { kind: '합반', targets: ['무', '계'] },
      { kind: '충', targets: ['인', '신'] },
      { kind: '충', targets: ['인', '신'] },
    ]);
    expect(r.strength.favorable).toBeNull();
  });
});

describe('computeStrength - 무근 게이트 (통근이 척추)', () => {
  // 갑목 일간, 천간 인성 3(임·계·임) + 자수 정인 2로 ratio는 신강 계열(0.60)이지만
  // 자·축·신 지장간 어디에도 목이 없어 통근 0 → 라벨 상한 중화, favorable null.
  it('인성이 많아도 통근 0이면 라벨은 중화를 넘지 못한다', () => {
    const pillars = ['임자', '계축', '갑자', '임신'] as const;
    const s = computeStrength(...pillars, computeRelations(...pillars));
    expect(s.factors.roots).toEqual([]);
    expect(s.score.ratio).toBeGreaterThanOrEqual(0.56);
    expect(s.label).toBe('중화');
    expect(s.favorable).toBeNull();
  });
});
