/**
 * 12운성(十二運星) 판정 검증 — docs/specs/twelve-stages-spec.md 검증 절의
 * 명식별 기대값과 대조한다. 원국 5명식 20셀 + 대운(경 명식) 8사이클.
 */

import { lifeStage } from '../correction/twelve-stages';
import { correctPillars } from '../correction/correct-pillars';

describe('lifeStage - 원국 5명식 20셀 (명세 대조)', () => {
  it('경(임신·정미·경자·무인): 연 신=건록, 월 미=관대, 일 자=사, 시 인=절', () => {
    expect(lifeStage('경', '신')).toBe('건록');
    expect(lifeStage('경', '미')).toBe('관대');
    expect(lifeStage('경', '자')).toBe('사');
    expect(lifeStage('경', '인')).toBe('절');
  });

  it('기(경오·무인·기유·신미): 연 오=건록, 월 인=사, 일 유=장생, 시 미=관대', () => {
    expect(lifeStage('기', '오')).toBe('건록');
    expect(lifeStage('기', '인')).toBe('사');
    expect(lifeStage('기', '유')).toBe('장생');
    expect(lifeStage('기', '미')).toBe('관대');
  });

  it('계(기사·임신·계축·신유): 연 사=태, 월 신=사, 일 축=관대, 시 유=병', () => {
    expect(lifeStage('계', '사')).toBe('태');
    expect(lifeStage('계', '신')).toBe('사');
    expect(lifeStage('계', '축')).toBe('관대');
    expect(lifeStage('계', '유')).toBe('병');
  });

  it('갑(경오·신사·갑술·임신): 연 오=사, 월 사=병, 일 술=양, 시 신=절', () => {
    expect(lifeStage('갑', '오')).toBe('사');
    expect(lifeStage('갑', '사')).toBe('병');
    expect(lifeStage('갑', '술')).toBe('양');
    expect(lifeStage('갑', '신')).toBe('절');
  });

  it('을(경오·무인·을사·갑신): 연 오=장생, 월 인=제왕, 일 사=목욕, 시 신=태', () => {
    expect(lifeStage('을', '오')).toBe('장생');
    expect(lifeStage('을', '인')).toBe('제왕');
    expect(lifeStage('을', '사')).toBe('목욕');
    expect(lifeStage('을', '신')).toBe('태');
  });
});

describe('correctPillars - 원국 12운성 조립', () => {
  const SEOUL = { timezone: 'Asia/Seoul', longitude: 126.98, latitude: 37.57 };

  // 카논 차트: 1992-07-23 04:00 서울 → 임신·정미·경자·무인 (명세 '경' 명식).
  it('임신·정미·경자·무인 → 연 건록·월 관대·일 사·시 절', () => {
    const r = correctPillars({ year: 1992, month: 7, day: 23, hour: 4, minute: 0, ...SEOUL });

    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '임신', '정미', '경자', '무인',
    ]);
    expect(r.twelveStages).toEqual({ year: '건록', month: '관대', day: '사', hour: '절' });
  });

  it('시간 모름이면 twelveStages.hour는 null, 나머지 판정은 정상', () => {
    const r = correctPillars({ year: 1992, month: 7, day: 23, ...SEOUL });

    expect(r.timeUnknown).toBe(true);
    expect(r.twelveStages).toEqual({ year: '건록', month: '관대', day: '사', hour: null });
  });
});

describe('correctPillars - 대운 12운성 (경 명식, 일간 경)', () => {
  const DAEGU = { timezone: 'Asia/Seoul', longitude: 128.6, latitude: 35.87 };
  // 검증 명식: 대구 1992-07-23 05:20, 남성 → 임신·정미·경자·무인, 일간 경금.
  const CHART = { year: 1992, month: 7, day: 23, hour: 5, minute: 20, ...DAEGU };

  it('5세 무신=건록, 15세 기유=제왕 … 65세 갑인=절, 75세 을묘=태', () => {
    const r = correctPillars({ ...CHART, gender: 'male' as const });
    const first8 = r.majorLuck!.cycles.slice(0, 8);

    expect(first8.map((c) => [c.startAge, c.pillar, c.lifeStage])).toEqual([
      [5, '무신', '건록'], [15, '기유', '제왕'], [25, '경술', '쇠'], [35, '신해', '병'],
      [45, '임자', '사'], [55, '계축', '묘'], [65, '갑인', '절'], [75, '을묘', '태'],
    ]);
  });

  it('시간 모름이어도 성별이 있으면 대운 lifeStage는 그대로 산출된다', () => {
    const r = correctPillars({
      year: 1992, month: 7, day: 23, gender: 'male' as const, ...DAEGU,
    });

    expect(r.timeUnknown).toBe(true);
    expect(r.twelveStages.hour).toBeNull();
    expect(r.majorLuck!.cycles[0]).toMatchObject({ pillar: '무신', lifeStage: '건록' });
  });
});
