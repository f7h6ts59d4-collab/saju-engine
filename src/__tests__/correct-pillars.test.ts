/**
 * 절기 경계 월주·연주 보정 래퍼 검증.
 *
 * 기준 절기: 입춘 2024 = 2024-02-04 17:27 KST (= 08:27 UTC). solar-terms-precise.json.
 *
 * 주의: jest는 `moduleNameMapper`로 `date-index`를 `date-index-compressed`로 돌려서,
 * 배포(dist)와 동일한 절기 기준(compressed) 엔진을 검증한다. 즉 여기서 비교하는
 * `calculateSaju`는 빌드 전 음력 기준 원본(L1)이 아니라 배포 동작(L2)이다.
 */

import { correctPillars } from '../correction/correct-pillars';
import { calculateSaju } from '../core/saju';

describe('correctPillars - 절기 경계 보정', () => {
  // 0) 레이어 가드: jest가 보는 엔진(= 배포 compressed)이 '절기 기준'임을 고정한다.
  //    월주가 입춘(2/4)에 전환되고, 음력 1일(설날 2/10)에는 바뀌지 않아야 한다.
  //    (원본 음력 데이터로 회귀하면 2/10에 전환되어 이 테스트가 깨진다.)
  it('배포 엔진(compressed)은 절기 기준이다 — 입춘에 전환, 설날엔 불변', () => {
    const feb03 = calculateSaju(2024, 2, 3, 12, 0, { applyTimeCorrection: false }).monthPillar;
    const feb04 = calculateSaju(2024, 2, 4, 12, 0, { applyTimeCorrection: false }).monthPillar;
    const feb10 = calculateSaju(2024, 2, 10, 12, 0, { applyTimeCorrection: false }).monthPillar;

    expect(feb04).not.toBe(feb03); // 입춘(2/4)에 월주 전환
    expect(feb10).toBe(feb04); // 설날=음력 1/1(2/10)에는 불변
    expect(feb04).toBe('병인'); // 입춘 후 = 인월
  });

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
