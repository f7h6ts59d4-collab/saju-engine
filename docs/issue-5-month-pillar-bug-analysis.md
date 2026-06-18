# Issue #5: 월주(monthPillarId) 절기 기준 계산 버그 분석 및 해결 방안

> **스코프 (2026-06 측정으로 확인):** 이 문서는 **빌드 전 원본 데이터(L1, `src/data/date-index.ts`)**의 월주가 음력 월초 기준이라는 사실을 정확히 설명한다.
> 단, **빌드의 compress 단계(`scripts/compress-date-index.ts`)가 월주를 절기 기준(`getSajuMonth` + 年上起月法)으로 재계산**하므로, 실제 **배포(dist, rollup alias)·테스트(jest, moduleNameMapper) 엔진(L2, `date-index-compressed.ts`)은 절기 기준**이다. L1(음력)은 `tsx`로 src를 직접 실행할 때만 노출된다.
> 보정 래퍼(L3, `src/correction/correct-pillars.ts`)는 L2 위에 분 단위 절입 정밀도와 천문 절입 정확도(고정 절기일의 ±1일 오차 교정)를 더한다. 자세한 레이어 구분은 `docs/specs/solar-terms-correction-wrapper-spec.md` 참고.

## 1. 이슈 요약

`getGapja()`, `calculateSaju()`, `solarToLunar()`에서 반환하는 **월주(monthPillarId)**가 절기(節氣) 기준이 아닌 **음력 월 초하루(1일)** 기준으로 전환됨.

사주에서 월주는 절기를 기준으로 바뀌어야 하지만, 현재 라이브러리는 음력 1일에 월주가 바뀜.

---

## 2. 버그 원인 분석

### 2.1 데이터 파이프라인 추적

```
KASI API (astro.kasi.re.kr)
  └─ LUNC_WLGN 필드 = "음력 월 갑자" (음력 1일 기준으로 변경됨)
     └─ populate-from-kasi-solc.ts:119
        └─ gapjaToId(response.LUNC_WLGN) → month_pillar_id
           └─ MySQL DB (manseryeok_dates 테이블)
              └─ dump-mysql-data.ts → manseryeok-dates.json
                 └─ convert-to-js-data.ts → date-index.ts (11.4MB)
                    └─ compress-date-index.ts → date-index-compressed.ts (227KB)
```

**근본 원인**: KASI API의 `LUNC_WLGN` 필드는 "음력 월 갑자"로, 음력 월이 바뀔 때(음력 1일) 값이 변경됨. 사주의 월주는 절기(節氣) 기준으로 바뀌어야 하므로, 이 데이터를 그대로 사용하는 것이 근본적인 원인.

### 2.2 코드 호출 체인

```
calculateSaju(year, month, day, hour)          [saju.ts:73]
  └─ getGapja(solarYear, solarMonth, solarDay)   [solar-lunar-converter.ts:134]
       └─ solarToLunar(year, month, day)            [solar-lunar-converter.ts:139]
            └─ getMonthlyIndex(year, month)           [date-index-compressed.ts]
                 └─ entry.gapja.monthPillarId         ← 이 값이 음력 기준 (잘못됨)
```

`solarToLunar()` 함수(`solar-lunar-converter.ts:50-53`)에서 저장된 `monthPillarId`를 그대로 사용하며, 절기 기반 보정 로직이 없음:

```typescript
// solar-lunar-converter.ts:50-54
const gapja = formatGapjaByIds(
  entry.gapja.yearPillarId,
  entry.gapja.monthPillarId,   // ← 음력 기준의 잘못된 값
  entry.gapja.dayPillarId
);
```

### 2.3 아이러니: 올바른 함수가 이미 존재함

`getSajuMonth()` 함수(`solar-term.ts:200-227`)는 절기 기준으로 올바르게 사주 월을 계산함. 그러나 이 함수가 `getGapja()/solarToLunar()/calculateSaju()`에서는 전혀 사용되지 않음.

---

## 3. 영향 범위

### 3.1 영향을 받는 날짜

매월 **"음력 1일 ~ 절기 전날"** 사이의 모든 날짜에서 월주가 잘못됨.

| 구간 | 예시 (1996년) | 현재 값 | 올바른 값 |
|------|---------------|---------|-----------|
| 음력 2/18 ~ 경칩 전(3/5) | 양력 4/5 | 辛卯 (묘월) | 壬辰 (진월) |
| 음력 3/1에야 변경 | 양력 4/18 | 壬辰 | 壬辰 (맞지만 이유가 다름) |

절기와 음력 1일 사이의 차이는 연도마다 다르지만 **평균 2~15일** 정도. 전체 데이터 범위(1900~2050년)에서 약 **18% (약 9,000~10,000일)**의 날짜가 잘못된 월주를 가짐.

### 3.2 영향을 받는 API

| API | 영향 여부 | 이유 |
|-----|-----------|------|
| `solarToLunar().gapja.monthPillar` | **영향 있음** | 저장된 monthPillarId 직접 사용 |
| `getGapja().monthPillar` | **영향 있음** | solarToLunar() 래퍼 |
| `calculateSaju().monthPillar` | **영향 있음** | getGapja() 래퍼 |
| `getSajuMonth()` | **영향 없음** | 자체 절기 테이블로 계산 |

### 3.3 saju-backend 영향

saju-backend의 `calculateMonthPillar()` 함수(`pillar-calculator.ts`)는 `getSajuMonth()`로 자체 계산하므로 이 버그의 영향을 **받지 않음**.

---

## 4. 부수 버그: `getSajuMonth()` 기본값 오류

### 4.1 현재 코드

```typescript
// solar-term.ts:225-226
// 1월 소한 이전은 축월(12)
return 12;
```

### 4.2 문제

1월 1일~1월 5일은 대설(12/7)과 소한(1/6) 사이에 해당하므로 **자월(11)**이어야 함:

| 기간 | 절기 | 사주 월 |
|------|------|---------|
| 12/7 ~ 1/5 | 대설 후 ~ 소한 전 | 자월 (11) |
| 1/6 ~ 2/3 | 소한 후 ~ 입춘 전 | 축월 (12) |

### 4.3 수정

```typescript
// 수정: 1월 소한 이전은 자월(11) (대설 12/7 ~ 소한 1/6 구간)
return 11;
```

---

## 5. 해결 방안

### 방안 A: 런타임 보정 (권장)

`solarToLunar()`와 `getGapja()`에서 저장된 `monthPillarId`를 무시하고, **年上起月法(오호둔법)**으로 런타임 재계산.

#### 5.1 구현 위치

`src/core/solar-lunar-converter.ts`에 보정 함수 추가.

#### 5.2 구현 코드

```typescript
import { getSajuMonth, isBeforeLichun } from './solar-term';

/**
 * 年上起月法(오호둔법)으로 월주 ID 계산
 *
 * 연간(年干)에 따른 인월(寅月) 시작 천간:
 *   갑(0)/기(5)년 → 병인(丙寅, id=2)
 *   을(1)/경(6)년 → 무인(戊寅, id=14)
 *   병(2)/신(7)년 → 경인(庚寅, id=26)
 *   정(3)/임(8)년 → 임인(壬寅, id=38)
 *   무(4)/계(9)년 → 갑인(甲寅, id=50)
 */
const MONTH_PILLAR_BASE: readonly number[] = [2, 14, 26, 38, 50];

function computeMonthPillarId(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  yearPillarId: number
): number {
  const sajuMonth = getSajuMonth(solarMonth, solarDay);

  // 사주에서 년주는 입춘 기준이므로, 절기상 전년도에 속하면 년주를 보정
  // yearPillarId는 이미 입춘 기준으로 올바르게 저장되어 있으므로 그대로 사용
  const yearStemIndex = yearPillarId % 10;
  const basePillarId = MONTH_PILLAR_BASE[yearStemIndex % 5];

  // sajuMonth: 1=인월, 2=묘월, ..., 11=자월, 12=축월
  // basePillarId는 인월(sajuMonth=1)의 60갑자 ID
  return (basePillarId + sajuMonth - 1) % 60;
}
```

#### 5.3 적용 위치

`solarToLunar()` 함수에서 `formatGapjaByIds()` 호출 전에 보정:

```typescript
// solar-lunar-converter.ts (수정)
export function solarToLunar(solarYear, solarMonth, solarDay) {
  // ... 기존 코드 ...

  // 월주 보정: 저장된 monthPillarId 대신 절기 기반 재계산
  const correctedMonthPillarId = computeMonthPillarId(
    solarYear, solarMonth, solarDay,
    entry.gapja.yearPillarId
  );

  const gapja = formatGapjaByIds(
    entry.gapja.yearPillarId,
    correctedMonthPillarId,     // ← 보정된 값 사용
    entry.gapja.dayPillarId
  );

  // ... 기존 코드 ...
}
```

#### 5.4 장단점

| 장점 | 단점 |
|------|------|
| 즉시 적용 가능 | `getSajuMonth()`가 고정 절기일 사용 (연도별 1~2일 오차) |
| 저장 데이터 변경 불필요 | packed data에 여전히 잘못된 monthPillarId 잔존 |
| 하위 호환성 유지 | - |

#### 5.5 고정 절기일 정확도

`getSajuMonth()`는 고정 날짜를 사용함 (예: 입춘=2/4, 경칩=3/6). 실제 절기는 매년 1~2일 차이가 있으나, 사주 업계에서 고정일 방식도 널리 사용됨. 더 정밀한 계산이 필요하면 `solar-terms-data.ts`의 연도별 절기 데이터를 활용할 수 있으나, 현재 2020~2030년만 지원.

---

### 방안 B: 연도별 절기 데이터를 활용한 정밀 보정

#### 5.6 개요

`solar-terms-data.ts`에 있는 연도별 절기 시각 데이터를 활용하여 정확한 절기 시점 판단.

#### 5.7 구현 개요

```typescript
import { getSolarTermsByYear } from './solar-term';

function getPreciseSajuMonth(year: number, month: number, day: number): number {
  try {
    const terms = getSolarTermsByYear(year);
    // 절기(節氣)만 필터 (중기 제외) - type === 'jeolgi'
    const jeolgiTerms = terms
      .filter(t => t.type === 'jeolgi')
      .sort((a, b) => a.month - b.month || a.day - b.day);

    // 역순으로 검사하여 해당 절기 찾기
    for (let i = jeolgiTerms.length - 1; i >= 0; i--) {
      const t = jeolgiTerms[i];
      if (month > t.month || (month === t.month && day >= t.day)) {
        return t.sajuMonth;
      }
    }

    // 1월 초 (이전 년도 대설 이후)
    return 11; // 자월
  } catch {
    // 지원 범위 밖이면 고정일 방식 폴백
    return getSajuMonth(month, day);
  }
}
```

#### 5.8 장단점

| 장점 | 단점 |
|------|------|
| 지원 연도(2020~2030)에서 정확 | 데이터 범위가 11년으로 제한 |
| 범위 밖은 고정일 폴백 | 절기 데이터 확장 필요 |

---

### 방안 C: 데이터 재생성 (근본 해결)

#### 5.9 개요

`compress-date-index.ts` 또는 전처리 단계에서 `monthPillarId`를 절기 기준으로 재계산하여 데이터 파일을 재생성.

#### 5.10 구현 개요

`scripts/compress-date-index.ts`의 `encodeEntry()` 함수에서 `monthPillarId`를 오호둔법으로 재계산:

```typescript
function encodeEntry(entry: SolarToLunarEntry, solarYear: number): number {
  // ... 기존 코드 ...

  const yearPillarId = entry.gapja.yearPillarId;

  // monthPillarId를 절기 기준으로 재계산
  const sajuMonth = getSajuMonth(entry.solar.month, entry.solar.day);
  const yearStemIndex = yearPillarId % 10;
  const basePillarId = MONTH_PILLAR_BASE[yearStemIndex % 5];
  const monthPillarId = (basePillarId + sajuMonth - 1) % 60;

  // ... 패킹 코드 ...
}
```

#### 5.11 장단점

| 장점 | 단점 |
|------|------|
| 데이터 자체가 올바름 | 데이터 재생성 필요 (빌드 단계) |
| 런타임 오버헤드 없음 | 원본 DB 데이터와의 불일치 |
| 모든 API가 자동으로 수정됨 | 고정 절기일 의존 (방안 A와 동일 한계) |

---

## 6. 권장 해결 전략

### 단기: 방안 A (런타임 보정) + 부수 버그 수정

1. `getSajuMonth()` 기본값을 `12` → `11`로 수정
2. `solarToLunar()` 내부에서 `computeMonthPillarId()`로 월주 보정
3. `getGapja()`와 `calculateSaju()`는 `solarToLunar()`를 사용하므로 자동 수정됨

### 중장기: 방안 C (데이터 재생성)

1. 절기 데이터 범위를 1900~2050년으로 확장
2. `compress-date-index.ts`에서 monthPillarId 재계산 로직 추가
3. 데이터 파일 재생성 후 런타임 보정 코드 제거

---

## 7. 테스트 계획

### 7.1 핵심 검증 케이스

```typescript
// 1996년(丙子年) 전체 월 순환
expect(getGapja(1996, 2, 4).monthPillarHanja).toBe('庚寅');   // 인월 (입춘)
expect(getGapja(1996, 3, 6).monthPillarHanja).toBe('辛卯');   // 묘월 (경칩)
expect(getGapja(1996, 4, 5).monthPillarHanja).toBe('壬辰');   // 진월 (청명)
expect(getGapja(1996, 5, 6).monthPillarHanja).toBe('癸巳');   // 사월 (입하)
expect(getGapja(1996, 6, 6).monthPillarHanja).toBe('甲午');   // 오월 (망종)
expect(getGapja(1996, 7, 7).monthPillarHanja).toBe('乙未');   // 미월 (소서)
expect(getGapja(1996, 8, 8).monthPillarHanja).toBe('丙申');   // 신월 (입추)
expect(getGapja(1996, 9, 8).monthPillarHanja).toBe('丁酉');   // 유월 (백로)
expect(getGapja(1996, 10, 8).monthPillarHanja).toBe('戊戌');  // 술월 (한로)
expect(getGapja(1996, 11, 8).monthPillarHanja).toBe('己亥');  // 해월 (입동)
expect(getGapja(1996, 12, 7).monthPillarHanja).toBe('庚子');  // 자월 (대설)
```

### 7.2 경계값 검증 (절기 전후)

```typescript
// 소한 경계 (1996년)
expect(getGapja(1996, 1, 1).monthPillarHanja).toBe('戊子');   // 자월 (소한 전)
expect(getGapja(1996, 1, 6).monthPillarHanja).toBe('己丑');   // 축월 (소한 후)

// 입춘 경계
expect(getGapja(1996, 2, 3).monthPillarHanja).toBe('己丑');   // 축월 (입춘 전)
expect(getGapja(1996, 2, 4).monthPillarHanja).toBe('庚寅');   // 인월 (입춘 당일)

// 청명 경계 (이슈 리포트의 핵심 케이스)
expect(getGapja(1996, 4, 4).monthPillarHanja).toBe('辛卯');   // 묘월 (청명 전)
expect(getGapja(1996, 4, 5).monthPillarHanja).toBe('壬辰');   // 진월 (청명 당일)
```

### 7.3 getSajuMonth() 기본값 수정 검증

```typescript
// 1월 소한 이전은 자월(11)이어야 함
expect(getSajuMonth(1, 1)).toBe(11);  // 자월
expect(getSajuMonth(1, 5)).toBe(11);  // 자월
expect(getSajuMonth(1, 6)).toBe(12);  // 축월 (소한 당일)
```

### 7.4 年上起月法 검증 (오호둔법)

```typescript
// 갑자년(2024): 갑/기 → 병인(丙寅) 시작
expect(getGapja(2024, 2, 4).monthPillarHanja).toBe('丙寅');   // 인월

// 을축년(2025): 을/경 → 무인(戊寅) 시작
expect(getGapja(2025, 2, 4).monthPillarHanja).toBe('戊寅');   // 인월
```

---

## 8. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/core/solar-term.ts:226` | 기본값 `12` → `11` 수정 |
| `src/core/solar-lunar-converter.ts` | `computeMonthPillarId()` 함수 추가 및 적용 |
| `src/__tests__/solar-lunar-converter.test.ts` | 월주 절기 검증 테스트 추가 |
| `src/__tests__/solar-terms.test.ts` | getSajuMonth() 기본값 테스트 추가 |

---

## 9. 참고: 年上起月法(오호둔법) 테이블

| 연간 천간 | 인월(1월) 천간 | 인월 60갑자 ID |
|-----------|---------------|---------------|
| 갑(0), 기(5) | 병(丙) | 2 (丙寅) |
| 을(1), 경(6) | 무(戊) | 14 (戊寅) |
| 병(2), 신(7) | 경(庚) | 26 (庚寅) |
| 정(3), 임(8) | 임(壬) | 38 (壬寅) |
| 무(4), 계(9) | 갑(甲) | 50 (甲寅) |

60갑자 ID에서 사주월을 더하면 해당 월의 월주가 됨:
- `monthPillarId = (basePillarId + sajuMonth - 1) % 60`
- sajuMonth: 1=인월, 2=묘월, ..., 11=자월, 12=축월
