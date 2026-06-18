/**
 * 절기 경계 월주·연주 보정 래퍼 검증.
 *
 * 기준 절기: 입춘 2024 = 2024-02-04 17:27 KST (= 08:27 UTC). solar-terms-precise.json.
 */

import { correctPillars } from '../correction/correct-pillars';
import { calculateSaju } from '../core/saju';

describe('correctPillars - 절기 경계 보정', () => {
  // 1) 경계 정확성: 같은 날·같은 도시라도 절입 전/후로 월주가 갈려야 한다.
  //    (엔진 단독은 절입 당일을 일 단위로만 봐서 구분하지 못함)
  it('절입 직전/직후로 월주가 갈린다 (입춘 2024)', () => {
    const before = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, timezone: 'Asia/Seoul' });
    const after = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, timezone: 'Asia/Seoul' });

    expect(before.monthPillar).toBe('을축'); // 입춘 전 → 축월
    expect(after.monthPillar).toBe('병인'); // 입춘 후 → 인월
    expect(before.monthPillar).not.toBe(after.monthPillar);
  });

  // 2) 입춘 연주: 입춘 절입 전 출생은 연주까지 전년으로 되돌려진다.
  it('입춘 절입 전이면 연주가 전년으로 되돌려진다', () => {
    const before = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, timezone: 'Asia/Seoul' });
    const after = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, timezone: 'Asia/Seoul' });

    expect(before.yearPillar).toBe('계묘'); // 2023년 간지 (전년)
    expect(after.yearPillar).toBe('갑진'); // 2024년 간지
  });

  // 3) 비경계 무변화: 절기 당일이 아닌 평범한 출생은 엔진 출력과 100% 동일.
  it('비경계 출생은 엔진 출력과 4주 모두 동일하다', () => {
    const result = correctPillars({ year: 2024, month: 6, day: 20, hour: 10, minute: 30, timezone: 'Asia/Seoul' });
    const engine = calculateSaju(2024, 6, 20, 10, 30);

    expect(result.yearPillar).toBe(engine.yearPillar);
    expect(result.monthPillar).toBe(engine.monthPillar);
    expect(result.dayPillar).toBe(engine.dayPillar);
    expect(result.hourPillar).toBe(engine.hourPillar);
  });

  // 4) 시간대: UTC 순간이 같으면 도시가 달라도 연·월주가 같고,
  //    벽시계가 같아도 시차로 절기 경계를 넘으면 월주가 달라진다.
  describe('시간대(IANA) 처리', () => {
    it('동일 UTC 순간은 도시가 달라도 연·월주가 같다', () => {
      // 입춘 직후 08:28 UTC = 서울 17:28 = 마닐라(UTC+8) 16:28
      const seoul = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, timezone: 'Asia/Seoul' });
      const manila = correctPillars({ year: 2024, month: 2, day: 4, hour: 16, minute: 28, timezone: 'Asia/Manila' });

      expect(seoul.yearPillar).toBe(manila.yearPillar);
      expect(seoul.monthPillar).toBe(manila.monthPillar);
      expect(manila.monthPillar).toBe('병인'); // 둘 다 입춘 후
    });

    it('벽시계가 같아도 시차로 절기 경계를 넘으면 월주가 달라진다', () => {
      // 같은 "2024-02-04 17:00" 이지만 서울은 입춘 전(08:00 UTC), 마닐라는 입춘 후(09:00 UTC)
      const seoul = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 0, timezone: 'Asia/Seoul' });
      const manila = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 0, timezone: 'Asia/Manila' });

      expect(seoul.monthPillar).toBe('을축'); // 입춘 전
      expect(manila.monthPillar).toBe('병인'); // 입춘 후
      expect(seoul.monthPillar).not.toBe(manila.monthPillar);
    });
  });

  // 5) 일주·시주 불변: 월주/연주가 보정되어도 일주·시주는 엔진 값 그대로.
  it('보정이 일어나도 일주·시주는 엔진 값과 동일하다', () => {
    const result = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, timezone: 'Asia/Seoul' });
    const engine = calculateSaju(2024, 2, 4, 17, 26);

    // 월주·연주는 보정되었음을 먼저 확인
    expect(result.monthPillar).not.toBe(engine.monthPillar);
    // 일주·시주는 불변
    expect(result.dayPillar).toBe(engine.dayPillar);
    expect(result.dayPillarHanja).toBe(engine.dayPillarHanja);
    expect(result.hourPillar).toBe(engine.hourPillar);
    expect(result.hourPillarHanja).toBe(engine.hourPillarHanja);
  });
});
