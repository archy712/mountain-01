/**
 * 국립공원공단 탐방로 CSV(`mountain.csv`) 파서 (Task 017, Task 029 재사용).
 *
 * - 원본은 CP949(euc-kr) 인코딩, 91만 GPS 포인트 / 936 코스 / 22 사무소의 로컬 스냅샷(gitignore).
 * - 각 행은 세그먼트 메타(거리·시간)가 반복되는 **한 점**이다. 하나의 탐방로는 여러
 *   **세그먼트**로 쪼개져 있는데, 같은 코스ID 안에서 `일련번호`로 나뉘기도 하고(예: 한라산
 *   성판악) 이름은 같은데 코스ID 가 다르기도 하다(예: 수통골 2코스). 거리·시간 컬럼은
 *   **세그먼트별 값**이라, 코스ID 만으로 중복 제거하면 첫 세그먼트만 남아 코스 전체 거리가
 *   누락된다. 따라서 세그먼트 식별키(관리번호+사무소코드+코스ID+일련번호)로 중복 제거해
 *   세그먼트마다 첫 점의 메타를 대표로 취한다(코스 단위 합산은 gen-trails 가 이름 기준으로 수행).
 * - 좌표(경도·위도) 스트리밍은 Task 029(GeoJSON) 에서 별도 함수로 다룬다.
 *
 * Node 전용(파일시스템·대용량). Next 런타임 번들에 포함되지 않는다(시드 생성기·오프라인 가공용).
 */

import { readFileSync } from "node:fs";

/** 코스 단위(중복 제거) 레코드. */
export interface KnpsCourse {
  /** 세그먼트 식별키: `{국립공원관리번호}-{사무소코드}-{코스ID}-{일련번호}` */
  key: string;
  /** 공원사무소코드(산 매핑 기준) */
  office: string;
  /** 탐방코스(한글) */
  name: string;
  /** 상세구간(경유지 설명) */
  segment: string;
  /** 탐방로 통제여부 원본("0"/"1") */
  controlFlag: string;
  /** 통제구간 설명(탐방가능구간/통제구간/산불방지통제구간(기간)) */
  controlDesc: string;
  /** 난이도(원본 문자열) */
  difficulty: string;
  /** 지리정보시스템 상 거리(m) 원본 */
  distanceM: string;
  /** 가는시간(분) */
  goMinutes: string;
  /** 오는시간(분) */
  comeMinutes: string;
}

const COLUMNS = {
  mgmtNo: "국립공원관리번호",
  office: "공원사무소코드",
  courseId: "코스ID",
  seq: "일련번호",
  name: "탐방코스(한글)",
  segment: "상세구간",
  goMin: "가는시간(분)",
  comeMin: "오는시간(분)",
  distanceM: "지리정보시스템 상 거리(m)",
  difficulty: "난이도",
  controlFlag: "탐방로 통제여부",
  controlDesc: "통제구간 설명",
} as const;

/**
 * CSV 한 줄을 필드로 분할한다. 대부분 행은 쉼표/따옴표가 없지만, 일부 경유지(상세구간)에
 * 따옴표로 감싼 쉼표가 있어(예: 울산바위코스) 단순 split 은 필드가 밀린다. 따옴표를 인식하고
 * `""` 이스케이프를 처리해 필드 정렬이 깨지지 않게 한다(Task 033 #4 데이터 정합성).
 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * CSV 를 CP949 로 디코딩해 코스 단위 레코드 배열로 반환한다(첫 등장 점의 메타 채택).
 * 따옴표 인식 분할(`splitCsvLine`)로 경유지 내 쉼표가 있어도 필드가 밀리지 않는다(열 수 부족 행은 스킵).
 */
export function parseKnpsCourses(filePath: string): KnpsCourse[] {
  const text = new TextDecoder("euc-kr").decode(readFileSync(filePath));
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);

  const iMgmt = idx(COLUMNS.mgmtNo);
  const iOffice = idx(COLUMNS.office);
  const iCourse = idx(COLUMNS.courseId);
  const iSeq = idx(COLUMNS.seq);
  const iName = idx(COLUMNS.name);
  const iSeg = idx(COLUMNS.segment);
  const iGo = idx(COLUMNS.goMin);
  const iCome = idx(COLUMNS.comeMin);
  const iDist = idx(COLUMNS.distanceM);
  const iDiff = idx(COLUMNS.difficulty);
  const iFlag = idx(COLUMNS.controlFlag);
  const iDesc = idx(COLUMNS.controlDesc);

  const required = [iMgmt, iOffice, iCourse, iName, iFlag, iDesc];
  if (required.some((i) => i < 0)) {
    throw new Error("mountain.csv 헤더에서 필요한 열을 찾지 못했습니다. 포맷을 확인하세요.");
  }

  const byKey = new Map<string, KnpsCourse>();
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    const f = splitCsvLine(line);
    if (f.length < header.length) continue;

    // 세그먼트(일련번호)까지 포함해 중복 제거한다. 같은 코스ID 안에서 세그먼트가 나뉘는
    // 경우(성판악)에도 각 세그먼트가 별도 레코드로 남아 거리·시간이 누락되지 않는다.
    // 일련번호 열이 없으면(포맷 변동) 코스ID 단위로 폴백한다.
    const seq = iSeq >= 0 ? f[iSeq] : "";
    const key = `${f[iMgmt]}-${f[iOffice]}-${f[iCourse]}-${seq}`;
    if (byKey.has(key)) continue; // 세그먼트별 첫 점의 메타만 채택

    byKey.set(key, {
      key,
      office: f[iOffice],
      name: (f[iName] ?? "").trim(),
      segment: (f[iSeg] ?? "").trim(),
      controlFlag: f[iFlag],
      controlDesc: (f[iDesc] ?? "").trim(),
      difficulty: f[iDiff] ?? "",
      distanceM: f[iDist] ?? "",
      goMinutes: f[iGo] ?? "",
      comeMinutes: f[iCome] ?? "",
    });
  }

  return [...byKey.values()];
}
