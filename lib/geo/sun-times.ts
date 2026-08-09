/**
 * 일출·일몰 시각 계산 (Task 034). 외부 API 없이 위경도+날짜로 산출한다.
 *
 * 미 해군 천문대(USNO) Sunrise/Sunset 알고리즘의 표준 구현. 반환값은 UTC 시(0~24)이며,
 * 한국(UTC+9 고정, DST 없음) 표시용 헬퍼 `formatKstHm` 로 KST "HH:MM" 문자열을 만든다.
 * 극지 백야/극야(계산 불가) 구간은 null 을 반환한다(국내에서는 발생하지 않음).
 */

const ZENITH = 90.833; // 대기 굴절 보정 포함 공식 일출/일몰 천정각(도)
const DEG = Math.PI / 180;

const sinD = (deg: number): number => Math.sin(deg * DEG);
const cosD = (deg: number): number => Math.cos(deg * DEG);
const tanD = (deg: number): number => Math.tan(deg * DEG);
const asinD = (x: number): number => Math.asin(x) / DEG;
const acosD = (x: number): number => Math.acos(x) / DEG;
const atanD = (x: number): number => Math.atan(x) / DEG;

/** 0~360 정규화 */
function norm360(v: number): number {
  return ((v % 360) + 360) % 360;
}
/** 0~24 정규화 */
function norm24(v: number): number {
  return ((v % 24) + 24) % 24;
}

/** 그레고리력 일자 → 연중 일수(1~366). date 의 UTC 필드(=KST 벽시계) 기준. */
function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 0);
  const cur = Date.UTC(year, month - 1, day);
  return Math.floor((cur - start) / 86_400_000);
}

/**
 * 일출/일몰 UTC 시(0~24)를 계산한다. 백야/극야면 null.
 * @param rising true=일출, false=일몰
 */
function sunEventUtcHour(
  lat: number,
  lng: number,
  year: number,
  month: number,
  day: number,
  rising: boolean,
): number | null {
  const N = dayOfYear(year, month, day);
  const lngHour = lng / 15;
  const t = N + ((rising ? 6 : 18) - lngHour) / 24;

  // 태양 평균 근점이각 → 진황경
  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * sinD(M) + 0.02 * sinD(2 * M) + 282.634;
  L = norm360(L);

  // 적경(RA) — L 과 같은 사분면으로 보정 후 시각(시)으로 환산
  let RA = norm360(atanD(0.91764 * tanD(L)));
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15;

  // 적위
  const sinDec = 0.39782 * sinD(L);
  const cosDec = cosD(asinD(sinDec));

  // 시간각
  const cosH = (cosD(ZENITH) - sinDec * sinD(lat)) / (cosDec * cosD(lat));
  if (cosH > 1 || cosH < -1) return null; // 백야/극야

  const H = (rising ? 360 - acosD(cosH) : acosD(cosH)) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  return norm24(T - lngHour);
}

export interface SunTimes {
  /** 일출 KST "HH:MM" (계산 불가 시 null) */
  sunrise: string | null;
  /** 일몰 KST "HH:MM" (계산 불가 시 null) */
  sunset: string | null;
}

/** UTC 시(0~24) → KST "HH:MM". */
function formatKstHm(utcHour: number): string {
  const kst = norm24(utcHour + 9);
  const h = Math.floor(kst);
  const m = Math.round((kst - h) * 60);
  // 반올림이 60분이 되면 시로 올림
  const hh = m === 60 ? (h + 1) % 24 : h;
  const mm = m === 60 ? 0 : m;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * 위경도와 날짜(KST 벽시계)로 일출·일몰 KST 시각을 계산한다.
 * @param date 기준 날짜(Date). UTC 필드가 KST 연·월·일이어야 한다(호출부에서 KST 환산 Date 전달).
 */
export function getSunTimes(lat: number, lng: number, date: Date): SunTimes {
  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const riseUtc = sunEventUtcHour(lat, lng, y, mo, d, true);
  const setUtc = sunEventUtcHour(lat, lng, y, mo, d, false);
  return {
    sunrise: riseUtc === null ? null : formatKstHm(riseUtc),
    sunset: setUtc === null ? null : formatKstHm(setUtc),
  };
}

/**
 * 오늘(KST) 기준 일출·일몰. `now` 를 KST 벽시계 Date 로 환산해 `getSunTimes` 에 넘긴다.
 * `now` 기본값 평가가 이 함수 안에서 일어나므로 컴포넌트 렌더의 순수성 규칙을 지킨다.
 * @param now 기준 시각 주입(테스트 결정성). 기본 현재 시각.
 */
export function getSunTimesToday(lat: number, lng: number, now: Date = new Date()): SunTimes {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return getSunTimes(lat, lng, kst);
}
