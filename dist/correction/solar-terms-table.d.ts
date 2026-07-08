/**
 * 검증된 자체 절기 테이블(solar-terms-precise.json) 공용 접근 모듈.
 * 연주·월주 판정(correct-pillars)과 대운(major-luck)이 함께 쓴다.
 */
export interface SolarTermEntry {
    name: string;
    lon: number;
    kst: string;
}
export declare const TERMS: Record<string, SolarTermEntry[]>;
/** 절기 테이블의 KST 벽시계 문자열을 UTC 순간(ms)으로 환산. */
export declare function termUtcMs(kst: string): number;
//# sourceMappingURL=solar-terms-table.d.ts.map