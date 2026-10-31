import {
  MatchHeader,
  LineScore,
  BatterMatchStat,
  PitcherMatchStat,
  GameRecord,
} from '../types/baseball';
import { parseInningsToOuts, outsToDecimalInnings } from './sabermetrics';

/**
 * Parses the raw team record text into a structured GameRecord
 */
export function parseMatchRecord(text: string): {
  header: MatchHeader;
  lineScore: LineScore;
  batters: BatterMatchStat[];
  pitchers: PitcherMatchStat[];
} {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Parse Header
  // Example: "2026. 00. 00. 00시 vs 상대팀 (홈or원정) 0:0 (승or패)"
  let header: MatchHeader = {
    date: '2026. 00. 00. 00시',
    opponent: '상대팀',
    isHome: true,
    ourScore: 0,
    oppScore: 0,
    outcome: '승',
  };

  const headerLineIndex = lines.findIndex(
    (l) => l.includes('vs') || l.includes('VS') || /\d{1,2}:\d{1,2}/.test(l)
  );

  if (headerLineIndex !== -1) {
    const hl = lines[headerLineIndex];

    // Extract date (anything before "vs")
    const vsMatch = hl.match(/^(.*?)(?:vs|VS)\s*(.*)$/i);
    if (vsMatch) {
      const rawDate = vsMatch[1].trim();
      if (rawDate) header.date = rawDate;

      const rest = vsMatch[2].trim();
      // Opponent name is up to '(' or score
      const oppMatch = rest.match(/^([^(0-9:]+)/);
      if (oppMatch) {
        header.opponent = oppMatch[1].trim();
      }

      // Check Home / Away
      if (rest.includes('(원정)') || rest.includes('원정')) {
        header.isHome = false;
      } else {
        header.isHome = true;
      }

      // Check Score e.g. "8:5" or "0:0"
      const scoreMatch = rest.match(/(\d+)\s*:\s*(\d+)/);
      if (scoreMatch) {
        header.ourScore = parseInt(scoreMatch[1], 10);
        header.oppScore = parseInt(scoreMatch[2], 10);
      }

      // Check Outcome (승 / 패 / 무)
      if (rest.includes('(승)') || rest.includes('승리')) {
        header.outcome = '승';
      } else if (rest.includes('(패)') || rest.includes('패전')) {
        header.outcome = '패';
      } else if (rest.includes('(무)') || rest.includes('무승부')) {
        header.outcome = '무';
      } else {
        header.outcome = header.ourScore >= header.oppScore ? '승' : '패';
      }
    }
  }

  // 2. Parse Scoreboard / Line Score
  // Header line e.g. "1 2 3 4 5 6 7 8 9 H E B"
  let lineScore: LineScore = {
    headers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'H', 'E', 'B'],
    away: { name: '원정팀', innings: [0, 0, 0, 0, 0, 0, 0, 0, 0], R: 0, H: 0, E: 0, B: 0 },
    home: { name: '홈팀', innings: [0, 0, 0, 0, 0, 0, 0, 0, 0], R: 0, H: 0, E: 0, B: 0 },
  };

  const lineScoreHeaderIdx = lines.findIndex((l) =>
    l.includes('1') && l.includes('2') && (l.includes('H') || l.includes('E') || l.includes('B'))
  );

  if (lineScoreHeaderIdx !== -1) {
    const rawTokens = lines[lineScoreHeaderIdx].split(/\s+/);
    if (rawTokens.length >= 9) {
      lineScore.headers = rawTokens;
    }

    // Next lines could be:
    // line 1 (Away)
    // separator (e.g. "---------")
    // line 2 (Home)
    const scoreLines: string[] = [];
    for (let i = lineScoreHeaderIdx + 1; i < lines.length && scoreLines.length < 2; i++) {
      const line = lines[i];
      if (/^[-=_\s]+$/.test(line)) continue; // ignore divider line
      // if line contains digits
      if (/\d/.test(line) && !line.startsWith('1.') && !/^[S|R|C]P/.test(line)) {
        scoreLines.push(line);
      } else {
        break;
      }
    }

    if (scoreLines.length >= 1) {
      const awayNums = scoreLines[0].split(/\s+/).filter(Boolean);
      const innings = awayNums.slice(0, 9).map((v) => (v === 'X' || v === '-' ? v : parseInt(v, 10) || 0));
      const H = awayNums.length >= 10 ? parseInt(awayNums[9], 10) || 0 : 0;
      const E = awayNums.length >= 11 ? parseInt(awayNums[10], 10) || 0 : 0;
      const B = awayNums.length >= 12 ? parseInt(awayNums[11], 10) || 0 : 0;
      const R = innings.reduce<number>((acc, cur) => acc + (typeof cur === 'number' ? cur : 0), 0);
      lineScore.away = {
        name: header.isHome ? header.opponent || '원정팀' : '우리팀',
        innings,
        R,
        H,
        E,
        B,
      };
    }

    if (scoreLines.length >= 2) {
      const homeNums = scoreLines[1].split(/\s+/).filter(Boolean);
      const innings = homeNums.slice(0, 9).map((v) => (v === 'X' || v === '-' ? v : parseInt(v, 10) || 0));
      const H = homeNums.length >= 10 ? parseInt(homeNums[9], 10) || 0 : 0;
      const E = homeNums.length >= 11 ? parseInt(homeNums[10], 10) || 0 : 0;
      const B = homeNums.length >= 12 ? parseInt(homeNums[11], 10) || 0 : 0;
      const R = innings.reduce<number>((acc, cur) => acc + (typeof cur === 'number' ? cur : 0), 0);
      lineScore.home = {
        name: header.isHome ? '우리팀' : header.opponent || '홈팀',
        innings,
        R,
        H,
        E,
        B,
      };
    }
  }

  // 3. Parse Batters (1. ~ 9., up to 20 for substitutes)
  const batters: BatterMatchStat[] = [];
  const batterLineRegex = /^([1-9]|1[0-9]|20)\.\s*(.*)$/;

  for (const line of lines) {
    if (line.includes('vs') || line.includes('VS') || line.includes('시 ')) continue;
    const match = line.match(batterLineRegex);
    if (match) {
      const order = parseInt(match[1], 10);
      const content = match[2].trim();

      if (!content) {
        batters.push({
          order,
          name: `타자${order}`,
          PA: 0,
          AB: 0,
          R: 0,
          H: 0,
          doubles: 0,
          triples: 0,
          HR: 0,
          RBI: 0,
          BB: 0,
          HBP: 0,
          SO: 0,
          SF: 0,
          SB: 0,
          CS: 0,
        });
        continue;
      }

      // Extract Name and optional Position: e.g. "홍길동 (CF)", "김타자/중견수", "이순신 4타수 2안타"
      let name = '';
      let position = '';
      let rest = content;

      // Check if position is in brackets
      const posMatch = content.match(/^([^\s(/]+)\s*(?:\(([^)]+)\)|\/([^\s]+))?\s*(.*)$/);
      if (posMatch) {
        name = posMatch[1].trim();
        position = (posMatch[2] || posMatch[3] || '').trim();
        rest = (posMatch[4] || '').trim();
      } else {
        const parts = content.split(/\s+/);
        name = parts[0];
        rest = parts.slice(1).join(' ');
      }

      // Default values
      let PA = 0;
      let AB = 0;
      let R = 0;
      let H = 0;
      let doubles = 0;
      let triples = 0;
      let HR = 0;
      let RBI = 0;
      let BB = 0;
      let HBP = 0;
      let SO = 0;
      let SF = 0;
      let SB = 0;
      let CS = 0;

      // Extract numbers with patterns
      const paMatch = rest.match(/(\d+)\s*타석/);
      if (paMatch) PA = parseInt(paMatch[1], 10);

      const abMatch = rest.match(/(\d+)\s*타수/);
      if (abMatch) AB = parseInt(abMatch[1], 10);

      const hMatch = rest.match(/(\d+)\s*안타/);
      if (hMatch) H = parseInt(hMatch[1], 10);

      const dMatch = rest.match(/(\d+)\s*2루타|2루타\s*(\d+)/);
      if (dMatch) doubles = parseInt(dMatch[1] || dMatch[2], 10);

      const tMatch = rest.match(/(\d+)\s*3루타|3루타\s*(\d+)/);
      if (tMatch) triples = parseInt(tMatch[1] || tMatch[2], 10);

      const hrMatch = rest.match(/(\d+)\s*홈런|홈런\s*(\d+)|(\d+)HR/i);
      if (hrMatch) HR = parseInt(hrMatch[1] || hrMatch[2] || hrMatch[3], 10);

      const rbiMatch = rest.match(/(\d+)\s*타점|(\d+)RBI/i);
      if (rbiMatch) RBI = parseInt(rbiMatch[1] || rbiMatch[2], 10);

      const rMatch = rest.match(/(\d+)\s*득점|(\d+)R\b/i);
      if (rMatch) R = parseInt(rMatch[1] || rMatch[2], 10);

      const bbMatch = rest.match(/(\d+)\s*볼넷|(\d+)BB/i);
      if (bbMatch) BB = parseInt(bbMatch[1] || bbMatch[2], 10);

      const hbpMatch = rest.match(/(\d+)\s*(?:사구|몸맞|데드볼|HBP)/i);
      if (hbpMatch) HBP = parseInt(hbpMatch[1], 10);

      // 사사구 (if combined)
      const fourMatch = rest.match(/(\d+)\s*사사구/);
      if (fourMatch && BB === 0 && HBP === 0) {
        BB = parseInt(fourMatch[1], 10);
      }

      const soMatch = rest.match(/(\d+)\s*(?:삼진|탈삼진)|(\d+)K\b/i);
      if (soMatch) SO = parseInt(soMatch[1] || soMatch[2], 10);

      const sfMatch = rest.match(/(\d+)\s*(?:희타|희비|희생|SF)/i);
      if (sfMatch) SF = parseInt(sfMatch[1], 10);

      const sbMatch = rest.match(/(\d+)\s*도루|(\d+)SB/i);
      if (sbMatch) SB = parseInt(sbMatch[1] || sbMatch[2], 10);

      // Logic adjustments
      if (AB === 0 && H > 0) AB = H;
      if (PA === 0) PA = AB + BB + HBP + SF;

      batters.push({
        order,
        name: name || `타자${order}`,
        position: position || undefined,
        PA,
        AB,
        R,
        H,
        doubles,
        triples,
        HR,
        RBI,
        BB,
        HBP,
        SO,
        SF,
        SB,
        CS,
      });
    }
  }

  // 4. Parse Pitchers
  // Format: "SP 투수닉 0이닝 0실점 0자책 0피안타 0피홈런 0사사구 0K (승or패)"
  const pitchers: PitcherMatchStat[] = [];
  const pitcherRegex =
    /^(SP|RP|CP|선발|구원|마무리)\s+([^\s]+)\s+([\d\./\s]+(?:이닝)?)\s+(\d+)\s*실점\s+(\d+)\s*자책\s+(\d+)\s*피안타\s+(\d+)\s*피홈런\s+(\d+)\s*사사구\s+(\d+)\s*(?:K|탈삼진|삼진)(?:\s*\(([^)]+)\))?/i;

  for (const line of lines) {
    const pMatch = line.match(pitcherRegex);
    if (pMatch) {
      let rawRole = pMatch[1].toUpperCase();
      let role: 'SP' | 'RP' | 'CP' = 'RP';
      if (rawRole === 'SP' || rawRole === '선발') role = 'SP';
      else if (rawRole === 'CP' || rawRole === '마무리') role = 'CP';

      const name = pMatch[2].trim();
      const inningsText = pMatch[3].trim();
      const runs = parseInt(pMatch[4], 10) || 0;
      const ER = parseInt(pMatch[5], 10) || 0;
      const hits = parseInt(pMatch[6], 10) || 0;
      const HR = parseInt(pMatch[7], 10) || 0;
      const BB = parseInt(pMatch[8], 10) || 0;
      const SO = parseInt(pMatch[9], 10) || 0;
      const rawDecision = pMatch[10]?.trim();

      let decision: PitcherMatchStat['decision'] = undefined;
      if (rawDecision) {
        if (rawDecision.includes('승')) decision = '승';
        else if (rawDecision.includes('패')) decision = '패';
        else if (rawDecision.includes('홀드')) decision = '홀드';
        else if (rawDecision.includes('세이브')) decision = '세이브';
      }

      const outs = parseInningsToOuts(inningsText);
      const IP = outsToDecimalInnings(outs);

      pitchers.push({
        role,
        name,
        inningsText,
        IP,
        runs,
        ER,
        hits,
        HR,
        BB,
        SO,
        decision,
      });
    } else {
      // Loose pitcher line matching if role and name are present
      const looseRoleMatch = line.match(/^(SP|RP|CP|선발|구원|마무리)\s+([^\s]+)\s*(.*)$/i);
      if (looseRoleMatch && !line.startsWith('1.') && !line.includes('vs')) {
        let rawRole = looseRoleMatch[1].toUpperCase();
        let role: 'SP' | 'RP' | 'CP' = 'RP';
        if (rawRole === 'SP' || rawRole === '선발') role = 'SP';
        else if (rawRole === 'CP' || rawRole === '마무리') role = 'CP';

        const name = looseRoleMatch[2].trim();
        const rest = looseRoleMatch[3] || '';

        const innMatch = rest.match(/([\d\.]+(?:이닝|\s*1\/3|\s*2\/3)?)/);
        const inningsText = innMatch ? innMatch[1].trim() : '0이닝';
        const outs = parseInningsToOuts(inningsText);

        const rMatch = rest.match(/(\d+)\s*실점/);
        const erMatch = rest.match(/(\d+)\s*자책/);
        const hMatch = rest.match(/(\d+)\s*피안타/);
        const hrMatch = rest.match(/(\d+)\s*피홈런/);
        const bbMatch = rest.match(/(\d+)\s*사사구/);
        const soMatch = rest.match(/(\d+)\s*(?:K|탈삼진|삼진)/i);
        const decMatch = rest.match(/\((승|패|홀드|세이브)\)/);

        pitchers.push({
          role,
          name,
          inningsText,
          IP: outsToDecimalInnings(outs),
          runs: rMatch ? parseInt(rMatch[1], 10) : 0,
          ER: erMatch ? parseInt(erMatch[1], 10) : 0,
          hits: hMatch ? parseInt(hMatch[1], 10) : 0,
          HR: hrMatch ? parseInt(hrMatch[1], 10) : 0,
          BB: bbMatch ? parseInt(bbMatch[1], 10) : 0,
          SO: soMatch ? parseInt(soMatch[1], 10) : 0,
          decision: (decMatch ? decMatch[1] : undefined) as any,
        });
      }
    }
  }

  return { header, lineScore, batters, pitchers };
}

/**
 * Creates default sample text matching user's exact specification
 */
export function getSampleMatchText(): string {
  return `2026. 05. 14. 14시 vs 드래곤즈 (홈) 8:5 (승)

1 2 3 4 5 6 7 8 9 H E B
0 1 0 0 2 0 0 2 0 8 1 3
------------------- - - -
1 0 2 0 3 0 2 0 X 11 0 5

1. 번개타자 (CF) 4타수 2안타 1홈런 2타점 2득점 1볼넷 1도루
2. 출루머신 (2B) 3타수 1안타 2득점 2볼넷
3. 홈런왕 (1B) 4타수 2안타 1홈런 3타점 1득점 1삼진
4. 해결사 (3B) 4타수 2안타 1-2루타 1타점 1득점
5. 안타제조기 (LF) 3타수 1안타 1볼넷 1득점
6. 철벽포수 (C) 4타수 1안타 1삼진
7. 날쌘돌이 (SS) 3타수 1안타 1도루 1볼넷
8. 대포알 (DH) 4타수 0안타 2삼진
9. 끈질긴타자 (RF) 3타수 1안타 1타점 1볼넷

SP 에이스김 5이닝 2실점 2자책 4피안타 1피홈런 2사사구 6K (승)
RP 철벽박 2이닝 1실점 1자책 2피안타 0피홈런 1사사구 3K (홀드)
RP 마당쇠이 1이닝 1실점 0자책 1피안타 0피홈런 0사사구 1K
CP 끝판왕정 1이닝 0실점 0자책 0피안타 0피홈런 0사사구 2K (세이브)`;
}
