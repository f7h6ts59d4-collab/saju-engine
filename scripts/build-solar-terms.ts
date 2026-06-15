/**
 * 절기 절입 시각 빌드 스크립트 (월주 보정용 12절 전용)
 *
 * astronomy-engine으로 1900~2050년 12절(節)의 절입 시각을 계산해
 * `src/correction/solar-terms-precise.json`에 정적 데이터로 생성한다.
 * 빌드 시점에 한 번만 실행하는 개발 스크립트이며, 런타임에는 생성된 JSON만 쓴다.
 *
 * 알려진 함정 (docs/specs/solar-terms-build-spec.md):
 * - manseryeok 내장 SOLAR_TERMS_DATA는 참조하지 않는다. 공식 KASI와 약 12시간 어긋남.
 *   검증·생성 어디에도 쓰지 않는다.
 * - KASI 정답지 자체에도 오류가 있다(2007 라벨 오타 교정 완료, 2011 약 18시간 손상→제외).
 *   그래서 production 데이터는 KASI 복사가 아니라 계산으로 생성하고, KASI는 검증 샘플로만 쓴다.
 * - UTC→KST(UTC+9) 변환 누락이 가장 흔한 실수. 빠뜨리면 9시간 어긋나 검증에서 전부 실패한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SearchSunLongitude } from 'astronomy-engine';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TRUTH_PATH = path.join(HERE, 'kasi_solar_terms_truth_2004_2026.json');
const OUTPUT_PATH = path.join(HERE, '..', 'src', 'correction', 'solar-terms-precise.json');

const START_YEAR = 1900;
const END_YEAR = 2050;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const SEARCH_LIMIT_DAYS = 40;

interface SolarTerm {
  name: string;
  lon: number;
  kst: string;
}

/**
 * 12절(節)만 생성한다. 중기(中氣)는 월주 경계와 무관하므로 제외.
 * 양력 시간 순(소한→입춘→…→대설)으로 정렬. startMonth는 검색 시작 월(1-12).
 */
const TERMS: { name: string; lon: number; startMonth: number }[] = [
  { name: '소한', lon: 285, startMonth: 1 },
  { name: '입춘', lon: 315, startMonth: 2 },
  { name: '경칩', lon: 345, startMonth: 3 },
  { name: '청명', lon: 15, startMonth: 4 },
  { name: '입하', lon: 45, startMonth: 5 },
  { name: '망종', lon: 75, startMonth: 6 },
  { name: '소서', lon: 105, startMonth: 7 },
  { name: '입추', lon: 135, startMonth: 8 },
  { name: '백로', lon: 165, startMonth: 9 },
  { name: '한로', lon: 195, startMonth: 10 },
  { name: '입동', lon: 225, startMonth: 11 },
  { name: '대설', lon: 255, startMonth: 12 },
];

/** 절입 시각(UTC)을 ms로 구한다. 시작시각은 해당 절기의 대략적 시작 월 1일. */
function computeTermUtcMs(year: number, lon: number, startMonth: number): number {
  const start = new Date(Date.UTC(year, startMonth - 1, 1));
  const result = SearchSunLongitude(lon, start, SEARCH_LIMIT_DAYS);
  if (result === null) {
    throw new Error(`SearchSunLongitude 실패: year=${year}, lon=${lon}`);
  }
  return result.date.getTime();
}

/** UTC ms → KST 분 단위 문자열(YYYY-MM-DDTHH:mm). KASI와 동일하게 가장 가까운 분으로 반올림. */
function formatKst(utcMs: number): string {
  const kst = new Date(Math.round((utcMs + KST_OFFSET_MS) / 60000) * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}` +
    `T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
  );
}

function buildYear(year: number): SolarTerm[] {
  return TERMS.map(({ name, lon, startMonth }) => ({
    name,
    lon,
    kst: formatKst(computeTermUtcMs(year, lon, startMonth)),
  }));
}

interface Mismatch {
  year: string;
  name: string;
  computed: string;
  truth: string;
  diffMin: number;
}

/**
 * 필수 검증: KASI 정답지와 분 단위 대조. 2011년(손상)은 제외.
 * 1분을 초과하는 항목이 하나라도 있으면 빌드 실패.
 */
function validate(): void {
  const truthFile = JSON.parse(fs.readFileSync(TRUTH_PATH, 'utf-8'));
  const badYears: string[] = truthFile._meta.known_bad_years ?? [];
  const truthData: Record<string, SolarTerm[]> = truthFile.data;

  const mismatches: Mismatch[] = [];
  let checked = 0;

  for (const [year, terms] of Object.entries(truthData)) {
    if (badYears.includes(year)) continue;

    for (const truth of terms) {
      const spec = TERMS.find((t) => t.name === truth.name);
      if (!spec) throw new Error(`정답지에 알 수 없는 절기: ${truth.name}`);

      // 생성 테이블에 저장될 분 단위 값(초 절삭) 그대로 KASI와 분 단위로 대조한다.
      const computed = formatKst(computeTermUtcMs(Number(year), spec.lon, spec.startMonth));
      const diffMin = Math.abs(Date.parse(`${computed}:00Z`) - Date.parse(`${truth.kst}:00Z`)) / 60000;

      checked++;
      if (diffMin > 1) {
        mismatches.push({
          year,
          name: truth.name,
          computed,
          truth: truth.kst,
          diffMin,
        });
      }
    }
  }

  if (mismatches.length > 0) {
    console.error(`검증 실패: ${mismatches.length}건이 1분을 초과해 어긋남`);
    for (const m of mismatches) {
      console.error(
        `  ${m.year} ${m.name}: 계산=${m.computed} 정답=${m.truth} 차이=${m.diffMin}분`,
      );
    }
    process.exit(1);
  }

  console.log(`검증 통과: ${checked}건 모두 1분 이내 일치 (2011 제외)`);
}

function generate(): void {
  const data: Record<string, SolarTerm[]> = {};
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    data[String(year)] = buildYear(year);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(
    `생성 완료: ${START_YEAR}~${END_YEAR} ${Object.keys(data).length}개 연도 → ${OUTPUT_PATH}`,
  );
}

// 검증 통과 후에만 전 범위 파일을 기록한다.
validate();
generate();
