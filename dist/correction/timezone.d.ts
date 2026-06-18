/**
 * 출생 도시(IANA 시간대) → 출생 순간(UTC) 환산 유틸.
 *
 * 과거 서머타임(DST)은 런타임 내장 `Intl`(IANA tz 데이터)이 자동 반영한다.
 * 별도 DST 표/대형 데이터셋을 두지 않는다.
 */
/**
 * 특정 IANA 시간대의 벽시계(local civil) 일시를 UTC 순간으로 환산한다.
 *
 * DST 전환 경계에서 offset이 달라질 수 있어, 추정 offset으로 한 번 보정해 수렴시킨다.
 */
export declare function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date;
/**
 * 도시명 → IANA 시간대 id 샘플 매핑.
 *
 * 실제 자동완성용 전체 도시 데이터는 앱(프론트)에서 제공한다(명세: 각 도시에 IANA가 연결).
 * 여기서는 테스트·예시용 최소 샘플만 둔다. 래퍼의 입력은 IANA id를 직접 받는다.
 */
export declare const SAMPLE_CITY_TIMEZONES: Readonly<Record<string, string>>;
/** 샘플 매핑에서 도시명을 IANA 시간대 id로 변환한다. */
export declare function cityToTimezone(city: string): string | undefined;
//# sourceMappingURL=timezone.d.ts.map