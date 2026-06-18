/**
 * 출생 도시(IANA 시간대) → 출생 순간(UTC) 환산 유틸.
 *
 * 과거 서머타임(DST)은 런타임 내장 `Intl`(IANA tz 데이터)이 자동 반영한다.
 * 별도 DST 표/대형 데이터셋을 두지 않는다.
 */

/** 주어진 UTC 순간에 해당 IANA 시간대가 갖는 offset(ms, UTC 대비 양수=동쪽). */
function tzOffsetMs(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wallAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24, // 일부 런타임이 자정을 24로 표기하는 것을 흡수
    get('minute'),
    get('second')
  );
  return wallAsUtc - utcMs;
}

/**
 * 특정 IANA 시간대의 벽시계(local civil) 일시를 UTC 순간으로 환산한다.
 *
 * DST 전환 경계에서 offset이 달라질 수 있어, 추정 offset으로 한 번 보정해 수렴시킨다.
 */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const guess = tzOffsetMs(timeZone, wallAsUtc);
  let utcMs = wallAsUtc - guess;
  const refined = tzOffsetMs(timeZone, utcMs);
  if (refined !== guess) utcMs = wallAsUtc - refined;
  return new Date(utcMs);
}

/**
 * 도시명 → IANA 시간대 id 샘플 매핑.
 *
 * 실제 자동완성용 전체 도시 데이터는 앱(프론트)에서 제공한다(명세: 각 도시에 IANA가 연결).
 * 여기서는 테스트·예시용 최소 샘플만 둔다. 래퍼의 입력은 IANA id를 직접 받는다.
 */
export const SAMPLE_CITY_TIMEZONES: Readonly<Record<string, string>> = {
  서울: 'Asia/Seoul',
  부산: 'Asia/Seoul',
  도쿄: 'Asia/Tokyo',
  마닐라: 'Asia/Manila',
  베이징: 'Asia/Shanghai',
  뉴욕: 'America/New_York',
  로스앤젤레스: 'America/Los_Angeles',
  런던: 'Europe/London',
};

/** 샘플 매핑에서 도시명을 IANA 시간대 id로 변환한다. */
export function cityToTimezone(city: string): string | undefined {
  return SAMPLE_CITY_TIMEZONES[city];
}
