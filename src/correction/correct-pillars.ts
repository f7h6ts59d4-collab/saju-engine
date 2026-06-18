/**
 * 절기 경계 월주·연주 보정 래퍼.
 *
 * manseryeok 엔진은 월주(月柱)를 절기가 아닌 음력 1일(초하루) 기준으로 전환하므로
 * (docs/issue-5-month-pillar-bug-analysis.md), 절기 당일 출생자뿐 아니라
 * "음력 1일~절기" 구간 전체의 월주가 틀린다. 또 절기 경계는 분 단위 천문 순간인데
 * 엔진은 일(日) 단위라 같은 날 절입 전/후를 구분하지 못한다.
 *
 * 이 래퍼는 검증된 자체 절기 테이블(solar-terms-precise.json)의 분 단위 절입 시각으로
 * 출생 순간(UTC)을 비교해 사주월을 판정하고, 연간(年干)에 따른 年上起月法(오호둔법)으로
 * 월주를 산출한다. 연주(年柱)는 입춘 경계에서만 엔진의 전날 값을 빌려 보정한다.
 *
 * 원칙:
 * - 비교는 출생 순간(UTC) vs 절입 순간(UTC). 진태양시(경도·균시차)는 쓰지 않는다.
 * - 일주(日柱)·시주(時柱)는 엔진 출력을 그대로 둔다(절대 덮지 않음).
 * - 엔진/`src/data` 미변경. 보정은 엔진 출력 위에 얹는 별도 레이어다.
 */

import { calculateSaju, type SajuResult } from '../core/saju';
import { lunarToSolar } from '../core/solar-lunar-converter';
import { getPillarById } from '../data/sixty-pillars';
import { zonedDateTimeToUtc } from './timezone';
import SOLAR_TERMS from './solar-terms-precise.json';

interface SolarTermEntry {
  name: string;
  lon: number;
  kst: string; // "YYYY-MM-DDTHH:MM" (KST = UTC+9 벽시계)
}

const TERMS = SOLAR_TERMS as Record<string, SolarTermEntry[]>;

/** 절기명 → 사주월(1=인월 … 11=자월, 12=축월). */
const SAJU_MONTH_BY_TERM: Readonly<Record<string, number>> = {
  입춘: 1,
  경칩: 2,
  청명: 3,
  입하: 4,
  망종: 5,
  소서: 6,
  입추: 7,
  백로: 8,
  한로: 9,
  입동: 10,
  대설: 11,
  소한: 12,
};

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

/** 年上起月法: 연간(0~9)에 따른 인월(寅月)의 60갑자 시작 id. */
const MONTH_PILLAR_BASE: readonly number[] = [2, 14, 26, 38, 50];

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 절기 테이블의 KST 벽시계 문자열을 UTC 순간(ms)으로 환산. */
function termUtcMs(kst: string): number {
  const [datePart, timePart] = kst.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - KST_OFFSET_MS;
}

/** 年上起月法으로 월주 60갑자 id를 구한다. */
function monthPillarId(yearStem: string, sajuMonth: number): number {
  const base = MONTH_PILLAR_BASE[STEMS.indexOf(yearStem) % 5];
  return (base + sajuMonth - 1) % 60;
}

/**
 * 출생 순간(UTC)이 속한 절기로 사주월을 판정한다.
 * 인접 연도까지 모아 절입 시각 오름차순으로 정렬한 뒤, 출생 이전의 가장 최근 절입을 택한다.
 */
function resolveSajuMonth(birthUtcMs: number, year: number): number {
  const terms: { utc: number; name: string }[] = [];
  for (const y of [year - 1, year, year + 1]) {
    const list = TERMS[String(y)];
    if (!list) continue;
    for (const t of list) terms.push({ utc: termUtcMs(t.kst), name: t.name });
  }
  terms.sort((a, b) => a.utc - b.utc);

  let governing: string | undefined;
  for (const t of terms) {
    if (t.utc <= birthUtcMs) governing = t.name;
    else break;
  }
  // 데이터 시작 이전(예: 1900-01 소한 전)에는 직전 대설(자월) 기준으로 폴백.
  return governing ? SAJU_MONTH_BY_TERM[governing] : 11;
}

/**
 * 연주 보정: 입춘 절입 '전' 출생이면 엔진의 전날 연주를 빌려 전년으로 되돌린다.
 * 엔진의 연주 경계는 입춘 '날짜'에 맞춰져 있어, 입춘 당일 절입 전 시각만 어긋난다.
 */
function resolveYearPillar(
  base: SajuResult,
  year: number,
  month: number,
  day: number,
  birthUtcMs: number
): { hangul: string; hanja: string } {
  const ipchun = TERMS[String(year)]?.find((t) => t.name === '입춘');
  if (ipchun) {
    const [iy, im, id] = ipchun.kst.slice(0, 10).split('-').map(Number);
    const onIpchunDate = year === iy && month === im && day === id;
    if (onIpchunDate && birthUtcMs < termUtcMs(ipchun.kst)) {
      const prev = new Date(Date.UTC(iy, im - 1, id) - 86400000);
      const borrowed = calculateSaju(
        prev.getUTCFullYear(),
        prev.getUTCMonth() + 1,
        prev.getUTCDate(),
        12,
        0,
        { applyTimeCorrection: false }
      );
      return { hangul: borrowed.yearPillar, hanja: borrowed.yearPillarHanja };
    }
  }
  return { hangul: base.yearPillar, hanja: base.yearPillarHanja };
}

export interface BirthInput {
  /** 생년월일 (calendar 기준) */
  year: number;
  month: number;
  day: number;
  /** 출생 시각. 생략하면 "시간 모름"(정오 가정). */
  hour?: number;
  minute?: number;
  /** 입력 달력 (기본 'solar'). */
  calendar?: 'solar' | 'lunar';
  /** 음력 윤달 여부 (calendar === 'lunar'일 때만). */
  isLeapMonth?: boolean;
  /** 출생 도시의 IANA 시간대 id (예: 'Asia/Seoul'). 도시→IANA 매핑은 앱이 제공. */
  timezone: string;
}

export interface CorrectedSaju {
  yearPillar: string;
  yearPillarHanja: string;
  monthPillar: string;
  monthPillarHanja: string;
  /** 일주: 엔진 출력 그대로(불변). */
  dayPillar: string;
  dayPillarHanja: string;
  /** 시주: 엔진 출력 그대로(불변). 시간 모름이면 정오 기준 참고용. */
  hourPillar: string | null;
  hourPillarHanja: string | null;
  /** true면 출생시간 미상 → 정오(12:00) 가정, 시주는 참고용. */
  timeUnknown: boolean;
}

/**
 * 엔진 명식에 절기 경계 월주·연주 보정을 적용한 명식을 반환한다.
 */
export function correctPillars(input: BirthInput): CorrectedSaju {
  // 1. 음력 입력이면 양력으로 변환 (절기/UTC 비교는 모두 양력 기준).
  let { year, month, day } = input;
  if (input.calendar === 'lunar') {
    const solar = lunarToSolar(year, month, day, input.isLeapMonth ?? false).solar;
    year = solar.year;
    month = solar.month;
    day = solar.day;
  }

  // 2. 시간 모름이면 정오(12:00) 가정 — 날짜 경계에서 가장 먼 안전 시각.
  const timeUnknown = input.hour === undefined;
  const hour = input.hour ?? 12;
  const minute = input.minute ?? 0;

  // 3. 엔진 기본 명식 (일주·시주 출처, 절대 덮지 않음).
  const base = calculateSaju(year, month, day, hour, minute);

  // 4. 출생 순간 → UTC (도시 IANA 시간대, DST 자동 반영).
  const birthUtcMs = zonedDateTimeToUtc(year, month, day, hour, minute, input.timezone).getTime();

  // 5. 연주: 입춘 절입 경계 보정 (전날 값 빌려오기).
  const yp = resolveYearPillar(base, year, month, day, birthUtcMs);

  // 6. 월주: 절기 절입(분 단위, UTC 비교)으로 사주월 판정 → 年上起月法으로 산출.
  const sajuMonth = resolveSajuMonth(birthUtcMs, year);
  const mp = getPillarById(monthPillarId(yp.hangul.charAt(0), sajuMonth));

  return {
    yearPillar: yp.hangul,
    yearPillarHanja: yp.hanja,
    monthPillar: mp.combined.hangul,
    monthPillarHanja: mp.combined.hanja,
    dayPillar: base.dayPillar,
    dayPillarHanja: base.dayPillarHanja,
    hourPillar: base.hourPillar,
    hourPillarHanja: base.hourPillarHanja,
    timeUnknown,
  };
}
