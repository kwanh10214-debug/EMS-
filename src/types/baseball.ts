export type PlayerStatusType = 'active' | 'retired' | 'transferred' | 'inactive';

export interface PlayerStatusInfo {
  name: string;
  status: PlayerStatusType;
  note?: string;         // e.g. "2026 영구결번 은퇴", "드래곤즈로 이적"
  destination?: string;  // 이적 팀명
  updatedAt: string;
}

export interface MatchHeader {
  date: string;          // e.g. "2026. 05. 14. 14시"
  opponent: string;      // e.g. "상대팀" or "드래곤즈"
  isHome: boolean;       // true: 홈, false: 원정
  ourScore: number;
  oppScore: number;
  outcome: '승' | '패' | '무';
}

export interface LineScoreRow {
  name: string;          // e.g. "원정팀" or "우리팀"
  innings: (number | string)[]; // 1~9 (or 'X', '-')
  R: number;             // 득점 / 실점
  H: number;             // 안타
  E: number;             // 실책
  B: number;             // 사사구 (볼넷)
}

export interface LineScore {
  headers: string[];     // ["1", "2", "3", "4", "5", "6", "7", "8", "9", "H", "E", "B"]
  away: LineScoreRow;
  home: LineScoreRow;
}

export interface BatterMatchStat {
  order: number;         // 1 ~ 9 (or pinch hitter)
  name: string;          // 타자 닉네임
  position?: string;     // e.g. "CF", "중견수", "지명타자"
  PA: number;            // 타석
  AB: number;            // 타수
  R: number;             // 득점
  H: number;             // 안타 (단타+2루타+3루타+홈런 합계)
  doubles: number;       // 2루타
  triples: number;       // 3루타
  HR: number;            // 홈런
  RBI: number;           // 타점
  BB: number;            // 볼넷
  HBP: number;           // 사구(몸에 맞는 공)
  SO: number;            // 삼진
  SF: number;            // 희생타/희생플라이
  SB: number;            // 도루
  CS: number;            // 도루실패
  note?: string;         // 비고 (예: 2루타 1, 도루 1)
}

export interface PitcherMatchStat {
  role: 'SP' | 'RP' | 'CP'; // 선발(SP), 구원(RP), 마무리(CP)
  name: string;             // 투수 닉네임
  inningsText: string;      // e.g. "5이닝", "2.1이닝", "1 1/3이닝"
  IP: number;               // 이닝 실수값 (5.0, 2.3333, etc.)
  runs: number;             // 실점
  ER: number;               // 자책점
  hits: number;             // 피안타
  HR: number;               // 피홈런
  BB: number;               // 사사구 (볼넷+사구)
  SO: number;               // 탈삼진 (K)
  decision?: '승' | '패' | '홀드' | '세이브' | '';
}

export interface BatterCumulativeStat {
  name: string;          // 닉네임
  games: number;         // 경기 수
  PA: number;            // 총 타석
  AB: number;            // 총 타수
  R: number;             // 총 득점
  H: number;             // 총 안타
  doubles: number;       // 2루타
  triples: number;       // 3루타
  HR: number;            // 홈런
  RBI: number;           // 타점
  BB: number;            // 볼넷
  HBP: number;           // 사구
  SO: number;            // 삼진
  SF: number;            // 희생플라이
  SB: number;            // 도루
  CS: number;            // 도루실패
  TB: number;            // 루타 (Total Bases)
  AVG: number;           // 타율
  OBP: number;           // 출루율
  SLG: number;           // 장타율
  OPS: number;           // OPS
  ISO: number;           // 순장타율 (SLG - AVG)
  BABIP: number;         // 인플레이 타구 타율
  wOBA: number;          // 가중 출루율
  BB_rate: number;       // 볼넷 %
  K_rate: number;        // 삼진 %
  BB_K: number;          // 볼넷/삼진 비
  status?: PlayerStatusType;
  statusInfo?: PlayerStatusInfo;
}

export interface PitcherCumulativeStat {
  name: string;          // 닉네임
  games: number;         // 등판 수
  starts: number;        // 선발 등판
  wins: number;          // 승
  losses: number;        // 패
  holds: number;         // 홀드
  saves: number;         // 세이브
  IP: number;            // 총 이닝 (실수)
  totalOuts: number;     // 아웃카운트 (IP 정밀 변환용)
  runs: number;          // 총 실점
  ER: number;            // 총 자책점
  hits: number;          // 피안타
  HR: number;            // 피홈런
  BB: number;            // 사사구
  SO: number;            // 탈삼진
  ERA: number;           // 평균자책점 (9이닝 기준)
  WHIP: number;          // 이닝당 출루허용률
  FIP: number;           // 수비무관 평균자책점
  K9: number;            // 9이닝당 탈삼진
  BB9: number;           // 9이닝당 볼넷
  K_BB: number;          // 삼진/볼넷 비
  H9: number;            // 9이닝당 피안타
  HR9: number;           // 9이닝당 피홈런
  status?: PlayerStatusType;
  statusInfo?: PlayerStatusInfo;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: 'owner' | 'manager' | 'scorer'; // 최고관리자 | 공동관리자 | 기록관리자
  addedAt: string;
  isDriveGranted?: boolean;
}

export interface GameRecord {
  id: string;
  rawText?: string;
  header: MatchHeader;
  lineScore: LineScore;
  batters: BatterMatchStat[];
  pitchers: PitcherMatchStat[];
  createdAt: string;
}
