import { Relation } from './relations';
export type StrengthLabel = '태약' | '신약' | '중화신약' | '중화' | '중화신강' | '신강' | '태강';
export interface Strength {
    score: {
        support: number;
        drain: number;
        ratio: number;
    };
    factors: {
        /** 득령: 월지 정기의 십성이 비겁·인성. */
        deukryeong: boolean;
        /** 득지: 일지 정기의 십성이 비겁·인성. */
        deukji: boolean;
        /** 통근 상세: 일간과 같은 오행이 지장간에 있는 지지. 건록·제왕이면 boosted. */
        roots: {
            branch: string;
            stage: string;
            boosted: boolean;
        }[];
        /** 적용된 감점: 천간합(합반)·지지충. relations 출력 순서 그대로. */
        damages: {
            kind: '합반' | '충';
            targets: string[];
        }[];
    };
    label: StrengthLabel;
    favorable: '식상·재성·관성' | '인성·비겁' | null;
    /** 조후: 서술용 사실 라벨만. 점수 합산 금지. */
    johu: {
        season: string;
        label: string;
        earthFlags: string[];
    };
}
/**
 * 보정된 4기둥 간지(한글)와 relations 출력으로 신강/신약을 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 판정에서 제외.
 */
export declare function computeStrength(yearPillar: string, monthPillar: string, dayPillar: string, hourPillar: string | null, relations: Relation[]): Strength;
//# sourceMappingURL=strength.d.ts.map