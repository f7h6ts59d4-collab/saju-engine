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