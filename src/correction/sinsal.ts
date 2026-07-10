// ─── 신살(神殺) ─────────────────────────────────────────────────────────────
// 보정된 4기둥 간지로 12신살(twelve)과 개별 신살 18종(stars)의 성립을 판정한다.
// 규칙표는 포스텔러 만세력 실제 출력 11개 명식으로 검증된 관측값이므로 명세
// (docs/specs/sinsal-spec.md) 그대로 하드코딩한다(규칙에서 직접 유도 금지).
// 겹침 허용: 같은 신살이 여러 번 성립하면 제거·병합 없이 전부 표기하고,
// positions(성립 기둥)로 구분한다. 신살은 중첩될수록 기운이 강한 것으로 본다.

export type PillarName = '연주' | '월주' | '일주' | '시주';

export interface Sinsal {
  /** 12신살: 월·일·시지는 연지(年支) 삼합 기준, 연지 자신은 일지(日支) 삼합 기준. */
  twelve: { year: string; month: string; day: string; hour: string | null };
  /** 개별 신살. 같은 name이 여러 번 나올 수 있음(겹침 허용). positions = 성립 기둥. */
  stars: { name: string; positions: PillarName[] }[];
}

const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/** 지지 → 소속 삼합국의 묘지(墓地, 끝 글자). 인오술(화)/사유축(금)/신자진(수)/해묘미(목). */
const TRINE_GRAVE: Readonly<Record<string, string>> = {
  인: '술', 오: '술', 술: '술',
  사: '축', 유: '축', 축: '축',
  신: '진', 자: '진', 진: '진',
  해: '미', 묘: '미', 미: '미',
};

/** 12신살 배치: 묘지의 다음 지지가 겁살, 이후 지지 순서대로. */
const TWELVE_NAMES = [
  '겁살', '재살', '천살', '지살', '년살', '월살',
  '망신살', '장성살', '반안살', '역마살', '육해살', '화개살',
];

/** 기준 지지(base)의 삼합국으로 대상 지지(target)의 12신살을 판정한다. */
function twelveGod(base: string, target: string): string {
  const start = (BRANCHES.indexOf(TRINE_GRAVE[base]) + 1) % 12; // 겁살 위치
  return TWELVE_NAMES[(BRANCHES.indexOf(target) - start + 12) % 12];
}

/**
 * 일간 기준 신살표: 일간 → 성립 지지들(문자열의 각 글자). 4기둥 지지에서 매칭(일지 포함).
 * 표는 명세 그대로. 특이 셀은 명세의 관측 확정값:
 * - 학당귀인 임 셀: 장생 규칙(신)과 관측(인)이 달라 관측표(인) 하드코딩.
 * - 홍염살 갑·을·임: 지지 2개.
 * - 문곡귀인 = 문창의 충 지지, 암록 = 정록의 육합 지지(전개값 하드코딩).
 */
const DAY_STEM_STARS: readonly { name: string; table: Readonly<Record<string, string>> }[] = [
  { name: '천을귀인', table: { 갑: '축미', 무: '축미', 경: '축미', 을: '자신', 기: '자신', 병: '해유', 정: '해유', 신: '인오', 임: '묘사', 계: '묘사' } },
  { name: '문창귀인', table: { 갑: '사', 을: '오', 병: '신', 정: '유', 무: '신', 기: '유', 경: '해', 신: '자', 임: '인', 계: '묘' } },
  { name: '문곡귀인', table: { 갑: '해', 을: '자', 병: '인', 정: '묘', 무: '인', 기: '묘', 경: '사', 신: '오', 임: '신', 계: '유' } },
  { name: '학당귀인', table: { 갑: '해', 을: '오', 병: '인', 정: '유', 무: '인', 기: '유', 경: '사', 신: '자', 임: '인', 계: '묘' } },
  { name: '관귀학관', table: { 갑: '사', 을: '사', 병: '신', 정: '신', 무: '해', 기: '해', 경: '인', 신: '인', 임: '신', 계: '신' } },
  { name: '태극귀인', table: { 갑: '자오', 을: '자오', 병: '묘유', 정: '묘유', 무: '진술축미', 기: '진술축미', 경: '인해', 신: '인해', 임: '사신', 계: '사신' } },
  { name: '정록', table: { 갑: '인', 을: '묘', 병: '사', 정: '오', 무: '사', 기: '오', 경: '신', 신: '유', 임: '해', 계: '자' } },
  { name: '암록', table: { 갑: '해', 을: '술', 병: '신', 정: '미', 무: '신', 기: '미', 경: '사', 신: '진', 임: '인', 계: '축' } },
  { name: '양인살', table: { 갑: '묘', 을: '진', 병: '오', 정: '미', 무: '오', 기: '미', 경: '유', 신: '술', 임: '자', 계: '축' } },
  { name: '금여성', table: { 갑: '진', 을: '사', 병: '미', 정: '신', 무: '미', 기: '신', 경: '술', 신: '해', 임: '축', 계: '인' } },
  { name: '홍염살', table: { 갑: '오신', 을: '오신', 병: '인', 정: '미', 무: '진', 기: '진', 경: '신', 신: '유', 임: '자신', 계: '신' } },
];

/** 현침살: 甲·辛·卯·午·未·申 — 천간·지지 모두 판정(한 기둥에서 2회 성립 가능). */
const NEEDLE_STEMS = new Set(['갑', '신']);
const NEEDLE_BRANCHES = new Set(['묘', '오', '미', '신']);

/** 괴강·백호대살: 해당 간지를 전 기둥에서 탐색. */
const GOEGANG = new Set(['경진', '경술', '임진', '임술', '무술']);
const BAEKHO = new Set(['갑진', '을미', '병술', '정축', '무진', '임술', '계축']);

/** 귀문관살 지지쌍(축-오는 제외). 인접 기둥(연월/월일/일시)에서만 성립. */
const GWIMUN_PAIRS: readonly [string, string][] = [
  ['자', '유'], ['인', '미'], ['묘', '신'], ['진', '해'], ['사', '술'],
];

/** 글자 그룹: 지지가 그룹 글자면 성립. 12신살과 겹쳐도 별도 표기(겹침 허용). */
const LETTER_GROUPS: readonly { name: string; branches: string }[] = [
  { name: '도화살', branches: '자오묘유' },
  { name: '역마살', branches: '인신사해' },
  { name: '화개살', branches: '진술축미' },
];

/**
 * 4기둥 간지(한글, 예: '임신')로 신살을 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 모든 판정에서 제외(twelve.hour = null).
 */
export function computeSinsal(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
): Sinsal {
  const pillars: { name: PillarName; stem: string; branch: string; pillar: string }[] = [
    { name: '연주', stem: yearPillar.charAt(0), branch: yearPillar.charAt(1), pillar: yearPillar },
    { name: '월주', stem: monthPillar.charAt(0), branch: monthPillar.charAt(1), pillar: monthPillar },
    { name: '일주', stem: dayPillar.charAt(0), branch: dayPillar.charAt(1), pillar: dayPillar },
  ];
  if (hourPillar) {
    pillars.push({ name: '시주', stem: hourPillar.charAt(0), branch: hourPillar.charAt(1), pillar: hourPillar });
  }

  const yearBranch = yearPillar.charAt(1);
  const dayStem = dayPillar.charAt(0);
  const dayBranch = dayPillar.charAt(1);

  // 12신살 — 혼합 기준: 월·일·시지는 연지 삼합, 연지 자신은 일지 삼합.
  const twelve: Sinsal['twelve'] = {
    year: twelveGod(dayBranch, yearBranch),
    month: twelveGod(yearBranch, monthPillar.charAt(1)),
    day: twelveGod(yearBranch, dayBranch),
    hour: hourPillar ? twelveGod(yearBranch, hourPillar.charAt(1)) : null,
  };

  const stars: Sinsal['stars'] = [];
  const add = (name: string, positions: PillarName[]) => {
    if (positions.length > 0) stars.push({ name, positions });
  };

  // 일간 기준: 4기둥 지지에서 성립 지지를 찾는다.
  for (const { name, table } of DAY_STEM_STARS) {
    const hits = table[dayStem] ?? '';
    add(name, pillars.filter((p) => hits.includes(p.branch)).map((p) => p.name));
  }

  // 현침살: 기둥마다 천간·지지 각각 판정. 둘 다 성립하면 같은 기둥이 2회 표기된다.
  const needle: PillarName[] = [];
  for (const p of pillars) {
    if (NEEDLE_STEMS.has(p.stem)) needle.push(p.name);
    if (NEEDLE_BRANCHES.has(p.branch)) needle.push(p.name);
  }
  add('현침살', needle);

  // 괴강·백호대살: 간지 자체를 전 기둥에서 탐색.
  add('괴강', pillars.filter((p) => GOEGANG.has(p.pillar)).map((p) => p.name));
  add('백호대살', pillars.filter((p) => BAEKHO.has(p.pillar)).map((p) => p.name));

  // 귀문관살: 인접 기둥 쌍마다 판정. 쌍마다 별도 entry로 표기.
  for (let i = 0; i + 1 < pillars.length; i++) {
    const [a, b] = [pillars[i], pillars[i + 1]];
    const hit = GWIMUN_PAIRS.some(
      ([x, y]) => (a.branch === x && b.branch === y) || (a.branch === y && b.branch === x),
    );
    if (hit) add('귀문관살', [a.name, b.name]);
  }

  // 글자 그룹(도화·역마·화개): 12신살과 겹쳐도 그대로 표기.
  for (const { name, branches } of LETTER_GROUPS) {
    add(name, pillars.filter((p) => branches.includes(p.branch)).map((p) => p.name));
  }

  return { twelve, stars };
}
