/**
 * 절기 경계 월주·연주 보정 래퍼.
 *
 * 월주 데이터에는 3개의 레이어가 있다(측정으로 확인):
 *  - L1 원본 `date-index.ts`: 월주가 음력 1일(초하루) 기준 → 틀림
 *    (docs/issue-5-month-pillar-bug-analysis.md). tsx 직접 실행에서만 노출되고,
 *    배포·테스트 경로에는 쓰이지 않는다.
 *  - L2 배포/테스트 `date-index-compressed.ts`: 빌드의 compress 단계가 월주를
 *    절기 기준(getSajuMonth + 年上起月法)으로 재계산한다. dist(rollup alias)와
 *    jest(moduleNameMapper)가 모두 이 레이어를 쓴다. 다만 (i) 일(日) 단위라 절기
 *    당일의 분 단위 절입 전/후를 구분하지 못하고, (ii) 고정 절기일을 써서 실제
 *    천문 절입과 ±1일 어긋나는 연·절기가 있다(예: 2024 경칩·청명).
 *  - L3 이 래퍼: 검증된 자체 절기 테이블(solar-terms-precise.json)의 분 단위 절입
 *    시각으로 출생 순간(UTC)을 비교해 사주월을 판정하고, 연간(年干)에 따른
 *    年上起月法(오호둔법)으로 '모든 날짜'의 월주를 산출한다. L2의 (i)·(ii)를 모두
 *    교정한다. 깨끗한 비경계 날(분 단위·천문 절입 모두 부합)에는 L2(배포 엔진)와
 *    결과가 일치한다.
 *
 * 연주(年柱)는 엔진 경계가 입춘 '날짜' 기준이라 대부분 올바르고, 입춘 당일의 분 단위
 * 절입 전/후만 어긋난다. 따라서 입춘 절입 전 출생에 한해 엔진의 전날 연주를 빌려
 * 전년으로 되돌린다.
 *
 * 일주(日柱)·시주(時柱)는 출생지 **진태양시**(경도 보정 + 균시차 EoT) 기준으로 계산한다.
 * 출생 순간(UTC)과 출생지 좌표로 HourAngle 진태양시 달력 순간을 구해, 엔진의 KST 경도
 * 보정을 끄고(applyTimeCorrection:false) 그 달력값으로 일주·시주를 산출한다. 엔진 기본
 * 경도 보정 공식은 입력이 KST임을 전제해 미국 출생에선 깨지므로 반드시 끈다.
 *
 * 원칙:
 * - 연주·월주 판정은 출생 순간(UTC) vs 절입 순간(UTC). 진태양시/경도를 섞지 않는다.
 *   절기는 천문학적 절대 순간이라 UTC 기준이 맞다.
 * - 일주·시주는 진태양시 달력값으로 산출한다(엔진 KST 보정은 끈다).
 * - 엔진/`src/data` 미변경. 보정은 엔진 출력 위에 얹는 별도 레이어다.
 */

import * as Astronomy from 'astronomy-engine';
import { calculateSaju, type SajuResult } from '../core/saju';
import { lunarToSolar } from '../core/solar-lunar-converter';
import { getPillarById, getPillarByHangul } from '../data/sixty-pillars';
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

interface CalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 출생 순간(UTC)과 출생지 좌표로 진태양시의 달력 순간을 구한다.
 *
 * HourAngle(태양)에는 경도 보정과 균시차(EoT)가 자동 포함되므로 별도 EoT 공식이 없다.
 * tstInstant의 UTC 달력 필드를 읽으면 자정 넘김(전날/다음날)이 자동 처리된다.
 */
export function trueSolarParts(utc: Date, latitude: number, longitude: number): CalendarParts {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const hourAngle = Astronomy.HourAngle(Astronomy.Body.Sun, utc, observer); // 0~24
  const tstHours = (hourAngle + 12) % 24; // 진태양시 시각(0~24)

  const utcHourFrac =
    utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  let offsetHours = tstHours - utcHourFrac;
  if (offsetHours > 12) offsetHours -= 24; // (-12, 12]로 wrap
  if (offsetHours <= -12) offsetHours += 24;

  const tstInstant = new Date(utc.getTime() + offsetHours * 3600 * 1000);
  return {
    year: tstInstant.getUTCFullYear(),
    month: tstInstant.getUTCMonth() + 1,
    day: tstInstant.getUTCDate(),
    hour: tstInstant.getUTCHours(),
    minute: tstInstant.getUTCMinutes(),
  };
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
  /** 출생 도시 대표 경도(동경 양수, 서경 음수. 예: 뉴욕 -74). 진태양시 일주·시주에 사용. */
  longitude: number;
  /** 출생 도시 대표 위도(북위 양수. 예: 뉴욕 40.7). HourAngle 관측자 위치용. */
  latitude: number;
}

export interface CorrectedSaju {
  yearPillar: string;
  yearPillarHanja: string;
  monthPillar: string;
  monthPillarHanja: string;
  /** 일주: 출생지 진태양시 기준. */
  dayPillar: string;
  dayPillarHanja: string;
  /** 시주: 출생지 진태양시 기준. 시간 모름이면 정오 기준 참고용. */
  hourPillar: string | null;
  hourPillarHanja: string | null;
  /** true면 출생시간 미상 → 정오(12:00) 가정, 시주는 참고용. */
  timeUnknown: boolean;
  /** 일간(日干): 일주의 천간. 사주의 '자기 자신'. */
  dayMaster: {
    hangul: string;
    hanja: string;
    element: string;
  };
  /** 오행 분포: 4기둥 천간·지지(시간 모름이면 시주 제외, 합 6) 목·화·토·금·수 개수. */
  elements: {
    목: number;
    화: number;
    토: number;
    금: number;
    수: number;
  };
  /** 십성(十星): 일간 기준 오행 생극+음양 판정. 일간 자신(일주 천간)은 제외. */
  tenGods: {
    /** 천간 십성 (일간 제외: 연간·월간·시간). */
    heavenly: { year: string; month: string; hour: string | null };
    /** 지지 십성 (각 지지의 정기 천간 기준: 연지·월지·일지·시지). */
    earthly: { year: string; month: string; day: string; hour: string | null };
    /** 지장간 십성 (각 지지의 지장간 전부에 매김). */
    hidden: {
      year: { stem: string; god: string }[];
      month: { stem: string; god: string }[];
      day: { stem: string; god: string }[];
      hour: { stem: string; god: string }[] | null;
    };
  };
}

/** 기둥 한글 배열의 천간·지지 오행을 세어 분포를 만든다. */
function elementDistribution(pillars: string[]): CorrectedSaju['elements'] {
  const dist = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as CorrectedSaju['elements'];
  for (const hangul of pillars) {
    const p = getPillarByHangul(hangul);
    if (!p) continue;
    dist[p.tiangan.element as keyof CorrectedSaju['elements']]++;
    dist[p.dizhi.element as keyof CorrectedSaju['elements']]++;
  }
  return dist;
}

// ─── 십성(十星) ─────────────────────────────────────────────────────────────
// 일간 기준 오행 생극 + 음양 동이(同異)로 대상 천간의 십성을 판정한다.
// 지지 대표 십성은 '위치 음양'이 아니라 정기(지장간 본기) 천간의 음양으로 판정한다
// (예: 일지 자(子)는 위치상 양이지만 정기 계(癸)가 음수라 경금 일간 기준 상관).

/** 천간 → 오행. */
const STEM_ELEMENT: Readonly<Record<string, string>> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

/** 지지 → 지장간(여기·중기·정기 순. 마지막=정기=대표). */
const HIDDEN_STEMS: Readonly<Record<string, readonly string[]>> = {
  자: ['임', '계'],
  축: ['계', '신', '기'],
  인: ['무', '병', '갑'],
  묘: ['갑', '을'],
  진: ['을', '계', '무'],
  사: ['무', '경', '병'],
  오: ['병', '기', '정'],
  미: ['정', '을', '기'],
  신: ['무', '임', '경'],
  유: ['경', '신'],
  술: ['신', '정', '무'],
  해: ['무', '갑', '임'],
};

/** 오행 상생: 생하는 대상. 목→화→토→금→수→목. */
const GENERATES: Readonly<Record<string, string>> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};

/** 오행 상극: 극하는 대상. 목극토, 토극수, 수극화, 화극금, 금극목. */
const CONTROLS: Readonly<Record<string, string>> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

/** 천간 음양: 정렬 순서(갑을병정…) 짝수 index=양, 홀수=음. */
function isYangStem(stem: string): boolean {
  return STEMS.indexOf(stem) % 2 === 0;
}

/**
 * 일간(dayMaster) 기준으로 대상 천간의 십성을 판정한다.
 * (1)오행 생극 관계 + (2)음양 동이로 10종 중 하나를 반환.
 */
function tenGod(dayMaster: string, target: string): string {
  const de = STEM_ELEMENT[dayMaster];
  const te = STEM_ELEMENT[target];
  const same = isYangStem(dayMaster) === isYangStem(target);
  if (de === te) return same ? '비견' : '겁재';
  if (GENERATES[de] === te) return same ? '식신' : '상관'; // 일간이 생하는
  if (CONTROLS[de] === te) return same ? '편재' : '정재'; // 일간이 극하는
  if (CONTROLS[te] === de) return same ? '편관' : '정관'; // 일간을 극하는
  return same ? '편인' : '정인'; // 일간을 생하는 (GENERATES[te] === de)
}

/** 지지의 지장간 전부에 십성을 매긴다. */
function hiddenGods(dayMaster: string, branch: string): { stem: string; god: string }[] {
  return (HIDDEN_STEMS[branch] ?? []).map((stem) => ({ stem, god: tenGod(dayMaster, stem) }));
}

/** 지지 대표 십성 = 정기(지장간 마지막) 천간 기준. */
function branchGod(dayMaster: string, branch: string): string {
  const hidden = HIDDEN_STEMS[branch];
  return tenGod(dayMaster, hidden[hidden.length - 1]);
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

  // 3. 엔진 기본 명식 (연주 보정의 기준값). 연주는 날짜 기반이라 경도 보정 무관.
  const base = calculateSaju(year, month, day, hour, minute);

  // 4. 출생 순간 → UTC (도시 IANA 시간대, DST 자동 반영). 연주·월주(절기) 판정 기준.
  const birthUtc = zonedDateTimeToUtc(year, month, day, hour, minute, input.timezone);
  const birthUtcMs = birthUtc.getTime();

  // 5. 연주: 입춘 절입 경계 보정 (전날 값 빌려오기). UTC vs 절입 UTC, 진태양시 미사용.
  const yp = resolveYearPillar(base, year, month, day, birthUtcMs);

  // 6. 월주: 절기 절입(분 단위, UTC 비교)으로 사주월 판정 → 年上起月法으로 산출.
  const sajuMonth = resolveSajuMonth(birthUtcMs, year);
  const mp = getPillarById(monthPillarId(yp.hangul.charAt(0), sajuMonth));

  // 7. 일주·시주: 출생지 진태양시 달력값으로 산출. 엔진 KST 경도 보정은 끈다.
  //    진태양시가 자정을 넘으면 tst.day가 자동으로 전날/다음날이 되어 일주가 따라간다.
  const tst = trueSolarParts(birthUtc, input.latitude, input.longitude);
  const tstBase = calculateSaju(tst.year, tst.month, tst.day, tst.hour, tst.minute, {
    applyTimeCorrection: false,
  });

  // 8. 파생 정보(기존 보정 결과 위에 얹음): 일간 + 오행 분포.
  //    시간 모름이면 시주는 정오 참고용이므로 분포에서 제외(합 6).
  const countedPillars = [yp.hangul, mp.combined.hangul, tstBase.dayPillar];
  if (!timeUnknown && tstBase.hourPillar) countedPillars.push(tstBase.hourPillar);
  const elements = elementDistribution(countedPillars);

  const dayTiangan = getPillarByHangul(tstBase.dayPillar)?.tiangan;
  const dayMaster = {
    hangul: dayTiangan?.hangul ?? '',
    hanja: dayTiangan?.hanja ?? '',
    element: dayTiangan?.element ?? '',
  };

  // 9. 십성(十星): 일간 기준으로 천간·지지 대표·지장간에 매긴다. 일간 자신(일주 천간)은 제외.
  //    시간 모름이면 시주 관련(hour)은 정오 추정이라 null.
  const dm = dayMaster.hangul;
  const hourKnown = !timeUnknown && !!tstBase.hourPillar;
  const hourStem = tstBase.hourPillar?.charAt(0) ?? '';
  const hourBranch = tstBase.hourPillar?.charAt(1) ?? '';
  const tenGods: CorrectedSaju['tenGods'] = {
    heavenly: {
      year: tenGod(dm, yp.hangul.charAt(0)),
      month: tenGod(dm, mp.combined.hangul.charAt(0)),
      hour: hourKnown ? tenGod(dm, hourStem) : null,
    },
    earthly: {
      year: branchGod(dm, yp.hangul.charAt(1)),
      month: branchGod(dm, mp.combined.hangul.charAt(1)),
      day: branchGod(dm, tstBase.dayPillar.charAt(1)),
      hour: hourKnown ? branchGod(dm, hourBranch) : null,
    },
    hidden: {
      year: hiddenGods(dm, yp.hangul.charAt(1)),
      month: hiddenGods(dm, mp.combined.hangul.charAt(1)),
      day: hiddenGods(dm, tstBase.dayPillar.charAt(1)),
      hour: hourKnown ? hiddenGods(dm, hourBranch) : null,
    },
  };

  return {
    yearPillar: yp.hangul,
    yearPillarHanja: yp.hanja,
    monthPillar: mp.combined.hangul,
    monthPillarHanja: mp.combined.hanja,
    dayPillar: tstBase.dayPillar,
    dayPillarHanja: tstBase.dayPillarHanja,
    hourPillar: tstBase.hourPillar,
    hourPillarHanja: tstBase.hourPillarHanja,
    timeUnknown,
    dayMaster,
    elements,
    tenGods,
  };
}
