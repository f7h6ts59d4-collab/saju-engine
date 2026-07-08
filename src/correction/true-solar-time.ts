/**
 * 진태양시(眞太陽時) 계산 모듈. 일주·시주 산출의 기준 시각을 만든다.
 */

import * as Astronomy from 'astronomy-engine';

interface CalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 출생 순간(UTC)과 출생지 좌표로 진태양시의 달력 순간을 구한다.
 *
 * HourAngle(태양)에는 경도 보정과 균시차(EoT)가 자동 포함되므로 별도 EoT 공식이 없다.
 * tstInstant의 UTC 달력 필드를 읽으면 자정 넘김(전날/다음날)이 자동 처리된다.
 */
export function trueSolarParts(utc: Date, latitude: number, longitude: number): CalendarParts {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const hourAngle = Astronomy.HourAngle(Astronomy.Body.Sun, utc, observer); // 0~24
  const tstHours = (hourAngle + 12) % 24; // 진태양시 시각(0~24)

  const utcHourFrac =
    utc.getUTCHours() + utc.getUTCMinutes() / 60 + utc.getUTCSeconds() / 3600;
  let offsetHours = tstHours - utcHourFrac;
  if (offsetHours > 12) offsetHours -= 24; // (-12, 12]로 wrap
  if (offsetHours <= -12) offsetHours += 24;

  const tstInstant = new Date(utc.getTime() + offsetHours * 3600 * 1000);
  return {
    year: tstInstant.getUTCFullYear(),
    month: tstInstant.getUTCMonth() + 1,
    day: tstInstant.getUTCDate(),
    hour: tstInstant.getUTCHours(),
    minute: tstInstant.getUTCMinutes(),
  };
}
