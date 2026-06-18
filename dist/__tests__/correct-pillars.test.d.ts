/**
 * 절기 경계 월주·연주 보정 래퍼 검증.
 *
 * 기준 절기: 입춘 2024 = 2024-02-04 17:27 KST (= 08:27 UTC). solar-terms-precise.json.
 *
 * 주의: jest는 `moduleNameMapper`로 `date-index`를 `date-index-compressed`로 돌려서,
 * 배포(dist)와 동일한 절기 기준(compressed) 엔진을 검증한다. 즉 여기서 비교하는
 * `calculateSaju`는 빌드 전 음력 기준 원본(L1)이 아니라 배포 동작(L2)이다.
 */
export {};
//# sourceMappingURL=correct-pillars.test.d.ts.map