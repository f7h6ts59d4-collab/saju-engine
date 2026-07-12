/**
 * 합충형파해(合沖刑破害)·공망 판정 검증 — docs/specs/relations-spec.md 검증 절의
 * 명식 P·Q·R 기대값과 대조한다.
 *
 * relations 배열 순서는 결정적: 타입은 명세 출력 타입 나열 순서
 * (천간합→천간충→육합→삼합→삼합반합→방합→방합반합→충→삼형→상형→자형→파→해→원진),
 * 같은 타입 안에서는 규칙표 행 → 기둥 쌍(연월·연일·연시·월일·월시·일시) 순서.
 */

import { computeRelations, computeGongmang } from '../correction/relations';
import { correctPillars } from '../correction/correct-pillars';

describe('computeRelations - 명식 P (임신·정미·경자·무인)', () => {
  // 인(시)·신(연)으로 인사신 삼형 중 2개가 갖춰졌지만 부분형은 제외 → 형 없음.
  it('정임합·임무충·신자반합·인신충·자미해·자미원진, 형·파·육합·방합 없음', () => {
    const r = computeRelations('임신', '정미', '경자', '무인');

    expect(r).toEqual([
      { type: '천간합', name: '정임합', element: '목', positions: ['연주', '월주'], adjacent: true },
      { type: '천간충', name: '임무충', positions: ['연주', '시주'], adjacent: false },
      { type: '삼합반합', name: '신자반합', element: '수', positions: ['연주', '일주'], adjacent: false },
      { type: '충', name: '인신충', positions: ['연주', '시주'], adjacent: false },
      { type: '해', name: '자미해', positions: ['월주', '일주'], adjacent: true },
      { type: '원진', name: '자미원진', positions: ['월주', '일주'], adjacent: true },
    ]);
  });
});

describe('computeRelations - 명식 Q (경진·경진·계해·갑인)', () => {
  // 진이 연·월에 2개라 인진반합(방합 부분)·갑경충·진해원진이 각 2건씩 별도 표기(겹침 허용).
  // 인해는 육합 + 파 둘 다 표기.
  // [기대값과 상이] 명세 검증 절은 갑경충·인진반합의 [월주,시주]를 adjacent=true라 하지만,
  // 명세 설계 원칙 스스로 "원격 = 연일·연시·월시"로 월시를 원격으로 정의한다(수기 오류로
  // 판단). 규칙 적용 결과(false)를 기준으로 고정한다.
  it('갑경충 2건·인해합·인진반합 2건·진진자형·인해파·진해원진 2건', () => {
    const r = computeRelations('경진', '경진', '계해', '갑인');

    expect(r).toEqual([
      { type: '천간충', name: '갑경충', positions: ['연주', '시주'], adjacent: false },
      { type: '천간충', name: '갑경충', positions: ['월주', '시주'], adjacent: false },
      { type: '육합', name: '인해합', element: '목', positions: ['일주', '시주'], adjacent: true },
      { type: '방합반합', name: '인진반합', element: '목', positions: ['연주', '시주'], adjacent: false },
      { type: '방합반합', name: '인진반합', element: '목', positions: ['월주', '시주'], adjacent: false },
      { type: '자형', name: '진진자형', positions: ['연주', '월주'], adjacent: true },
      { type: '파', name: '인해파', positions: ['일주', '시주'], adjacent: true },
      { type: '원진', name: '진해원진', positions: ['연주', '일주'], adjacent: false },
      { type: '원진', name: '진해원진', positions: ['월주', '일주'], adjacent: true },
    ]);
  });
});

describe('computeRelations - 형 성립 경계 (P·Q에 없는 경로)', () => {
  it('인사신 3지지가 전부 있으면 삼형이 성립한다', () => {
    const r = computeRelations('갑인', '기사', '임신', '임자');

    expect(r).toContainEqual({
      type: '삼형', name: '인사신삼형', positions: ['연주', '월주', '일주'], adjacent: true,
    });
  });

  it('자묘가 있으면 상형이 성립한다', () => {
    const r = computeRelations('갑자', '정묘', '경자', '무인');

    expect(r).toContainEqual({
      type: '상형', name: '자묘상형', positions: ['연주', '월주'], adjacent: true,
    });
  });
});

describe('computeGongmang - 명식 P·Q (히트 없음)', () => {
  it('P: 경자 일주 = 갑오순 → 진·사 공망, 신미인 지지에 히트 없음', () => {
    expect(computeGongmang('임신', '정미', '경자', '무인')).toEqual({
      branches: ['진', '사'],
      positions: [],
    });
  });

  it('Q: 계해 일주 = 갑인순 → 자·축 공망, 진진인 지지에 히트 없음', () => {
    expect(computeGongmang('경진', '경진', '계해', '갑인')).toEqual({
      branches: ['자', '축'],
      positions: [],
    });
  });
});

describe('correctPillars - 합충형파해·공망 조립 (명식 R)', () => {
  const SEOUL = { timezone: 'Asia/Seoul', longitude: 126.98, latitude: 37.57 };
  // 명식 R: 1990-02-14 06:30 서울 → 경오·무인·경술·기묘 (공망 검증용).
  const CHART = { year: 1990, month: 2, day: 14, hour: 6, minute: 30, ...SEOUL };

  it('공망: 경술 일주 = 갑진순 → 인·묘, 월지 인·시지 묘 히트', () => {
    const r = correctPillars(CHART);

    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '경오', '무인', '경술', '기묘',
    ]);
    expect(r.gongmang).toEqual({ branches: ['인', '묘'], positions: ['월주', '시주'] });
  });

  // 인오술 3지지가 전부 있어 완전 삼합이 성립하는 명식 — full 삼합 경로 검증.
  it('relations: 묘술합·인오술삼합·인묘반합·묘오파', () => {
    const r = correctPillars(CHART);

    expect(r.relations).toEqual(computeRelations('경오', '무인', '경술', '기묘'));
    expect(r.relations).toEqual([
      { type: '육합', name: '묘술합', element: '화', positions: ['일주', '시주'], adjacent: true },
      { type: '삼합', name: '인오술삼합', element: '화', positions: ['연주', '월주', '일주'], adjacent: true },
      { type: '방합반합', name: '인묘반합', element: '목', positions: ['월주', '시주'], adjacent: false },
      { type: '파', name: '묘오파', positions: ['연주', '시주'], adjacent: false },
    ]);
  });

  it('시간 모름이면 시주 관계가 빠지고 공망 positions에도 시주가 없다', () => {
    const r = correctPillars({ year: 1990, month: 2, day: 14, ...SEOUL });

    expect(r.timeUnknown).toBe(true);
    // 시주(묘)가 빠지면 묘술합·인묘반합·묘오파가 사라지고 인오술삼합만 남는다.
    expect(r.relations).toEqual([
      { type: '삼합', name: '인오술삼합', element: '화', positions: ['연주', '월주', '일주'], adjacent: true },
    ]);
    expect(r.gongmang).toEqual({ branches: ['인', '묘'], positions: ['월주'] });
  });
});
