export type PillarName = '연주' | '월주' | '일주' | '시주';
export interface Sinsal {
    /** 12신살: 월·일·시지는 연지(年支) 삼합 기준, 연지 자신은 일지(日支) 삼합 기준. */
    twelve: {
        year: string;
        month: string;
        day: string;
        hour: string | null;
    };
    /** 개별 신살. 같은 name이 여러 번 나올 수 있음(겹침 허용). positions = 성립 기둥. */
    stars: {
        name: string;
        positions: PillarName[];
    }[];
}
/**
 * 4기둥 간지(한글, 예: '임신')로 신살을 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 모든 판정에서 제외(twelve.hour = null).
 */
export declare function computeSinsal(yearPillar: string, monthPillar: string, dayPillar: string, hourPillar: string | null): Sinsal;
//# sourceMappingURL=sinsal.d.ts.map