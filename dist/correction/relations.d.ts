export type PillarName = '연주' | '월주' | '일주' | '시주';
export type RelationType = '천간합' | '천간충' | '육합' | '삼합' | '삼합반합' | '방합' | '방합반합' | '충' | '삼형' | '상형' | '자형' | '파' | '해' | '원진';
export interface Relation {
    type: RelationType;
    name: string;
    /** 합의 참고 오행 (합화 판정 아님). 합 계열에만 있다. */
    element?: string;
    /** 성립한 기둥들. */
    positions: PillarName[];
    /** 인접 여부: 성립 기둥들이 연달아 붙어 있으면 true (쌍이면 연월·월일·일시). */
    adjacent: boolean;
}
export interface Gongmang {
    /** 일주가 속한 순(旬)의 공망 지지 2개. */
    branches: string[];
    /** 실제 공망인 기둥(연·월·시지에서 판정. 일지는 기준이라 제외). 없으면 빈 배열. */
    positions: PillarName[];
}
/**
 * 4기둥 간지(한글, 예: '임신')로 합충형파해를 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 모든 판정에서 제외.
 * 출력 순서는 결정적: 타입은 RelationType 나열 순서, 같은 타입 안에서는
 * 규칙표 행 → 기둥 쌍(연월·연일·연시·월일·월시·일시) 순서.
 */
export declare function computeRelations(yearPillar: string, monthPillar: string, dayPillar: string, hourPillar: string | null): Relation[];
/**
 * 일주 기준 순중공망을 판정한다. 공망 지지 2개와, 연·월·시지 중 공망에
 * 해당하는 기둥을 낸다(일지는 기준이라 제외). hourPillar가 null이면 시주 제외.
 */
export declare function computeGongmang(yearPillar: string, monthPillar: string, dayPillar: string, hourPillar: string | null): Gongmang;
//# sourceMappingURL=relations.d.ts.map