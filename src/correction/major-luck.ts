// ─── 대운(大運) ─────────────────────────────────────────────────────────────
// 방향은 연간 음양+성별(양남·음녀 순행), 대운수는 출생~인접 절(節) 일수÷3(3일=1년),
// 간지는 월주에서 60갑자 순/역행 나열. 절기 테이블은 연 12개 節만 담고 있어
// 중기(中氣) 필터가 필요 없다.

import { getPillarById } from '../data/sixty-pillars';
import { isYangStem, tenGod, branchGod } from './ten-gods';
import { TERMS, termUtcMs } from './solar-terms-table';
import type { CorrectedSaju } from './correct-pillars';

const MAJOR_LUCK_CYCLE_COUNT = 10; // 약 100세 전후까지 나열
const DAYS_PER_LUCK_YEAR = 3; // 3일 = 1년
const DAY_MS = 86400000;

/** 출생 직전(prev)·직후(next) 절(節)의 입절 UTC(ms)를 구한다. */
function adjacentTermUtcs(birthUtcMs: number, year: number): { prev: number; next: number } {
  const utcs: number[] = [];
  for (const y of [year - 1, year, year + 1]) {
    const list = TERMS[String(y)];
    if (!list) continue;
    for (const t of list) utcs.push(termUtcMs(t.kst));
  }
  utcs.sort((a, b) => a - b);

  let prev = utcs[0];
  let next = utcs[utcs.length - 1];
  for (const u of utcs) {
    if (u <= birthUtcMs) prev = u;
    else {
      next = u;
      break;
    }
  }
  return { prev, next };
}

/** 대운 조립: 방향 → 대운수 → 간지 나열(십성 포함). */
export function buildMajorLuck(
  gender: 'male' | 'female',
  yearStem: string,
  monthId: number,
  dayMaster: string,
  birthUtcMs: number,
  year: number
): NonNullable<CorrectedSaju['majorLuck']> {
  // 양년생 남성·음년생 여성 → 순행, 그 외 → 역행.
  const forward = isYangStem(yearStem) === (gender === 'male');

  // 대운수: 순행은 다음 절, 역행은 이전 절까지의 일수 ÷ 3. 반올림(나머지 1 버림·2 올림),
  // 절입 직전·직후 출생으로 0이 나오면 관례대로 1세 시작.
  const { prev, next } = adjacentTermUtcs(birthUtcMs, year);
  const diffDays = (forward ? next - birthUtcMs : birthUtcMs - prev) / DAY_MS;
  const startAge = Math.max(1, Math.round(diffDays / DAYS_PER_LUCK_YEAR));

  const cycles = [];
  for (let i = 1; i <= MAJOR_LUCK_CYCLE_COUNT; i++) {
    const p = getPillarById((((monthId + (forward ? i : -i)) % 60) + 60) % 60);
    const age = startAge + (i - 1) * 10;
    cycles.push({
      startAge: age,
      endAge: age + 9,
      pillar: p.combined.hangul,
      pillarHanja: p.combined.hanja,
      heavenlyGod: tenGod(dayMaster, p.tiangan.hangul),
      earthlyGod: branchGod(dayMaster, p.dizhi.hangul),
    });
  }

  return { direction: forward ? '순행' : '역행', startAge, cycles };
}
