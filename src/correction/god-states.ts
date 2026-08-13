// ─── 십성 기운(투출·통근) ───────────────────────────────────────────────────
// 다섯 십성 그룹(비겁·식상·재성·관성·인성)의 천간 투출(exposed)과 지지 뿌리
// (rooted)를 기계적으로 조회하고 4단 상태로 분류한다. 존재 사실만 기록하며,
// 생극 흐름·발현 해석과 합충에 의한 손상은 해석층 몫(relations를 함께 읽는다).
// 통근 기준은 strength-spec 학파 스위치 표를 공유한다: 같은 오행 지장간이면
// 뿌리, 조토생금 인정 — 조습은 뿌리 인정에 영향 없이 earth 플래그로만 표시.

import { tenGod, hiddenGods } from './ten-gods';

export type GodGroup = '비겁' | '식상' | '재성' | '관성' | '인성';

export interface GodState {
  /** 투출: 일간을 제외한 천간 3자리 중 이 그룹의 십성이 있는 자리. */
  exposed: { position: '연간' | '월간' | '시간'; stem: string; god: string }[];
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

const GROUPS: readonly GodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

const GOD_GROUP: Readonly<Record<string, GodGroup>> = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성',
  정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
};

const STEM_POSITIONS = ['연간', '월간', null, '시간'] as const;
const BRANCH_PILLARS = ['연지', '월지', '일지', '시지'] as const;
/** 지장간 층 이름: hiddenGods 배열 순서(여기·중기·정기, 2글자 지지는 여기·정기). */
const LAYERS_3 = ['여기', '중기', '정기'] as const;
const LAYERS_2 = ['여기', '정기'] as const;

/** 조습 표시 플래그. 뿌리 인정·상태 판정에는 영향 없음 (명세 §판정 규칙). */
const EARTH: Readonly<Record<string, '조토' | '습토'>> = {
  미: '조토', 술: '조토', 진: '습토', 축: '습토',
};

/**
 * 보정된 4기둥 간지(한글)로 다섯 십성 그룹의 투출·통근 상태를 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 판정에서 제외.
 */
export function computeGodStates(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
): GodStates {
  const dm = dayPillar.charAt(0);
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

  const states = {} as GodStates;
  for (const g of GROUPS) states[g] = { exposed: [], rooted: [], state: '무' };

  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    if (!p) continue;

    const position = STEM_POSITIONS[i];
    if (position) {
      const stem = p.charAt(0);
      const god = tenGod(dm, stem);
      states[GOD_GROUP[god]].exposed.push({ position, stem, god });
    }

    const branch = p.charAt(1);
    const hidden = hiddenGods(dm, branch);
    const layers = hidden.length === 3 ? LAYERS_3 : LAYERS_2;
    const earth = EARTH[branch] ?? null;
    hidden.forEach((h, j) => {
      states[GOD_GROUP[h.god]].rooted.push({
        branch, pillar: BRANCH_PILLARS[i], layer: layers[j], stem: h.stem, god: h.god, earth,
      });
    });
  }

  for (const g of GROUPS) {
    const s = states[g];
    s.state = s.exposed.length
      ? s.rooted.length ? '투출유근' : '투출무근'
      : s.rooted.length ? '잠복' : '무';
  }
  return states;
}
