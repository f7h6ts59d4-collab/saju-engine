// ─── 월주·연주 판정 ─────────────────────────────────────────────────────────
// 절기 절입(분 단위, UTC 비교)으로 사주월과 입춘 경계 연주를 판정한다.

import { calculateSaju, type SajuResult } from '../core/saju';
import { STEMS } from './ten-gods';
import { TERMS, termUtcMs } from './solar-terms-table';

/** 절기명 → 사주월(1=인월 … 11=자월, 12=축월). */
const SAJU_MONTH_BY_TERM: Readonly<Record<string, number>> = {
  입춘: 1,
  경칩: 2,
  청명: 3,
  입하: 4,
  망종: 5,
  소서: 6,
  입추: 7,
  백로: 8,
  한로: 9,
  입동: 10,
  대설: 11,
  소한: 12,
};

/** 年上起月法: 연간(0~9)에 따른 인월(寅月)의 60갑자 시작 id. */
const MONTH_PILLAR_BASE: readonly number[] = [2, 14, 26, 38, 50];

/** 年上起月法으로 월주 60갑자 id를 구한다. */
export function monthPillarId(yearStem: string, sajuMonth: number): number {
  const base = MONTH_PILLAR_BASE[STEMS.indexOf(yearStem) % 5];
  return (base + sajuMonth - 1) % 60;
}

/**
 * 출생 순간(UTC)이 속한 절기로 사주월을 판정한다.
 * 인접 연도까지 모아 절입 시각 오름차순으로 정렬한 뒤, 출생 이전의 가장 최근 절입을 택한다.
 */
export function resolveSajuMonth(birthUtcMs: number, year: number): number {
  const terms: { utc: number; name: string }[] = [];
  for (const y of [year - 1, year, year + 1]) {
    const list = TERMS[String(y)];
    if (!list) continue;
    for (const t of list) terms.push({ utc: termUtcMs(t.kst), name: t.name });
  }
  terms.sort((a, b) => a.utc - b.utc);

  let governing: string | undefined;
  for (const t of terms) {
    if (t.utc <= birthUtcMs) governing = t.name;
    else break;
  }
  // 데이터 시작 이전(예: 1900-01 소한 전)에는 직전 대설(자월) 기준으로 폴백.
  return governing ? SAJU_MONTH_BY_TERM[governing] : 11;
}

/**
 * 연주 보정: 입춘 절입 '전' 출생이면 엔진의 전날 연주를 빌려 전년으로 되돌린다.
 * 엔진의 연주 경계는 입춘 '날짜'에 맞춰져 있어, 입춘 당일 절입 전 시각만 어긋난다.
 */
export function resolveYearPillar(
  base: SajuResult,
  year: number,
  month: number,
  day: number,
  birthUtcMs: number
): { hangul: string; hanja: string } {
  const ipchun = TERMS[String(year)]?.find((t) => t.name === '입춘');
  if (ipchun) {
    const [iy, im, id] = ipchun.kst.slice(0, 10).split('-').map(Number);
    const onIpchunDate = year === iy && month === im && day === id;
    if (onIpchunDate && birthUtcMs < termUtcMs(ipchun.kst)) {
      const prev = new Date(Date.UTC(iy, im - 1, id) - 86400000);
      const borrowed = calculateSaju(
        prev.getUTCFullYear(),
        prev.getUTCMonth() + 1,
        prev.getUTCDate(),
        12,
        0,
        { applyTimeCorrection: false }
      );
      return { hangul: borrowed.yearPillar, hanja: borrowed.yearPillarHanja };
    }
  }
  return { hangul: base.yearPillar, hanja: base.yearPillarHanja };
}
