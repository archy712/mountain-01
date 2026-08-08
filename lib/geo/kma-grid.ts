/**
 * 위경도(WGS84) → 기상청 단기예보 격자(nx, ny) 변환 유틸 (결정 002 #7).
 *
 * 기상청 단기예보 API 는 위경도가 아니라 자체 Lambert Conformal Conic(LCC) 격자
 * 좌표계를 쓴다. 산 시드 적재 시 이 함수로 `grid_nx`/`grid_ny` 를 사전 계산해
 * `mountains` 에 저장한다(조회 시점 변환 비용 0).
 *
 * 변환 상수·알고리즘은 기상청이 배포한 공식 DFS(Lambert) 변환식을 그대로 옮긴 것이다.
 * 표준위도 30/60°, 기준점 (126°E, 38°N) = 격자 (43, 136), 격자 간격 5km.
 */

const RE = 6371.00877; // 지구 반경(km)
const GRID = 5.0; // 격자 간격(km)
const SLAT1 = 30.0; // 표준위도 1(degree)
const SLAT2 = 60.0; // 표준위도 2(degree)
const OLON = 126.0; // 기준점 경도(degree)
const OLAT = 38.0; // 기준점 위도(degree)
const XO = 43; // 기준점 X 좌표(격자)
const YO = 136; // 기준점 Y 좌표(격자)

const DEGRAD = Math.PI / 180.0;

export interface KmaGrid {
  nx: number;
  ny: number;
}

/**
 * 위경도 → 기상청 격자(nx, ny). 결과는 1 이상의 정수(격자 인덱스)다.
 *
 * @param lat 위도(degree, WGS84)
 * @param lng 경도(degree, WGS84)
 */
export function latLngToGrid(lat: number, lng: number): KmaGrid {
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}
