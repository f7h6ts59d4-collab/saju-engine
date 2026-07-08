/**
 * 검증된 자체 절기 테이블(solar-terms-precise.json) 공용 접근 모듈.
 * 연주·월주 판정(correct-pillars)과 대운(major-luck)이 함께 쓴다.
 */

import SOLAR_TERMS from './solar-terms-precise.json';

export interface SolarTermEntry {
  name: string;
  lon: number;
  kst: string; // "YYYY-MM-DDTHH:MM" (KST = UTC+9 벽시계)
}

export const TERMS = SOLAR_TERMS as Record<string, SolarTermEntry[]>;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 절기 테이블의 KST 벽시계 문자열을 UTC 순간(ms)으로 환산. */
export function termUtcMs(kst: string): number {
  const [datePart, timePart] = kst.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - KST_OFFSET_MS;
}
