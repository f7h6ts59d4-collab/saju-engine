// ─── 신강/신약(身强/身弱) 판정 ──────────────────────────────────────────────
// 억부(抑扶) 점수제: 일간을 제외한 7글자 + 지장간을 아군(비겁·인성)/적군(식상·
// 재성·관성)으로 나눠 자리 가중치로 합산하고, 비율로 7단계 라벨을 매긴다.
// 학파 스위치는 명세(docs/specs/strength-spec.md) 고정값을 따른다:
// 득령=월지 정기 십성, 조토생금 인정, 합반·충만 50% 감점(반합·형파해원진 미반영),
// 합화 판정 없음, 조후는 점수 합산 없이 별도 필드.
// 감점은 relations 모듈 출력(천간합·지지충)만 입력으로 쓴다 — 자체 재계산 금지.

import { tenGod, hiddenGods, branchGod } from './ten-gods';
import { lifeStage } from './twelve-stages';
import { Relation } from './relations';

export type StrengthLabel = '태약' | '신약' | '중화신약' | '중화' | '중화신강' | '신강' | '태강';

export interface Strength {
  score: { support: number; drain: number; ratio: number };
  factors: {
    /** 득령: 월지 정기의 십성이 비겁·인성. */
    deukryeong: boolean;
    /** 득지: 일지 정기의 십성이 비겁·인성. */
    deukji: boolean;
    /** 통근 상세: 일간과 같은 오행이 지장간에 있는 지지. 건록·제왕이면 boosted. */
    roots: { branch: string; stage: string; boosted: boolean }[];
    /** 적용된 감점: 천간합(합반)·지지충. relations 출력 순서 그대로. */
    damages: { kind: '합반' | '충'; targets: string[] }[];
  };
  label: StrengthLabel;
  favorable: '식상·재성·관성' | '인성·비겁' | null;
  /** 조후: 서술용 사실 라벨만. 점수 합산 금지. */
  johu: { season: string; label: string; earthFlags: string[] };
}

const SUPPORT_GODS = new Set(['비견', '겁재', '편인', '정인']);
/** 일간과 같은 오행(=통근 판정)은 십성으로 비견·겁재. */
const SAME_ELEMENT_GODS = new Set(['비견', '겁재']);
const BOOST_STAGES = new Set(['건록', '제왕']);

// 자리 가중치 (연·월·일·시 순, v1 — 카논·극단 케이스 검증으로 확정)
const BRANCH_WEIGHT = [10, 30, 15, 10]; // 지지 정기
const STEM_WEIGHT = [10, 12, 0, 10]; // 천간 (일간 자신은 0)
const MINOR_HIDDEN_WEIGHT = 3; // 지장간 여기·중기 (각)
const ROOT_BONUS = 8;
const ROOT_BONUS_BOOSTED = 12; // 통근 지지가 건록·제왕일 때

/** 라벨 경계: 하한 포함(ratio ≥ min). 위에서부터 첫 매치. */
const LABEL_BOUNDS: { min: number; label: StrengthLabel }[] = [
  { min: 0.8, label: '태강' },
  { min: 0.68, label: '신강' },
  { min: 0.56, label: '중화신강' },
  { min: 0.44, label: '중화' },
  { min: 0.33, label: '중화신약' },
  { min: 0.21, label: '신약' },
  { min: 0, label: '태약' },
];

const STRONG_LABELS = new Set<StrengthLabel>(['중화신강', '신강', '태강']);

/** 조후 계절: 월지 그룹 → season·label. */
const SEASONS = [
  { branches: '인묘진', season: '봄', label: '온' },
  { branches: '사오미', season: '여름', label: '조열' },
  { branches: '신유술', season: '가을', label: '량' },
  { branches: '해자축', season: '겨울', label: '한습' },
] as const;

const DRY_EARTH = new Set(['미', '술']);
const WET_EARTH = new Set(['진', '축']);

/**
 * 보정된 4기둥 간지(한글)와 relations 출력으로 신강/신약을 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 판정에서 제외.
 */
export function computeStrength(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
  relations: Relation[],
): Strength {
  const dm = dayPillar.charAt(0);
  const names = ['연주', '월주', '일주', '시주'];
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar];

  // 감점 수집: relations의 천간합·지지충에서 기둥 위치만 가져온다(재계산 금지).
  // 같은 기둥이 여러 관계에 걸려도 감점은 한 번만 적용한다.
  const hapStemPillars = new Set<string>();
  const chungBranchPillars = new Set<string>();
  const damages: Strength['factors']['damages'] = [];
  for (const r of relations) {
    if (r.type === '천간합') {
      r.positions.forEach((p) => hapStemPillars.add(p));
      damages.push({ kind: '합반', targets: [r.name.charAt(0), r.name.charAt(1)] });
    } else if (r.type === '충') {
      r.positions.forEach((p) => chungBranchPillars.add(p));
      damages.push({ kind: '충', targets: [r.name.charAt(0), r.name.charAt(1)] });
    }
  }

  // 점수 합산: 천간·지지 정기는 자리 가중치(감점 대상이면 50%),
  // 지장간 여기·중기는 각 3점(충에도 유지 — 명세 §2).
  let support = 0;
  let drain = 0;
  const add = (god: string, value: number) => {
    if (SUPPORT_GODS.has(god)) support += value;
    else drain += value;
  };

  const roots: Strength['factors']['roots'] = [];
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    if (!p) continue;
    const stem = p.charAt(0);
    const branch = p.charAt(1);

    if (i !== 2) {
      add(tenGod(dm, stem), hapStemPillars.has(names[i]) ? STEM_WEIGHT[i] / 2 : STEM_WEIGHT[i]);
    }
    add(branchGod(dm, branch), chungBranchPillars.has(names[i]) ? BRANCH_WEIGHT[i] / 2 : BRANCH_WEIGHT[i]);

    const hidden = hiddenGods(dm, branch);
    for (const h of hidden.slice(0, -1)) add(h.god, MINOR_HIDDEN_WEIGHT);

    // 통근: 지장간에 일간과 같은 오행이 있는 지지마다 아군 보너스(건록·제왕 가중).
    if (hidden.some((h) => SAME_ELEMENT_GODS.has(h.god))) {
      const stage = lifeStage(dm, branch);
      const boosted = BOOST_STAGES.has(stage);
      roots.push({ branch, stage, boosted });
      support += boosted ? ROOT_BONUS_BOOSTED : ROOT_BONUS;
    }
  }

  const ratio = support / (support + drain);
  let label = LABEL_BOUNDS.find((b) => ratio >= b.min)!.label;
  // 무근 게이트: 통근 0이면 ratio와 무관하게 라벨 상한은 중화 (명세 §3).
  if (roots.length === 0 && STRONG_LABELS.has(label)) label = '중화';

  const favorable = STRONG_LABELS.has(label)
    ? ('식상·재성·관성' as const)
    : label === '중화'
      ? null
      : ('인성·비겁' as const);

  // 조후: 월지 계절 + 원국 지지의 조토·습토 존재 표시(중복 지지는 1회).
  const season = SEASONS.find((s) => s.branches.includes(monthPillar.charAt(1)))!;
  const earthFlags: string[] = [];
  for (const p of pillars) {
    const b = p?.charAt(1);
    if (!b) continue;
    const flag = DRY_EARTH.has(b) ? `${b}=조토` : WET_EARTH.has(b) ? `${b}=습토` : null;
    if (flag && !earthFlags.includes(flag)) earthFlags.push(flag);
  }

  return {
    score: { support, drain, ratio },
    factors: {
      deukryeong: SUPPORT_GODS.has(branchGod(dm, monthPillar.charAt(1))),
      deukji: SUPPORT_GODS.has(branchGod(dm, dayPillar.charAt(1))),
      roots,
      damages,
    },
    label,
    favorable,
    johu: { season: season.season, label: season.label, earthFlags },
  };
}
