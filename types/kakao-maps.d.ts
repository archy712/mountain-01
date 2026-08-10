/**
 * 카카오맵 JS SDK(v3) 최소 타입 선언 (Task 028).
 *
 * SDK 는 `//dapi.kakao.com/v2/maps/sdk.js?appkey=…&autoload=false` 스크립트를 통해
 * 런타임에 `window.kakao` 전역으로 주입된다(npm 패키지가 아님). 여기서는 이 프로젝트가
 * 실제로 사용하는 API 표면(지도 생성·마커·비동기 로더)만 선언해 `any` 없이 타입 안전하게
 * 다룬다. 폴리라인 등 Task 029 에서 쓰는 타입은 그 시점에 확장한다.
 */
declare global {
  namespace kakao.maps {
    /** 위경도 좌표 */
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    /** 위경도 범위(선택 코스에 지도를 맞출 때 사용) */
    class LatLngBounds {
      constructor();
      /** 좌표를 포함하도록 범위를 확장한다 */
      extend(latlng: LatLng): void;
      /** 빈 범위 여부 */
      isEmpty(): boolean;
    }

    interface MapOptions {
      /** 지도 중심 좌표 */
      center: LatLng;
      /** 확대 레벨(작을수록 확대) */
      level?: number;
    }

    /** 지도 인스턴스 */
    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      /** 확대 레벨 설정. anchor 지정 시 그 좌표를 기준으로 확대(클러스터 펼치기). */
      setLevel(level: number, options?: { anchor?: LatLng }): void;
      getLevel(): number;
      /** 부드럽게 중심 이동(선택한 편의시설로 이동) */
      panTo(latlng: LatLng): void;
      /** 주어진 범위가 보이도록 중심·레벨을 조정한다(선택 코스 프레이밍). 여백은 px. */
      setBounds(
        bounds: LatLngBounds,
        paddingTop?: number,
        paddingRight?: number,
        paddingBottom?: number,
        paddingLeft?: number,
      ): void;
      /** 컨테이너 크기 변경 후 재배치 */
      relayout(): void;
    }

    /** 픽셀 크기(마커 이미지 등, Task 045 편의시설 마커) */
    class Size {
      constructor(width: number, height: number);
    }

    /** 픽셀 좌표(마커 이미지 기준점 오프셋 등) */
    class Point {
      constructor(x: number, y: number);
    }

    interface MarkerImageOptions {
      /** 마커가 가리키는 기준 좌표(이미지 내 픽셀) */
      offset?: Point;
    }

    /** 마커 이미지(편의시설 유형별 아이콘) */
    class MarkerImage {
      constructor(src: string, size: Size, options?: MarkerImageOptions);
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
      /** 커스텀 마커 이미지(유형별 아이콘) */
      image?: MarkerImage;
      clickable?: boolean;
      zIndex?: number;
    }

    /** 마커 오버레이 */
    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
      /** 마커 이미지 교체(선택 강조 ↔ 일반) */
      setImage(image: MarkerImage): void;
      /** 그리기 순서 설정(선택 마커를 위로) */
      setZIndex(zIndex: number): void;
    }

    interface InfoWindowOptions {
      content?: string | HTMLElement;
      /** 닫기(x) 버튼 표시 */
      removable?: boolean;
      zIndex?: number;
    }

    /** 정보 창(마커 클릭 시 시설명·상세 표시, Task 045) */
    class InfoWindow {
      constructor(options?: InfoWindowOptions);
      open(map: Map, marker?: Marker): void;
      close(): void;
      setContent(content: string | HTMLElement): void;
    }

    interface MarkerClustererOptions {
      map?: Map;
      markers?: Marker[];
      /** 클러스터 좌표를 포함된 마커 평균으로 */
      averageCenter?: boolean;
      /** 이 레벨 이상(축소)에서만 클러스터링 */
      minLevel?: number;
      gridSize?: number;
      /** 클러스터 클릭 시 자동 확대 비활성화 */
      disableClickZoom?: boolean;
      /** 클러스터 배지 커스텀 스타일(CSS 속성 객체 배열). 개수 배지를 알약으로. */
      styles?: Array<Record<string, string>>;
    }

    /** 클러스터(개수 배지). clusterclick 콜백 인자로 전달된다. */
    class Cluster {
      getCenter(): LatLng;
      getSize(): number;
      getMarkers(): Marker[];
    }

    /**
     * 마커 클러스터러 (편의시설 마커 밀집 대응, Task 045).
     * `libraries=clusterer` 로 SDK 를 로드해야 사용 가능하다(kakao-map.tsx 로더 참조).
     */
    class MarkerClusterer {
      constructor(options: MarkerClustererOptions);
      addMarkers(markers: Marker[], nodraw?: boolean): void;
      clear(): void;
      setMap(map: Map | null): void;
    }

    interface PolylineOptions {
      /** 선을 구성하는 좌표 배열 */
      path: LatLng[];
      strokeWeight?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      /** solid | shortdash | dot 등 */
      strokeStyle?: string;
      /** 겹친 폴리라인의 그리기 순서(클수록 위) */
      zIndex?: number;
    }

    /** 폴리라인 오버레이 (등산로 경로, Task 029) */
    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
      /** 선 스타일을 동적으로 갱신(재생성 없이 색/두께/투명도 변경) */
      setOptions(options: Partial<PolylineOptions>): void;
      /** 겹친 폴리라인의 그리기 순서 설정(선택 강조 시 위로 올림) */
      setZIndex(zIndex: number): void;
      getPath(): LatLng[];
    }

    interface CustomOverlayOptions {
      position: LatLng;
      /** 오버레이 내용(HTML 문자열 또는 DOM 엘리먼트) */
      content: string | HTMLElement;
      map?: Map;
      /** 가로 기준 위치(0~1, 기본 0.5) */
      xAnchor?: number;
      /** 세로 기준 위치(0~1) */
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    }

    /** 커스텀 오버레이 (선택된 탐방로 이름 라벨 등) */
    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLng): void;
    }

    /** 지도/오버레이 이벤트 콜백에 전달되는 마우스 이벤트 */
    interface MouseEvent {
      latLng: LatLng;
    }

    namespace event {
      // 콜백 인자는 대상·이벤트에 따라 다르다(지도 click→MouseEvent, clusterclick→Cluster,
      // marker click→인자 없음). 기본 MouseEvent 로 두되 제네릭으로 좁혀 쓸 수 있게 한다.
      function addListener<T = MouseEvent>(
        target: object,
        type: string,
        handler: (event: T) => void,
      ): void;
      function removeListener<T = MouseEvent>(
        target: object,
        type: string,
        handler: (event: T) => void,
      ): void;
    }

    /**
     * `autoload=false` 로 스크립트를 비동기 로드했을 때, SDK 로드 완료 후
     * 콜백을 실행한다. 이 콜백 안에서만 `kakao.maps.*` 객체 접근이 안전하다.
     */
    function load(callback: () => void): void;
  }

  interface Window {
    kakao: typeof kakao;
  }
}

export {};
