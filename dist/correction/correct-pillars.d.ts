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
 * 원칙:
 * - 비교는 출생 순간(UTC) vs 절입 순간(UTC). 진태양시(경도·균시차)는 쓰지 않는다.
 * - 일주(日柱)·시주(時柱)는 엔진 출력을 그대로 둔다(절대 덮지 않음).
 * - 엔진/`src/data` 미변경. 보정은 엔진 출력 위에 얹는 별도 레이어다.
 */
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
export declare function correctPillars(input: BirthInput): CorrectedSaju;
//# sourceMappingURL=correct-pillars.d.ts.map