# 작업 명세: correctPillars 출력에 오행 분포·일간 추가

> saju-engine 레포. 명식 해석(맛보기·결제 후)에 쓸 파생 정보 두 가지를 correctPillars
> 출력에 더한다. 기존 4기둥·진태양시·연월주 로직은 건드리지 않는다. 원칙은 CLAUDE.md.

## 목적

맛보기(일간 캐릭터 + 오행 불균형)와 결제 후 해석에 쓸 재료를 엔진이 제공한다.
- **일간(dayMaster)**: 사주의 "자기 자신". 일주의 천간.
- **오행 분포(elements)**: 4기둥 8글자(천간4+지지4)의 목·화·토·금·수 개수.

## 확인된 사실 (실험 확인, 2차 검증 권장)

- 각 기둥의 천간·지지 오행은 `getPillarByHangul(기둥한글)`로 꺼낼 수 있다
  (`.tiangan.element`, `.dizhi.element`). 엔진이 이미 export 중.
- 4기둥 한글을 이 함수에 넣어 천간·지지 오행을 세면 분포가 나온다. 시주 있으면 합 8.
- 일간 = 일주(dayPillar)의 천간(`getPillarByHangul(dayPillar).tiangan`).
- 검증 예: 임신·정미·경자·무인 → 오행 {목1,화1,토2,금2,수2}, 일간 경(庚, 금).

## 구현 — correctPillars 출력에 필드 2개 추가 (기존 로직 불변)

### 출력 타입(CorrectedSaju)에 추가
```ts
dayMaster: {
  hangul: string;   // 예: '경'
  hanja: string;    // 예: '庚'
  element: string;  // 오행, 예: '금'
};
elements: {
  목: number; 화: number; 토: number; 금: number; 수: number;
};  // 4기둥 8글자(시주 없으면 6글자) 오행 개수
```

### 계산 (검증된 로직 그대로)
- 4기둥(yearPillar, monthPillar, dayPillar, hourPillar) 중 존재하는 것만 순회.
- 각 기둥을 getPillarByHangul로 조회 → tiangan.element, dizhi.element를 카운트.
- dayMaster = getPillarByHangul(dayPillar).tiangan에서 hangul/hanja/element.
- timeUnknown이면 시주 제외(시간 모름 시 시주는 정오 추정값이라 오행 분포에서 뺀다. 합 6).
  엔진은 시간 모름일 때 hourPillar를 null이 아니라 정오 참고용으로 채우므로, 트리거는
  hourPillar===null이 아니라 timeUnknown이다.

### 주의
- 기존 4기둥·연월주·진태양시 로직은 **한 줄도 바꾸지 않는다**. 출력 끝에 두 필드만 덧붙임.
- 십성(十星)은 이번 범위 아님(결제 후 정밀 해석 설계 때 별도).
- 오행 "강약 가중"(월지 비중 등)은 하지 않음. 단순 개수만(맛보기·엔터 수준).
  (가중은 결제 후 해석에서 검토.)

## 검증

- 기존 테스트 전부 통과(회귀 — 4기둥·연월주·진태양시 불변).
- 신규: 임신·정미·경자·무인 → elements {목1,화1,토2,금2,수2}, dayMaster 경(庚,금).
- 시간 모름(timeUnknown) 케이스 → 시주 제외, 오행 합이 6, dayMaster는 정상(일주는 항상 있음).
- 오행 합 = (시주 있으면 8, 없으면 6)인지.
- typecheck/build, dist 재빌드.

## 산출물
1. src/correction/correct-pillars.ts — CorrectedSaju에 dayMaster·elements 추가 + 계산
2. 테스트 추가(위 검증)
3. dist 재빌드
