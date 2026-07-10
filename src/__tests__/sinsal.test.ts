/**
 * 신살(神殺) 판정 검증 — docs/specs/sinsal-spec.md 5절의 명식별 기대값과 대조한다.
 *
 * 기대값은 수기 산출이라 일부 오류가 있을 수 있다(명세 자체 주석). 규칙표(명세 1·2절)를
 * 그대로 적용한 결과가 5절 기대값과 어긋나는 칸은 아래 각 테스트 주석에 [기대값과 상이]로
 * 표시했다. 이 테스트는 규칙표 적용 결과를 기준으로 고정한다(기대값 문서는 수정하지 않음).
 *
 * stars 배열 순서는 명세 2절 표 순서(천을→…→홍염→현침→괴강→백호→귀문→글자그룹)로
 * 결정적이다.
 */

import { computeSinsal } from '../correction/sinsal';
import { correctPillars } from '../correction/correct-pillars';

describe('computeSinsal - 12신살 (월·일·시지=연지 삼합, 연지=일지 삼합)', () => {
  it('경(임신·정미·경자·무인): 연 지살·월 천살·일 장성살·시 역마살', () => {
    const r = computeSinsal('임신', '정미', '경자', '무인');

    expect(r.twelve).toEqual({ year: '지살', month: '천살', day: '장성살', hour: '역마살' });
  });

  // 연지 판정만 일지(유→사유축) 삼합 기준이라 년살이 나온다(연지 삼합 기준이면 장성살).
  it('기(경오·무인·기유·신미): 연 년살(일지 기준)·월 지살·일 육해살·시 반안살', () => {
    const r = computeSinsal('경오', '무인', '기유', '신미');

    expect(r.twelve).toEqual({ year: '년살', month: '지살', day: '육해살', hour: '반안살' });
  });

  // 아래 3개 명식의 12신살은 명세 5절에 없음 — 규칙표(1절) 산출값으로 고정.
  it('계(기사·임신·계축·신유): 연 지살·월 망신살·일 화개살·시 장성살', () => {
    const r = computeSinsal('기사', '임신', '계축', '신유');

    expect(r.twelve).toEqual({ year: '지살', month: '망신살', day: '화개살', hour: '장성살' });
  });

  it('신(기사·병자·신유·무술): 연 지살·월 육해살·일 장성살·시 반안살', () => {
    const r = computeSinsal('기사', '병자', '신유', '무술');

    expect(r.twelve).toEqual({ year: '지살', month: '육해살', day: '장성살', hour: '반안살' });
  });

  it('임(무진·갑인·임자·무신): 연 화개살·월 역마살·일 장성살·시 지살', () => {
    const r = computeSinsal('무진', '갑인', '임자', '무신');

    expect(r.twelve).toEqual({ year: '화개살', month: '역마살', day: '장성살', hour: '지살' });
  });
});

describe('computeSinsal - stars (명세 5절 명식 대조)', () => {
  // [기대값과 상이] 명세 5절은 "역마(시지 인)"·"화개 미해당"이라 하지만, 글자그룹 규칙표로는
  // 연지 신(申)도 역마(인신사해)에 해당하고 월지 미(未)는 화개(진술축미)에 해당한다.
  it('경(임신·정미·경자·무인)', () => {
    const r = computeSinsal('임신', '정미', '경자', '무인');

    expect(r.stars).toEqual([
      { name: '천을귀인', positions: ['월주'] },
      { name: '관귀학관', positions: ['시주'] },
      { name: '태극귀인', positions: ['시주'] },
      { name: '정록', positions: ['연주'] },
      { name: '홍염살', positions: ['연주'] },
      { name: '현침살', positions: ['연주', '월주'] }, // 연지 申·월지 未
      { name: '도화살', positions: ['일주'] },
      { name: '역마살', positions: ['연주', '시주'] },
      { name: '화개살', positions: ['월주'] },
    ]);
  });

  // [기대값과 상이] 명세 5절 "현침(시·연)": 시주 신미(辛未)는 천간·지지가 모두 현침이라
  // 겹침 허용 원칙대로 시주가 2회 표기된다.
  it('기(경오·무인·기유·신미)', () => {
    const r = computeSinsal('경오', '무인', '기유', '신미');

    expect(r.stars).toEqual([
      { name: '문창귀인', positions: ['일주'] },
      { name: '학당귀인', positions: ['일주'] },
      { name: '태극귀인', positions: ['시주'] },
      { name: '정록', positions: ['연주'] },
      { name: '암록', positions: ['시주'] },
      { name: '양인살', positions: ['시주'] },
      { name: '현침살', positions: ['연주', '시주', '시주'] }, // 연지 午·시간 辛·시지 未
      { name: '도화살', positions: ['연주', '일주'] },
      { name: '역마살', positions: ['월주'] },
      { name: '화개살', positions: ['시주'] },
    ]);
  });

  // [기대값과 상이] 문곡귀인(계→유, 시지 유 성립)이 명세 5절 목록에는 없음.
  // 귀문은 명세 5절 스스로 의심("신유 인접 아님…")한 대로 규칙표상 성립 쌍이 없어 미표기.
  it('계(기사·임신·계축·신유)', () => {
    const r = computeSinsal('기사', '임신', '계축', '신유');

    expect(r.stars).toEqual([
      { name: '천을귀인', positions: ['연주'] },
      { name: '문곡귀인', positions: ['시주'] },
      { name: '관귀학관', positions: ['월주'] },
      { name: '태극귀인', positions: ['연주', '월주'] },
      { name: '암록', positions: ['일주'] },
      { name: '양인살', positions: ['일주'] },
      { name: '홍염살', positions: ['월주'] },
      { name: '현침살', positions: ['월주', '시주'] }, // 월지 申·시간 辛
      { name: '백호대살', positions: ['일주'] },
      { name: '도화살', positions: ['시주'] },
      { name: '역마살', positions: ['연주', '월주'] },
      { name: '화개살', positions: ['일주'] },
    ]);
  });

  // [기대값과 상이] 문창귀인(신→자)·학당귀인(신→자)이 월지 자에, 양인살(신→술)이
  // 시지 술에 성립하지만 명세 5절 목록에는 없음.
  it('신(기사·병자·신유·무술)', () => {
    const r = computeSinsal('기사', '병자', '신유', '무술');

    expect(r.stars).toEqual([
      { name: '문창귀인', positions: ['월주'] },
      { name: '학당귀인', positions: ['월주'] },
      { name: '정록', positions: ['일주'] },
      { name: '양인살', positions: ['시주'] },
      { name: '홍염살', positions: ['일주'] },
      { name: '현침살', positions: ['일주'] }, // 일간 辛
      { name: '괴강', positions: ['시주'] },
      { name: '귀문관살', positions: ['월주', '일주'] }, // 월지 자 - 일지 유 (인접)
      { name: '도화살', positions: ['월주', '일주'] },
      { name: '역마살', positions: ['연주'] },
      { name: '화개살', positions: ['시주'] },
    ]);
  });

  // 홍염살 임→자·신(지지 2개)이 일주·시주 둘 다 성립하는 명식.
  // [기대값과 상이] 문창귀인(임→인)·학당귀인(임→인, 관측표)·암록(임→인)이 월지 인에,
  // 양인살(임→자)이 일지 자에, 백호대살(무진)이 연주에 성립하지만 명세 5절 목록에는 없음.
  it('임(무진·갑인·임자·무신)', () => {
    const r = computeSinsal('무진', '갑인', '임자', '무신');

    expect(r.stars).toEqual([
      { name: '문창귀인', positions: ['월주'] },
      { name: '문곡귀인', positions: ['시주'] },
      { name: '학당귀인', positions: ['월주'] },
      { name: '관귀학관', positions: ['시주'] },
      { name: '태극귀인', positions: ['시주'] },
      { name: '암록', positions: ['월주'] },
      { name: '양인살', positions: ['일주'] },
      { name: '홍염살', positions: ['일주', '시주'] },
      { name: '현침살', positions: ['월주', '시주'] }, // 월간 甲·시지 申
      { name: '백호대살', positions: ['연주'] },
      { name: '도화살', positions: ['일주'] },
      { name: '역마살', positions: ['월주', '시주'] },
      { name: '화개살', positions: ['연주'] },
    ]);
  });
});

describe('computeSinsal - 시간 모름 (hourPillar = null)', () => {
  it('twelve.hour는 null, stars에서 시주 성립이 빠진다', () => {
    const r = computeSinsal('임신', '정미', '경자', null);

    expect(r.twelve).toEqual({ year: '지살', month: '천살', day: '장성살', hour: null });
    // 시주에서만 성립하던 관귀학관·태극귀인이 빠지고, 역마살은 연주만 남는다.
    expect(r.stars).toEqual([
      { name: '천을귀인', positions: ['월주'] },
      { name: '정록', positions: ['연주'] },
      { name: '홍염살', positions: ['연주'] },
      { name: '현침살', positions: ['연주', '월주'] },
      { name: '도화살', positions: ['일주'] },
      { name: '역마살', positions: ['연주'] },
      { name: '화개살', positions: ['월주'] },
    ]);
  });
});

describe('correctPillars - 신살 조립', () => {
  const SEOUL = { timezone: 'Asia/Seoul', longitude: 126.98, latitude: 37.57 };

  // 카논 차트: 1992-07-23 04:00 서울 → 임신·정미·경자·무인 (명세 5절 '경' 명식).
  it('임신·정미·경자·무인 → computeSinsal 결과와 동일하게 조립된다', () => {
    const r = correctPillars({ year: 1992, month: 7, day: 23, hour: 4, minute: 0, ...SEOUL });

    expect([r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar]).toEqual([
      '임신', '정미', '경자', '무인',
    ]);
    expect(r.sinsal).toEqual(computeSinsal('임신', '정미', '경자', '무인'));
    expect(r.sinsal.twelve).toEqual({ year: '지살', month: '천살', day: '장성살', hour: '역마살' });
  });

  it('시간 모름이면 twelve.hour는 null, stars에 시주 position이 없다', () => {
    const r = correctPillars({ year: 1992, month: 7, day: 23, ...SEOUL });

    expect(r.timeUnknown).toBe(true);
    expect(r.sinsal.twelve.hour).toBeNull();
    expect(r.sinsal.stars.some((s) => s.positions.includes('시주'))).toBe(false);
    // 시주 외 판정은 정상.
    expect(r.sinsal.twelve.year).toBe('지살');
  });
});
