import { type SajuResult } from '../core/saju';
/** 年上起月法으로 월주 60갑자 id를 구한다. */
export declare function monthPillarId(yearStem: string, sajuMonth: number): number;
/**
 * 출생 순간(UTC)이 속한 절기로 사주월을 판정한다.
 * 인접 연도까지 모아 절입 시각 오름차순으로 정렬한 뒤, 출생 이전의 가장 최근 절입을 택한다.
 */
export declare function resolveSajuMonth(birthUtcMs: number, year: number): number;
/**
 * 연주 보정: 입춘 절입 '전' 출생이면 엔진의 전날 연주를 빌려 전년으로 되돌린다.
 * 엔진의 연주 경계는 입춘 '날짜'에 맞춰져 있어, 입춘 당일 절입 전 시각만 어긋난다.
 */
export declare function resolveYearPillar(base: SajuResult, year: number, month: number, day: number, birthUtcMs: number): {
    hangul: string;
    hanja: string;
};
//# sourceMappingURL=month-year-pillar.d.ts.map