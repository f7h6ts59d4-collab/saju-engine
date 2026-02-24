# Issue #5 개발계획: 월주(monthPillarId) 절기 기준 재계산

## 개요

| 항목 | 내용 |
|------|------|
| 이슈 | [#5](https://github.com/urstory/manseryeok-js/issues/5) 월주가 음력 월초 기준으로 계산됨 |
| 해결 방안 | 방안 C - 데이터 재생성 (compress 단계에서 monthPillarId 재계산) |
| 패키지 | `@fullstackfamily/manseryeok` v1.0.6 → v1.0.7 |
| 영향 범위 | 전체 날짜의 ~18% (약 9,000~10,000일)의 monthPillarId 보정 |

---

## 작업 순서

```
Step 1. getSajuMonth() 기본값 버그 수정
  ↓
Step 2. compress-date-index.ts에 오호둔법 재계산 로직 + 독립 검증 벡터 추가
       + jest.config.cjs moduleNameMapper 추가
  ↓
Step 3. 데이터 재생성 (npm run compress-data)
  ↓
Step 4. 테스트 코드 업데이트 및 실행 (경계 연도 포함)
  ↓
Step 5. 빌드 및 검증
  ↓
Step 6. 버전 업데이트 (1.0.6 → 1.0.7)
```

---

## Step 1. getSajuMonth() 기본값 버그 수정

### 대상 파일

`src/core/solar-term.ts` 226줄

### 현재 코드

```typescript
// L225-226
// 1월 소한 이전은 축월(12)
return 12;
```

### 수정 코드

```typescript
// 1월 소한 이전은 자월(11) (대설 12/7 ~ 소한 1/6 구간)
return 11;
```

### 근거

| 기간 | 절기 | 올바른 사주 월 |
|------|------|---------------|
| 12/7 ~ 1/5 | 대설 후 ~ 소한 전 | 자월 (11) |
| 1/6 ~ 2/3 | 소한 후 ~ 입춘 전 | 축월 (12) |

1월 1일~5일은 대설(12/7)과 소한(1/6) 사이이므로 자월(11)이 맞음.

---

## Step 2. compress-date-index.ts에 오호둔법 재계산 로직 추가

### 대상 파일

`scripts/compress-date-index.ts`

### 2-1. import 추가

파일 상단(L20 부근)에 `getSajuMonth` import 추가:

```typescript
import { getSajuMonth } from '../src/core/solar-term';
```

### 2-2. 오호둔법 함수 추가

`encodeEntry()` 함수 위(L30 부근)에 추가:

```typescript
/**
 * 年上起月法(오호둔법)으로 올바른 monthPillarId 계산
 *
 * 연간(年干)에 따른 인월(寅月, sajuMonth=1) 시작 60갑자 ID:
 *   갑(0)/기(5) → 丙寅 (id=2)
 *   을(1)/경(6) → 戊寅 (id=14)
 *   병(2)/신(7) → 庚寅 (id=26)
 *   정(3)/임(8) → 壬寅 (id=38)
 *   무(4)/계(9) → 甲寅 (id=50)
 */
const MONTH_PILLAR_BASE = [2, 14, 26, 38, 50] as const;

function computeCorrectMonthPillarId(
  solarMonth: number,
  solarDay: number,
  yearPillarId: number
): number {
  const sajuMonth = getSajuMonth(solarMonth, solarDay);
  const yearStemIndex = yearPillarId % 10; // 천간 인덱스 (0~9)
  const basePillarId = MONTH_PILLAR_BASE[yearStemIndex % 5];
  return (basePillarId + sajuMonth - 1) % 60;
}
```

### 2-3. encodeEntry() 함수 수정

`encodeEntry()` 함수(L32~60)에서 monthPillarId를 재계산하도록 수정:

현재 코드 (L48-49):
```typescript
const yearPillarId = entry.gapja.yearPillarId;
const monthPillarId = entry.gapja.monthPillarId;
```

수정 코드:
```typescript
const yearPillarId = entry.gapja.yearPillarId;
// 월주를 절기 기준으로 재계산 (원본 데이터는 음력 월초 기준으로 잘못됨)
const monthPillarId = computeCorrectMonthPillarId(
  entry.solar.month,
  entry.solar.day,
  yearPillarId
);
```

### 2-4. verifyCompression() 함수 수정

검증 함수(L106~166)에서 monthPillarId 비교 기준도 변경. 원본 데이터의 monthPillarId와 비교하면 당연히 불일치하므로, 재계산된 값과 비교하도록 수정:

현재 코드 (L147~155):
```typescript
// dayPillarId는 원본 데이터에 버그가 있으므로 비교에서 제외
if (
  original.jd !== jd ||
  original.lunar.year !== lunarYear ||
  original.lunar.month !== lunarMonth ||
  original.lunar.day !== lunarDay ||
  original.lunar.isLeap !== isLeap ||
  original.gapja.yearPillarId !== yearPillarId ||
  original.gapja.monthPillarId !== monthPillarId
) {
```

수정 코드:
```typescript
// dayPillarId는 원본 데이터에 버그가 있으므로 비교에서 제외
// monthPillarId는 절기 기준으로 재계산했으므로 재계산된 값과 비교
const expectedMonthPillarId = computeCorrectMonthPillarId(
  original.solar.month,
  original.solar.day,
  original.gapja.yearPillarId
);
if (
  original.jd !== jd ||
  original.lunar.year !== lunarYear ||
  original.lunar.month !== lunarMonth ||
  original.lunar.day !== lunarDay ||
  original.lunar.isLeap !== isLeap ||
  original.gapja.yearPillarId !== yearPillarId ||
  expectedMonthPillarId !== monthPillarId
) {
```

### 2-5. 독립 검증 벡터 추가 (verifyCompression 보완)

인코딩과 검증이 같은 `computeCorrectMonthPillarId()`를 공유하면, 공식 자체가 틀려도 "0 errors"가 나올 수 있다. 외부 검증된 고정 정답셋으로 독립 검증한다.

`verifyCompression()` 함수 끝(`return errors === 0;` 직전)에 추가:

```typescript
  // 독립 검증: 외부 검증된 고정 정답셋 (오호둔법 기준표)
  // 입춘 당일(인월 시작)은 모든 사주 전문서에서 일치하는 정답
  const KNOWN_VECTORS: Array<{ key: string; dayIdx: number; expectedMPId: number; desc: string }> = [
    { key: '2024-02', dayIdx: 3, expectedMPId: 2,  desc: '甲辰年 인월 丙寅(2)' },
    { key: '2025-02', dayIdx: 3, expectedMPId: 14, desc: '乙巳年 인월 戊寅(14)' },
    { key: '1996-02', dayIdx: 3, expectedMPId: 26, desc: '丙子年 인월 庚寅(26)' },
    { key: '1997-02', dayIdx: 3, expectedMPId: 38, desc: '丁丑年 인월 壬寅(38)' },
    { key: '1998-02', dayIdx: 3, expectedMPId: 50, desc: '戊寅年 인월 甲寅(50)' },
  ];

  console.log('Verifying known-correct vectors...');
  for (const vec of KNOWN_VECTORS) {
    const keyIdx = monthKeys.indexOf(vec.key);
    if (keyIdx === -1) { console.error(`Key not found: ${vec.key}`); return false; }
    let offset = 0;
    for (let k = 0; k < keyIdx; k++) offset += dayCounts[k] * 3;
    offset += vec.dayIdx * 3;
    const packed = dataBytes[offset] | (dataBytes[offset + 1] << 8) | (dataBytes[offset + 2] << 16);
    const mpId = (packed >> 18) & 0x3f;
    if (mpId !== vec.expectedMPId) {
      console.error(`VECTOR FAIL: ${vec.desc} - expected ${vec.expectedMPId}, got ${mpId}`);
      errors++;
    }
  }
  console.log(`Known vectors: ${KNOWN_VECTORS.length} checked, ${errors} errors`);
```

### 2-6. jest.config.cjs에 moduleNameMapper 추가

런타임(src)과 테스트(Jest)에서 `../data/date-index`를 import하면 원본 데이터(11.4MB)를 읽는다. 원본에는 여전히 음력 기준 monthPillarId가 들어있어 Step 4 테스트가 실패한다.

빌드 시에만 적용되는 rollup alias와 동일한 매핑을 Jest에도 추가:

```javascript
// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '(.*)/data/date-index$': '$1/data/date-index-compressed'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

> ⚠️ 이 변경은 Step 3(`npm run compress-data`)에서 `date-index-compressed.ts`가 먼저 생성된 후에만 테스트가 동작한다. Step 3 → Step 4 순서를 반드시 지켜야 한다.

---

## Step 3. 데이터 재생성

### 실행

```bash
cd /Users/toto/devel/myprojects/saju/manseryeok-js
npm run compress-data
```

### 예상 결과

- `src/data/date-index-compressed.ts` 파일이 재생성됨
- 파일 크기는 거의 동일 (~230KB) - 비트 패킹 구조 변경 없음, 값만 변경
- 약 9,000~10,000개 엔트리의 monthPillarId가 변경됨
- 검증 통과 메시지: `Verified 55151 entries, 0 errors`

---

## Step 4. 테스트 코드 업데이트

### 4-1. getSajuMonth() 테스트 수정

대상 파일: `src/__tests__/solar-terms.test.ts`

현재 테스트 (L161~163):
```typescript
// 1월 (소한 이전 = 축월(12))
expect(getSajuMonth(1, 1)).toBe(12);
```

수정:
```typescript
// 1월 소한 이전 = 자월(11) (대설 12/7 ~ 소한 1/6 구간)
expect(getSajuMonth(1, 1)).toBe(11);
```

### 4-2. 월주 절기 기준 검증 테스트 추가

대상 파일: `src/__tests__/solar-lunar-converter.test.ts`

파일 끝에 새 describe 블록 추가:

```typescript
describe('월주 절기 기준 검증 (Issue #5)', () => {
  describe('1996년(丙子年) 전체 월 순환', () => {
    const cases = [
      { date: [1996, 2, 4], expected: '庚寅', desc: '인월 (입춘)' },
      { date: [1996, 3, 6], expected: '辛卯', desc: '묘월 (경칩)' },
      { date: [1996, 4, 5], expected: '壬辰', desc: '진월 (청명)' },
      { date: [1996, 5, 6], expected: '癸巳', desc: '사월 (입하)' },
      { date: [1996, 6, 6], expected: '甲午', desc: '오월 (망종)' },
      { date: [1996, 7, 7], expected: '乙未', desc: '미월 (소서)' },
      { date: [1996, 8, 8], expected: '丙申', desc: '신월 (입추)' },
      { date: [1996, 9, 8], expected: '丁酉', desc: '유월 (백로)' },
      { date: [1996, 10, 8], expected: '戊戌', desc: '술월 (한로)' },
      { date: [1996, 11, 8], expected: '己亥', desc: '해월 (입동)' },
      { date: [1996, 12, 7], expected: '庚子', desc: '자월 (대설)' },
    ];

    cases.forEach(({ date, expected, desc }) => {
      test(`${date.join('-')} → ${expected} (${desc})`, () => {
        const gapja = getGapja(date[0], date[1], date[2]);
        expect(gapja.monthPillarHanja).toBe(expected);
      });
    });
  });

  describe('절기 경계 검증', () => {
    test('소한 전 (1996-01-01) → 자월 戊子', () => {
      expect(getGapja(1996, 1, 1).monthPillarHanja).toBe('戊子');
    });

    test('소한 후 (1996-01-06) → 축월 己丑', () => {
      expect(getGapja(1996, 1, 6).monthPillarHanja).toBe('己丑');
    });

    test('입춘 전 (1996-02-03) → 축월 己丑', () => {
      expect(getGapja(1996, 2, 3).monthPillarHanja).toBe('己丑');
    });

    test('입춘 당일 (1996-02-04) → 인월 庚寅', () => {
      expect(getGapja(1996, 2, 4).monthPillarHanja).toBe('庚寅');
    });

    test('청명 전 (1996-04-04) → 묘월 辛卯', () => {
      expect(getGapja(1996, 4, 4).monthPillarHanja).toBe('辛卯');
    });

    test('청명 당일 (1996-04-05) → 진월 壬辰', () => {
      expect(getGapja(1996, 4, 5).monthPillarHanja).toBe('壬辰');
    });
  });

  describe('오호둔법 연간별 검증', () => {
    // 갑/기년 → 병인(丙寅) 시작
    test('2024 갑진년 인월 → 丙寅', () => {
      expect(getGapja(2024, 2, 4).monthPillarHanja).toBe('丙寅');
    });

    // 을/경년 → 무인(戊寅) 시작
    test('2025 을사년 인월 → 戊寅', () => {
      expect(getGapja(2025, 2, 4).monthPillarHanja).toBe('戊寅');
    });

    // 병/신년 → 경인(庚寅) 시작
    test('1996 병자년 인월 → 庚寅', () => {
      expect(getGapja(1996, 2, 4).monthPillarHanja).toBe('庚寅');
    });

    // 정/임년 → 임인(壬寅) 시작
    test('1997 정축년 인월 → 壬寅', () => {
      expect(getGapja(1997, 2, 4).monthPillarHanja).toBe('壬寅');
    });

    // 무/계년 → 갑인(甲寅) 시작
    test('1998 무인년 인월 → 甲寅', () => {
      expect(getGapja(1998, 2, 4).monthPillarHanja).toBe('甲寅');
    });
  });

  describe('경계 연도 검증', () => {
    // 데이터 범위 시작 연도 (1900 庚子年)
    test('1900-02-05 경자년 인월 → 戊寅', () => {
      expect(getGapja(1900, 2, 5).monthPillarHanja).toBe('戊寅');
    });

    test('1900-01-01 기해년 자월 → 丙子', () => {
      expect(getGapja(1900, 1, 1).monthPillarHanja).toBe('丙子');
    });

    // 데이터 범위 끝 연도 (2050 庚午年)
    test('2050-02-04 경오년 인월 → 戊寅', () => {
      expect(getGapja(2050, 2, 4).monthPillarHanja).toBe('戊寅');
    });

    test('2050-12-07 경오년 자월 → 戊子', () => {
      expect(getGapja(2050, 12, 7).monthPillarHanja).toBe('戊子');
    });
  });
});
```

### 4-3. 기존 테스트 확인

기존 테스트 중 데이터 변경으로 깨질 수 있는 케이스:

| 테스트 | 검증 내용 | 예상 |
|--------|-----------|------|
| `getGapja(1984, 2, 4)` → monthPillar='병인' | 입춘 당일 | 통과 (절기 당일이므로 값 동일) |
| `solarToLunar(2024, 2, 10)` → yearPillar='갑진' | 년주 검증 | 통과 (yearPillarId 변경 없음) |
| `solarToLunar(1984, 2, 4)` → yearPillar='갑자' | 년주 검증 | 통과 |

대부분의 기존 테스트는 입춘 당일이나 년주 검증이므로 깨지지 않을 것으로 예상. 만약 깨지는 테스트가 있다면 올바른 값으로 기댓값 업데이트.

### 4-4. 테스트 실행

```bash
cd /Users/toto/devel/myprojects/saju/manseryeok-js
npm test
```

---

## Step 5. 빌드 및 검증

### 5-1. 타입 체크

```bash
npm run typecheck
```

### 5-2. 빌드

```bash
npm run build
```

빌드 과정에서 `prebuild` 훅으로 `npm run compress-data`가 자동 실행됨. rollup alias가 `date-index` → `date-index-compressed`로 치환하여 번들 생성.

### 5-3. 빌드 결과물 검증

생성되는 파일:
- `dist/index.js` (CJS)
- `dist/index.esm.js` (ESM)
- `dist/index.d.ts` (타입 선언)

---

## Step 6. 버전 업데이트

### 6-1. package.json 버전 변경

```json
"version": "1.0.7"
```

### 6-2. 커밋 및 태그

```bash
git add -A
git commit -m "fix: 월주(monthPillarId) 절기 기준 재계산 (Issue #5)

- getSajuMonth() 기본값 버그 수정 (축월→자월)
- compress-date-index.ts에 오호둔법 재계산 로직 추가
- date-index-compressed.ts 데이터 재생성
- 월주 절기 기준 검증 테스트 추가"

git tag v1.0.7
```

---

## 수정 파일 요약

| 파일 | 변경 내용 | 변경량 |
|------|-----------|--------|
| `src/core/solar-term.ts:226` | 기본값 `12` → `11` | 1줄 |
| `scripts/compress-date-index.ts` | import 추가, `computeCorrectMonthPillarId()` 추가, `encodeEntry()` 수정, `verifyCompression()` 수정, 독립 검증 벡터 추가 | ~50줄 |
| `src/data/date-index-compressed.ts` | 자동 재생성 (npm run compress-data) | 전체 |
| `jest.config.cjs` | `moduleNameMapper` 추가 (date-index → date-index-compressed) | 3줄 |
| `src/__tests__/solar-terms.test.ts` | getSajuMonth(1,1) 기댓값 수정 | 1줄 |
| `src/__tests__/solar-lunar-converter.test.ts` | 월주 절기 검증 테스트 추가 (경계 연도 포함) | ~85줄 |
| `package.json` | version 1.0.6 → 1.0.7 | 1줄 |

---

## 검증 체크리스트

- [ ] `getSajuMonth(1, 1)` → `11` (자월) 반환
- [ ] `getSajuMonth(1, 6)` → `12` (축월) 반환
- [ ] `npm run compress-data` 성공 (0 errors, 독립 검증 벡터 통과)
- [ ] jest.config.cjs `moduleNameMapper` 적용 확인
- [ ] `npm test` 전체 통과
- [ ] 1996년 전체 월 순환 테스트 통과
- [ ] 절기 경계 테스트 통과 (소한, 입춘, 청명 전후)
- [ ] 오호둔법 5개 연간 유형 테스트 통과
- [ ] 경계 연도 테스트 통과 (1900, 2050)
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 성공
- [ ] 기존 테스트 깨지지 않음

---

## 알려진 제한사항

| 항목 | 내용 | 영향도 |
|------|------|--------|
| 고정 절기일 | `getSajuMonth()`가 매년 동일한 날짜 사용 (입춘=2/4, 경칩=3/6 등) | 실제 절기는 연도별 1~2일 차이 가능. 사주 업계에서 고정일 방식도 통용됨 |
| npm publish 필요 | 데이터 변경 후 npm에 배포해야 saju-backend 반영 | 배포 후 backend에서 `npm install` 필요 |
| date-index.ts 원본 불일치 | 원본(11.4MB)에는 여전히 음력 기준 monthPillarId 잔존 | jest.config.cjs `moduleNameMapper`와 rollup alias로 항상 date-index-compressed.ts를 사용하도록 우회. 원본은 compress 스크립트의 입력으로만 사용됨 |
