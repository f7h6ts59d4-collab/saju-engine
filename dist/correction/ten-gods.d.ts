export declare const STEMS: string[];
/** 천간 음양: 정렬 순서(갑을병정…) 짝수 index=양, 홀수=음. */
export declare function isYangStem(stem: string): boolean;
/**
 * 일간(dayMaster) 기준으로 대상 천간의 십성을 판정한다.
 * (1)오행 생극 관계 + (2)음양 동이로 10종 중 하나를 반환.
 */
export declare function tenGod(dayMaster: string, target: string): string;
/** 지지의 지장간 전부에 십성을 매긴다. */
export declare function hiddenGods(dayMaster: string, branch: string): {
    stem: string;
    god: string;
}[];
/** 지지 대표 십성 = 정기(지장간 마지막) 천간 기준. */
export declare function branchGod(dayMaster: string, branch: string): string;
//# sourceMappingURL=ten-gods.d.ts.map