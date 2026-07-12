// ─── 12운성(十二運星) ───────────────────────────────────────────────────────
// 일간이 각 지지에서 갖는 기운의 강약을 생로병사 12단계로 매긴다.
// 일간의 장생지(화토동법: 무는 병과, 기는 정과 동일)에서 시작해 양간은 지지
// 순행, 음간은 역행으로 배치한다. 표는 명세(docs/specs/twelve-stages-spec.md)
// 그대로이며 5명식 20셀 대조 검증 완료. 원국·대운 양쪽에서 재사용하는 리프 모듈.

const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/** 12단계: 장생지에서 진행 방향으로 순서대로 배치된다. */
const STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];

/** 일간 → 장생지 (화토동법: 무=병, 기=정). */
const BIRTH_BRANCH: Readonly<Record<string, string>> = {
  갑: '해', 을: '오', 병: '인', 정: '유', 무: '인',
  기: '유', 경: '사', 신: '자', 임: '신', 계: '묘',
};

/** 일간(dayStem) 기준 대상 지지(branch)의 12운성. 양간 순행·음간 역행. */
export function lifeStage(dayStem: string, branch: string): string {
  const start = BRANCHES.indexOf(BIRTH_BRANCH[dayStem]);
  const forward = STEMS.indexOf(dayStem) % 2 === 0; // 갑·병·무·경·임 = 양간
  const steps = (BRANCHES.indexOf(branch) - start) * (forward ? 1 : -1);
  return STAGES[(steps + 12) % 12];
}
