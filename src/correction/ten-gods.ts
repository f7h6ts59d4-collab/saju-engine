// ─── 십성(十星) ─────────────────────────────────────────────────────────────
// 일간 기준 오행 생극 + 음양 동이(同異)로 대상 천간의 십성을 판정한다.
// 지지 대표 십성은 '위치 음양'이 아니라 정기(지장간 본기) 천간의 음양으로 판정한다
// (예: 일지 자(子)는 위치상 양이지만 정기 계(癸)가 음수라 경금 일간 기준 상관).

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

/** 천간 → 오행. */
const STEM_ELEMENT: Readonly<Record<string, string>> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

/** 지지 → 지장간(여기·중기·정기 순. 마지막=정기=대표). */
const HIDDEN_STEMS: Readonly<Record<string, readonly string[]>> = {
  자: ['임', '계'],
  축: ['계', '신', '기'],
  인: ['무', '병', '갑'],
  묘: ['갑', '을'],
  진: ['을', '계', '무'],
  사: ['무', '경', '병'],
  오: ['병', '기', '정'],
  미: ['정', '을', '기'],
  신: ['무', '임', '경'],
  유: ['경', '신'],
  술: ['신', '정', '무'],
  해: ['무', '갑', '임'],
};

/** 오행 상생: 생하는 대상. 목→화→토→금→수→목. */
const GENERATES: Readonly<Record<string, string>> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};

/** 오행 상극: 극하는 대상. 목극토, 토극수, 수극화, 화극금, 금극목. */
const CONTROLS: Readonly<Record<string, string>> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

/** 천간 음양: 정렬 순서(갑을병정…) 짝수 index=양, 홀수=음. */
export function isYangStem(stem: string): boolean {
  return STEMS.indexOf(stem) % 2 === 0;
}

/**
 * 일간(dayMaster) 기준으로 대상 천간의 십성을 판정한다.
 * (1)오행 생극 관계 + (2)음양 동이로 10종 중 하나를 반환.
 */
export function tenGod(dayMaster: string, target: string): string {
  const de = STEM_ELEMENT[dayMaster];
  const te = STEM_ELEMENT[target];
  const same = isYangStem(dayMaster) === isYangStem(target);
  if (de === te) return same ? '비견' : '겁재';
  if (GENERATES[de] === te) return same ? '식신' : '상관'; // 일간이 생하는
  if (CONTROLS[de] === te) return same ? '편재' : '정재'; // 일간이 극하는
  if (CONTROLS[te] === de) return same ? '편관' : '정관'; // 일간을 극하는
  return same ? '편인' : '정인'; // 일간을 생하는 (GENERATES[te] === de)
}

/** 지지의 지장간 전부에 십성을 매긴다. */
export function hiddenGods(dayMaster: string, branch: string): { stem: string; god: string }[] {
  return (HIDDEN_STEMS[branch] ?? []).map((stem) => ({ stem, god: tenGod(dayMaster, stem) }));
}

/** 지지 대표 십성 = 정기(지장간 마지막) 천간 기준. */
export function branchGod(dayMaster: string, branch: string): string {
  const hidden = HIDDEN_STEMS[branch];
  return tenGod(dayMaster, hidden[hidden.length - 1]);
}
