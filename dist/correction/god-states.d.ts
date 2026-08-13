export type GodGroup = '비겁' | '식상' | '재성' | '관성' | '인성';
export interface GodState {
    /** 투출: 일간을 제외한 천간 3자리 중 이 그룹의 십성이 있는 자리. */
    exposed: {
        position: '연간' | '월간' | '시간';
        stem: string;
        god: string;
    }[];
    /** 뿌리: 지장간에 이 그룹 오행의 글자가 있는 지지. 기록 순서는 연지→시지, 같은 지지 안에서는 여기→정기. */
    rooted: {
        branch: string;
        pillar: '연지' | '월지' | '일지' | '시지';
        layer: '정기' | '중기' | '여기';
        stem: string;
        god: string;
        earth: '조토' | '습토' | null;
    }[];
    state: '투출유근' | '투출무근' | '잠복' | '무';
}
export type GodStates = Record<GodGroup, GodState>;
/**
 * 보정된 4기둥 간지(한글)로 다섯 십성 그룹의 투출·통근 상태를 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 판정에서 제외.
 */
export declare function computeGodStates(yearPillar: string, monthPillar: string, dayPillar: string, hourPillar: string | null): GodStates;
//# sourceMappingURL=god-states.d.ts.map