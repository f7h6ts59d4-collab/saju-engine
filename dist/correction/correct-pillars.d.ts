/**
 * 절기 경계 월주·연주 보정 래퍼.
 *
 * 월주 데이터에는 3개의 레이어가 있다(측정으로 확인):
 *  - L1 원본 `date-index.ts`: 월주가 음력 1일(초하루) 기준 → 틀림
 *    (docs/issue-5-month-pillar-bug-analysis.md). tsx 직접 실행에서만 노출되고,
 *    배포·테스트 경로에는 쓰이지 않는다.
 *  - L2 배포/테스트 `date-index-compressed.ts`: 빌드의 compress 단계가 월주를
 *    절기 기준(getSajuMonth + 年上起月法)으로 재계산한다. dist(rollup alias)와
 *    jest(moduleNameMapper)가 모두 이 레이어를 쓴다. 다만 (i) 일(日) 단위라 절기
 *    당일의 분 단위 절입 전/후를 구분하지 못하고, (ii) 고정 절기일을 써서 실제
 *    천문 절입과 ±1일 어긋나는 연·절기가 있다(예: 2024 경칩·청명).
 *  - L3 이 래퍼: 검증된 자체 절기 테이블(solar-terms-precise.json)의 분 단위 절입
 *    시각으로 출생 순간(UTC)을 비교해 사주월을 판정하고, 연간(年干)에 따른
 *    年上起月法(오호둔법)으로 '모든 날짜'의 월주를 산출한다. L2의 (i)·(ii)를 모두
 *    교정한다. 깨끗한 비경계 날(분 단위·천문 절입 모두 부합)에는 L2(배포 엔진)와
 *    결과가 일치한다.
 *
 * 연주(年柱)는 엔진 경계가 입춘 '날짜' 기준이라 대부분 올바르고, 입춘 당일의 분 단위
 * 절입 전/후만 어긋난다. 따라서 입춘 절입 전 출생에 한해 엔진의 전날 연주를 빌려
 * 전년으로 되돌린다.
 *
 * 일주(日柱)·시주(時柱)는 출생지 **진태양시**(경도 보정 + 균시차 EoT) 기준으로 계산한다.
 * 출생 순간(UTC)과 출생지 좌표로 HourAngle 진태양시 달력 순간을 구해, 엔진의 KST 경도
 * 보정을 끄고(applyTimeCorrection:false) 그 달력값으로 일주·시주를 산출한다. 엔진 기본
 * 경도 보정 공식은 입력이 KST임을 전제해 미국 출생에선 깨지므로 반드시 끈다.
 *
 * 원칙:
 * - 연주·월주 판정은 출생 순간(UTC) vs 절입 순간(UTC). 진태양시/경도를 섞지 않는다.
 *   절기는 천문학적 절대 순간이라 UTC 기준이 맞다.
 * - 일주·시주는 진태양시 달력값으로 산출한다(엔진 KST 보정은 끈다).
 * - 엔진/`src/data` 미변경. 보정은 엔진 출력 위에 얹는 별도 레이어다.
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
export interface BirthInput {
    /** 생년월일 (calendar 기준) */
    year: number;
    month: number;
    day: number;
    /** 출생 시각. 생략하면 "시간 모름"(정오 가정). */
    hour?: number;
    minute?: number;
    /** 입력 달력 (기본 'solar'). */
    calendar?: 'solar' | 'lunar';
    /** 음력 윤달 여부 (calendar === 'lunar'일 때만). */
    isLeapMonth?: boolean;
    /** 출생 도시의 IANA 시간대 id (예: 'Asia/Seoul'). 도시→IANA 매핑은 앱이 제공. */
    timezone: string;
    /** 출생 도시 대표 경도(동경 양수, 서경 음수. 예: 뉴욕 -74). 진태양시 일주·시주에 사용. */
    longitude: number;
    /** 출생 도시 대표 위도(북위 양수. 예: 뉴욕 40.7). HourAngle 관측자 위치용. */
    latitude: number;
    /** 성별. 대운(大運) 방향 판정에 필요. 생략하면 majorLuck은 null. */
    gender?: 'male' | 'female';
}
export interface CorrectedSaju {
    yearPillar: string;
    yearPillarHanja: string;
    monthPillar: string;
    monthPillarHanja: string;
    /** 일주: 출생지 진태양시 기준. */
    dayPillar: string;
    dayPillarHanja: string;
    /** 시주: 출생지 진태양시 기준. 시간 모름이면 정오 기준 참고용. */
    hourPillar: string | null;
    hourPillarHanja: string | null;
    /** true면 출생시간 미상 → 정오(12:00) 가정, 시주는 참고용. */
    timeUnknown: boolean;
    /** 일간(日干): 일주의 천간. 사주의 '자기 자신'. */
    dayMaster: {
        hangul: string;
        hanja: string;
        element: string;
    };
    /** 오행 분포: 4기둥 천간·지지(시간 모름이면 시주 제외, 합 6) 목·화·토·금·수 개수. */
    elements: {
        목: number;
        화: number;
        토: number;
        금: number;
        수: number;
    };
    /** 십성(十星): 일간 기준 오행 생극+음양 판정. 일간 자신(일주 천간)은 제외. */
    tenGods: {
        /** 천간 십성 (일간 제외: 연간·월간·시간). */
        heavenly: {
            year: string;
            month: string;
            hour: string | null;
        };
        /** 지지 십성 (각 지지의 정기 천간 기준: 연지·월지·일지·시지). */
        earthly: {
            year: string;
            month: string;
            day: string;
            hour: string | null;
        };
        /** 지장간 십성 (각 지지의 지장간 전부에 매김). */
        hidden: {
            year: {
                stem: string;
                god: string;
            }[];
            month: {
                stem: string;
                god: string;
            }[];
            day: {
                stem: string;
                god: string;
            }[];
            hour: {
                stem: string;
                god: string;
            }[] | null;
        };
    };
    /** 대운(大運): 10년 단위 운의 흐름. 성별 미제공이면 null. */
    majorLuck: {
        direction: '순행' | '역행';
        /** 대운수: 첫 대운 시작 나이. */
        startAge: number;
        cycles: {
            startAge: number;
            endAge: number;
            pillar: string;
            pillarHanja: string;
            /** 천간 십성 (일간 기준). */
            heavenlyGod: string;
            /** 지지 십성 (정기 천간 기준). */
            earthlyGod: string;
        }[];
    } | null;
}
/**
 * 엔진 명식에 절기 경계 월주·연주 보정을 적용한 명식을 반환한다.
 */
export declare function correctPillars(input: BirthInput): CorrectedSaju;
export {};
//# sourceMappingURL=correct-pillars.d.ts.map