/**
 * 절기 경계 월주·연주 보정 래퍼 검증.
 *
 * 기준 절기: 입춘 2024 = 2024-02-04 17:27 KST (= 08:27 UTC). solar-terms-precise.json.
 *
 * 주의: jest는 `moduleNameMapper`로 `date-index`를 `date-index-compressed`로 돌려서,
 * 배포(dist)와 동일한 절기 기준(compressed) 엔진을 검증한다. 즉 여기서 비교하는
 * `calculateSaju`는 빌드 전 음력 기준 원본(L1)이 아니라 배포 동작(L2)이다.
 */

import { correctPillars, trueSolarParts } from '../correction/correct-pillars';
import { calculateSaju } from '../core/saju';
import { zonedDateTimeToUtc } from '../correction/timezone';

// 도시 대표 좌표(진태양시 일주·시주용). 시그니처에 longitude/latitude가 추가됨.
const SEOUL = { timezone: 'Asia/Seoul', longitude: 126.98, latitude: 37.57 };
const MANILA = { timezone: 'Asia/Manila', longitude: 120.98, latitude: 14.6 };
const NEWYORK = { timezone: 'America/New_York', longitude: -74.01, latitude: 40.71 };

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
    const before = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, ...SEOUL });
    const after = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, ...SEOUL });

    expect(before.monthPillar).toBe('을축'); // 입춘 전 → 축월
    expect(after.monthPillar).toBe('병인'); // 입춘 후 → 인월
    expect(before.monthPillar).not.toBe(after.monthPillar);
  });

  // 2) 입춘 연주: 입춘 절입 전 출생은 연주까지 전년으로 되돌려진다.
  it('입춘 절입 전이면 연주가 전년으로 되돌려진다', () => {
    const before = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 26, ...SEOUL });
    const after = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, ...SEOUL });

    expect(before.yearPillar).toBe('계묘'); // 2023년 간지 (전년)
    expect(after.yearPillar).toBe('갑진'); // 2024년 간지
  });

  // 3) 비경계 무변화: 절기 당일이 아닌 평범한 출생은 엔진 출력과 100% 동일.
  it('비경계 출생은 엔진 출력과 4주 모두 동일하다', () => {
    const result = correctPillars({ year: 2024, month: 6, day: 20, hour: 10, minute: 30, ...SEOUL });
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
      const seoul = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 28, ...SEOUL });
      const manila = correctPillars({ year: 2024, month: 2, day: 4, hour: 16, minute: 28, ...MANILA });

      expect(seoul.yearPillar).toBe(manila.yearPillar);
      expect(seoul.monthPillar).toBe(manila.monthPillar);
      expect(manila.monthPillar).toBe('병인'); // 둘 다 입춘 후
    });

    it('벽시계가 같아도 시차로 절기 경계를 넘으면 월주가 달라진다', () => {
      // 같은 "2024-02-04 17:00" 이지만 서울은 입춘 전(08:00 UTC), 마닐라는 입춘 후(09:00 UTC)
      const seoul = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 0, ...SEOUL });
      const manila = correctPillars({ year: 2024, month: 2, day: 4, hour: 17, minute: 0, ...MANILA });

      expect(seoul.monthPillar).toBe('을축'); // 입춘 전
      expect(manila.monthPillar).toBe('병인'); // 입춘 후
      expect(seoul.monthPillar).not.toBe(manila.monthPillar);
    });
  });
});

describe('correctPillars - 진태양시 일주·시주', () => {
  // 6) 도시에 따라 일주·시주가 같거나 갈리는 이유를 문서화한다.
  //    엔진 기본값(calculateSaju)은 위치와 무관하게 KST 경도보정(135-127, 약 -32분)을
  //    적용한다. correctPillars는 출생지 진태양시(경도+EoT)를 쓴다. 같은 입력(2024-02-04
  //    17:26)에서:
  //    - 서울: 진태양시 16:40(신시) ≈ 엔진 KST보정 16:54(신시) → 같은 시주 버킷 → 일치.
  //    - 뉴욕: 진태양시 17:16(유시)은 17:00 경계를 넘어 엔진 KST보정(신시)과 갈린다.
  //    즉 서울 한정으로 엔진값과 같았던 것이고, 자오선에서 먼 뉴욕에선 시주가 달라진다.
  it('일주·시주가 도시에 따라 같거나 갈린다 (서울=엔진, 뉴욕≠엔진)', () => {
    const t = { year: 2024, month: 2, day: 4, hour: 17, minute: 26 };
    const engine = calculateSaju(t.year, t.month, t.day, t.hour, t.minute); // 위치 무관 KST보정
    const seoul = correctPillars({ ...t, ...SEOUL });
    const ny = correctPillars({ ...t, ...NEWYORK });

    // 서울: 진태양시 ≈ KST보정 → 같은 시주 버킷(둘 다 신시 → 경신).
    expect(seoul.hourPillar).toBe(engine.hourPillar);
    // 뉴욕: 진태양시가 시주 경계를 넘어 엔진값과 갈린다(유시 신유 ≠ 신시 경신).
    expect(ny.hourPillar).not.toBe(engine.hourPillar);
    // 따라서 같은 벽시계라도 도시(경도)에 따라 시주가 달라진다.
    expect(seoul.hourPillar).not.toBe(ny.hourPillar);
    // 일주는 17시대라 자정과 멀어 셋 다 동일(무술). 일주 분기는 자정 근처에서만(아래).
    expect(seoul.dayPillar).toBe(ny.dayPillar);
    expect(seoul.dayPillar).toBe(engine.dayPillar);
  });

  // 7) 날짜 넘김(조자시): 진태양시가 자정을 넘으면 일주가 전날로 넘어간다.
  //    서울 00:20 → 진태양시 전날 23:41 → 일주 기해(전날). 00:50 → 00:11 → 경자(그날).
  it('진태양시가 자정을 넘으면 일주가 전날로 넘어간다 (서울 1992-07-23)', () => {
    const early = correctPillars({ year: 1992, month: 7, day: 23, hour: 0, minute: 20, ...SEOUL });
    const late = correctPillars({ year: 1992, month: 7, day: 23, hour: 0, minute: 50, ...SEOUL });

    expect(early.dayPillar).toBe('기해'); // 진태양시 전날(07-22)
    expect(late.dayPillar).toBe('경자'); // 진태양시 그날(07-23)
    expect(early.dayPillar).not.toBe(late.dayPillar);
  });

  // 8) 균시차(EoT) 반영: 같은 도시·같은 벽시계라도 달이 다르면 진태양시가 다르다.
  //    경도가 동일하므로 차이는 EoT뿐. 시지(時支, 시각만 결정)가 2월(≈-14분)과
  //    11월(≈+16분)에 갈린다.
  it('같은 경도·벽시계라도 EoT 때문에 2월과 11월의 시지가 다르다', () => {
    const feb = correctPillars({ year: 2024, month: 2, day: 4, hour: 11, minute: 30, ...SEOUL });
    const nov = correctPillars({ year: 2024, month: 11, day: 3, hour: 11, minute: 30, ...SEOUL });

    // 시지(2번째 글자)는 진태양시 '시각'만으로 결정 → EoT 차이가 그대로 드러난다.
    expect(feb.hourPillar!.charAt(1)).toBe('사'); // 진태양시 ≈ 10:44 → 사시
    expect(nov.hourPillar!.charAt(1)).toBe('오'); // 진태양시 ≈ 11:14 → 오시
  });

  // 9) 경도+EoT 합산 정확성: 뉴욕 14:30 EDT → 진태양시 약 13:28 근방.
  it('뉴욕 14:30 EDT의 진태양시가 약 13:28이다', () => {
    const utc = zonedDateTimeToUtc(1992, 7, 23, 14, 30, NEWYORK.timezone);
    const tst = trueSolarParts(utc, NEWYORK.latitude, NEWYORK.longitude);

    expect(tst.hour).toBe(13);
    expect(tst.minute).toBeGreaterThanOrEqual(25);
    expect(tst.minute).toBeLessThanOrEqual(30);
  });
});
