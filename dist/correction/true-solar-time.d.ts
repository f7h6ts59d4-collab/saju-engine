/**
 * 진태양시(眞太陽時) 계산 모듈. 일주·시주 산출의 기준 시각을 만든다.
 */
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
export declare function trueSolarParts(utc: Date, latitude: number, longitude: number): CalendarParts;
export {};
//# sourceMappingURL=true-solar-time.d.ts.map