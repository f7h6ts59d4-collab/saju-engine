// ─── 합충형파해(合沖刑破害)·공망(空亡) ──────────────────────────────────────
// 보정된 4기둥의 천간·지지 상호관계(합·충·형·파·해·원진)와 순중공망을 판정한다.
// 규칙표는 포스텔러 만세력 실제 출력 명식으로 검증된 관측값이므로 명세
// (docs/specs/relations-spec.md) 그대로 하드코딩한다. 검증으로 확정된 3가지:
// (1) 천간충은 10쌍(같은 음양 + 오행 상극), (2) 부분형(삼형 중 2개)은 제외,
// (3) 반합은 삼합 부분 + 방합 부분 모두 포함.
// 겹침 허용(신살과 동일): 같은 쌍이 여러 관계에 해당하면 전부 별도 표기.
// 합화(合化) 판정은 하지 않는다 — 합 성립 사실만 내고 오행은 참고 필드.

export type PillarName = '연주' | '월주' | '일주' | '시주';

export type RelationType =
  | '천간합' | '천간충' | '육합' | '삼합' | '삼합반합' | '방합' | '방합반합'
  | '충' | '삼형' | '상형' | '자형' | '파' | '해' | '원진';

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

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/** 천간합 5쌍 — 이름은 표 순서 고정(예: 연간 임 + 월간 정 → '정임합'). */
const STEM_HAP = [
  { pair: '갑기', name: '갑기합', element: '토' },
  { pair: '을경', name: '을경합', element: '금' },
  { pair: '병신', name: '병신합', element: '수' },
  { pair: '정임', name: '정임합', element: '목' },
  { pair: '무계', name: '무계합', element: '화' },
] as const;

/**
 * 천간충 10쌍(같은 음양 + 오행 상극). 이름은 극을 당하는 천간이 앞 —
 * 관측(P 임무충, Q 갑경충)을 재현하고 전통 4쌍 명칭(갑경·을신·병임·정계충)과 일치.
 */
const STEM_CHUNG = [
  { pair: '갑무', name: '무갑충' },
  { pair: '갑경', name: '갑경충' },
  { pair: '병경', name: '경병충' },
  { pair: '병임', name: '병임충' },
  { pair: '무임', name: '임무충' },
  { pair: '을기', name: '기을충' },
  { pair: '을신', name: '을신충' },
  { pair: '정신', name: '신정충' },
  { pair: '정계', name: '정계충' },
  { pair: '기계', name: '계기충' },
] as const;

/** 지지 육합 6쌍 — 참고 오행. */
const YUKHAP = [
  { pair: '자축', name: '자축합', element: '토' },
  { pair: '인해', name: '인해합', element: '목' },
  { pair: '묘술', name: '묘술합', element: '화' },
  { pair: '진유', name: '진유합', element: '금' },
  { pair: '사신', name: '사신합', element: '수' },
  { pair: '오미', name: '오미합', element: '토' },
] as const;

/** 지지 삼합 4국. 3지지 모두 → 삼합, 서로 다른 2지지만 → 삼합반합. */
const SAMHAP = [
  { group: '인오술', element: '화' },
  { group: '사유축', element: '금' },
  { group: '신자진', element: '수' },
  { group: '해묘미', element: '목' },
] as const;

/** 지지 방합 4국. 3지지 모두 → 방합, 서로 다른 2지지만 → 방합반합(Q 인진반합). */
const BANGHAP = [
  { group: '인묘진', element: '목' },
  { group: '사오미', element: '화' },
  { group: '신유술', element: '금' },
  { group: '해자축', element: '수' },
] as const;

const JIJI_CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];
/** 삼형: 3지지 전부 있을 때만 성립(부분형 제외 — 명세 검증 확정). */
const SAMHYEONG = ['인사신', '축술미'];
const SANGHYEONG = '자묘';
/** 자형: 같은 지지 2개 이상. */
const JAHYEONG = new Set(['진', '오', '유', '해']);
const PA = ['자유', '축진', '인해', '묘오', '사신', '술미'];
const HAE = ['자미', '축오', '인사', '묘진', '신해', '유술'];
const WONJIN = ['자미', '축오', '인유', '묘신', '진해', '사술'];

/** 순중공망: 순(旬) 인덱스(일주 60갑자 ÷ 10) → 공망 지지 2개. */
const GONGMANG_BY_SOON = [
  ['술', '해'], ['신', '유'], ['오', '미'], ['진', '사'], ['인', '묘'], ['자', '축'],
];

interface PillarInfo {
  name: PillarName;
  stem: string;
  branch: string;
  /** 기둥 위치: 연 0 · 월 1 · 일 2 · 시 3. 인접 판정에 쓴다. */
  idx: number;
}

function buildPillars(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
): PillarInfo[] {
  const names: PillarName[] = ['연주', '월주', '일주', '시주'];
  const raw = [yearPillar, monthPillar, dayPillar, hourPillar];
  const pillars: PillarInfo[] = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    if (p) pillars.push({ name: names[i], stem: p.charAt(0), branch: p.charAt(1), idx: i });
  }
  return pillars;
}

/** 두 글자가 pair 문자열과 일치하는가(순서 무관). */
function isPair(pair: string, a: string, b: string): boolean {
  return (
    (pair.charAt(0) === a && pair.charAt(1) === b) ||
    (pair.charAt(0) === b && pair.charAt(1) === a)
  );
}

/** 성립 기둥들이 연달아 붙어 있으면 인접(쌍이면 연월·월일·일시). */
function isAdjacent(ps: PillarInfo[]): boolean {
  const idxs = ps.map((p) => p.idx);
  return Math.max(...idxs) - Math.min(...idxs) === ps.length - 1;
}

/**
 * 4기둥 간지(한글, 예: '임신')로 합충형파해를 판정한다.
 * hourPillar가 null이면 시간 모름 → 시주는 모든 판정에서 제외.
 * 출력 순서는 결정적: 타입은 RelationType 나열 순서, 같은 타입 안에서는
 * 규칙표 행 → 기둥 쌍(연월·연일·연시·월일·월시·일시) 순서.
 */
export function computeRelations(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
): Relation[] {
  const pillars = buildPillars(yearPillar, monthPillar, dayPillar, hourPillar);
  const pairs: [PillarInfo, PillarInfo][] = [];
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) pairs.push([pillars[i], pillars[j]]);
  }

  const relations: Relation[] = [];
  const add = (type: RelationType, name: string, ps: PillarInfo[], element?: string) => {
    relations.push({
      type,
      name,
      ...(element !== undefined && { element }),
      positions: ps.map((p) => p.name),
      adjacent: isAdjacent(ps),
    });
  };

  // 쌍 규칙표 공통 판정: 표의 각 쌍을 모든 기둥 쌍에 대조한다.
  const scanPairs = (
    type: RelationType,
    table: readonly { pair: string; name: string; element?: string }[],
    pick: (p: PillarInfo) => string,
  ) => {
    for (const { pair, name, element } of table) {
      for (const [a, b] of pairs) {
        if (isPair(pair, pick(a), pick(b))) add(type, name, [a, b], element);
      }
    }
  };

  // 삼합·방합: 국의 서로 다른 지지가 3개 모두 있으면 전체 성립(해당 기둥 전부),
  // 2개만 있으면 그 두 지지를 가진 기둥 쌍마다 반합.
  const scanGroups = (
    groups: readonly { group: string; element: string }[],
    fullType: RelationType,
    halfType: RelationType,
  ) => {
    for (const { group, element } of groups) {
      const present = [...group].filter((ch) => pillars.some((p) => p.branch === ch));
      if (present.length === 3) {
        add(fullType, group + fullType, pillars.filter((p) => group.includes(p.branch)), element);
      } else if (present.length === 2) {
        for (const [a, b] of pairs) {
          if (a.branch !== b.branch && group.includes(a.branch) && group.includes(b.branch)) {
            add(halfType, present.join('') + '반합', [a, b], element);
          }
        }
      }
    }
  };

  scanPairs('천간합', STEM_HAP, (p) => p.stem);
  scanPairs('천간충', STEM_CHUNG, (p) => p.stem);
  scanPairs('육합', YUKHAP, (p) => p.branch);
  scanGroups(SAMHAP, '삼합', '삼합반합');
  scanGroups(BANGHAP, '방합', '방합반합');
  scanPairs('충', JIJI_CHUNG.map((pair) => ({ pair, name: pair + '충' })), (p) => p.branch);

  for (const group of SAMHYEONG) {
    const present = [...group].filter((ch) => pillars.some((p) => p.branch === ch));
    if (present.length === 3) {
      add('삼형', group + '삼형', pillars.filter((p) => group.includes(p.branch)));
    }
  }
  for (const [a, b] of pairs) {
    if (isPair(SANGHYEONG, a.branch, b.branch)) add('상형', SANGHYEONG + '상형', [a, b]);
  }
  for (const [a, b] of pairs) {
    if (a.branch === b.branch && JAHYEONG.has(a.branch)) {
      add('자형', a.branch + b.branch + '자형', [a, b]);
    }
  }

  scanPairs('파', PA.map((pair) => ({ pair, name: pair + '파' })), (p) => p.branch);
  scanPairs('해', HAE.map((pair) => ({ pair, name: pair + '해' })), (p) => p.branch);
  scanPairs('원진', WONJIN.map((pair) => ({ pair, name: pair + '원진' })), (p) => p.branch);

  return relations;
}

/** 간·지 인덱스에서 60갑자 인덱스 복원(i ≡ 간 mod 10, i ≡ 지 mod 12). */
function sixtyIndex(stem: string, branch: string): number {
  return (6 * STEMS.indexOf(stem) - 5 * BRANCHES.indexOf(branch) + 60) % 60;
}

/**
 * 일주 기준 순중공망을 판정한다. 공망 지지 2개와, 연·월·시지 중 공망에
 * 해당하는 기둥을 낸다(일지는 기준이라 제외). hourPillar가 null이면 시주 제외.
 */
export function computeGongmang(
  yearPillar: string,
  monthPillar: string,
  dayPillar: string,
  hourPillar: string | null,
): Gongmang {
  const soon = Math.floor(sixtyIndex(dayPillar.charAt(0), dayPillar.charAt(1)) / 10);
  const branches = GONGMANG_BY_SOON[soon];

  const targets: { name: PillarName; branch: string }[] = [
    { name: '연주', branch: yearPillar.charAt(1) },
    { name: '월주', branch: monthPillar.charAt(1) },
  ];
  if (hourPillar) targets.push({ name: '시주', branch: hourPillar.charAt(1) });

  return {
    branches: [...branches],
    positions: targets.filter((t) => branches.includes(t.branch)).map((t) => t.name),
  };
}
