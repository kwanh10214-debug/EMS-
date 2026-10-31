import {
  GameRecord,
  BatterCumulativeStat,
  PitcherCumulativeStat,
  BatterMatchStat,
  PitcherMatchStat,
  PlayerStatusInfo,
} from '../types/baseball';
import {
  calculateBattingMetrics,
  calculatePitchingMetrics,
  parseInningsToOuts,
} from './sabermetrics';

/**
 * Normalizes player nicknames for grouping
 */
export function normalizeNickname(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Aggregates all game records and calculates cumulative sabermetric stats per player nickname
 */
export function aggregateGameRecords(
  games: GameRecord[],
  playerStatuses: Record<string, PlayerStatusInfo> = {}
): {
  batters: BatterCumulativeStat[];
  pitchers: PitcherCumulativeStat[];
} {
  const batterMap = new Map<
    string,
    {
      name: string;
      games: number;
      PA: number;
      AB: number;
      R: number;
      H: number;
      doubles: number;
      triples: number;
      HR: number;
      RBI: number;
      BB: number;
      HBP: number;
      SO: number;
      SF: number;
      SB: number;
      CS: number;
    }
  >();

  const pitcherMap = new Map<
    string,
    {
      name: string;
      games: number;
      starts: number;
      wins: number;
      losses: number;
      holds: number;
      saves: number;
      totalOuts: number;
      runs: number;
      ER: number;
      hits: number;
      HR: number;
      BB: number;
      SO: number;
    }
  >();

  for (const game of games) {
    // Process Batters
    const seenBattersInThisGame = new Set<string>();

    for (const b of game.batters) {
      if (!b.name || b.name.trim() === '') continue;
      const key = normalizeNickname(b.name);

      let record = batterMap.get(key);
      if (!record) {
        record = {
          name: b.name.trim(),
          games: 0,
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
        };
        batterMap.set(key, record);
      }

      if (!seenBattersInThisGame.has(key)) {
        record.games += 1;
        seenBattersInThisGame.add(key);
      }

      record.PA += b.PA || 0;
      record.AB += b.AB || 0;
      record.R += b.R || 0;
      record.H += b.H || 0;
      record.doubles += b.doubles || 0;
      record.triples += b.triples || 0;
      record.HR += b.HR || 0;
      record.RBI += b.RBI || 0;
      record.BB += b.BB || 0;
      record.HBP += b.HBP || 0;
      record.SO += b.SO || 0;
      record.SF += b.SF || 0;
      record.SB += b.SB || 0;
      record.CS += b.CS || 0;
    }

    // Process Pitchers
    const seenPitchersInThisGame = new Set<string>();

    for (const p of game.pitchers) {
      if (!p.name || p.name.trim() === '') continue;
      const key = normalizeNickname(p.name);

      let record = pitcherMap.get(key);
      if (!record) {
        record = {
          name: p.name.trim(),
          games: 0,
          starts: 0,
          wins: 0,
          losses: 0,
          holds: 0,
          saves: 0,
          totalOuts: 0,
          runs: 0,
          ER: 0,
          hits: 0,
          HR: 0,
          BB: 0,
          SO: 0,
        };
        pitcherMap.set(key, record);
      }

      if (!seenPitchersInThisGame.has(key)) {
        record.games += 1;
        seenPitchersInThisGame.add(key);
      }

      if (p.role === 'SP') {
        record.starts += 1;
      }

      if (p.decision === '승') record.wins += 1;
      else if (p.decision === '패') record.losses += 1;
      else if (p.decision === '홀드') record.holds += 1;
      else if (p.decision === '세이브') record.saves += 1;

      const outs = parseInningsToOuts(p.inningsText || p.IP);
      record.totalOuts += outs;
      record.runs += p.runs || 0;
      record.ER += p.ER || 0;
      record.hits += p.hits || 0;
      record.HR += p.HR || 0;
      record.BB += p.BB || 0;
      record.SO += p.SO || 0;
    }
  }

  // Calculate Batter Sabermetrics
  const batters: BatterCumulativeStat[] = Array.from(batterMap.values()).map(
    (b) => {
      const metrics = calculateBattingMetrics({
        PA: b.PA,
        AB: b.AB,
        H: b.H,
        doubles: b.doubles,
        triples: b.triples,
        HR: b.HR,
        BB: b.BB,
        HBP: b.HBP,
        SO: b.SO,
        SF: b.SF,
      });

      return {
        name: b.name,
        games: b.games,
        PA: b.PA,
        AB: b.AB,
        R: b.R,
        H: b.H,
        doubles: b.doubles,
        triples: b.triples,
        HR: b.HR,
        RBI: b.RBI,
        BB: b.BB,
        HBP: b.HBP,
        SO: b.SO,
        SF: b.SF,
        SB: b.SB,
        CS: b.CS,
        TB: metrics.TB,
        AVG: metrics.AVG,
        OBP: metrics.OBP,
        SLG: metrics.SLG,
        OPS: metrics.OPS,
        ISO: metrics.ISO,
        BABIP: metrics.BABIP,
        wOBA: metrics.wOBA,
        BB_rate: metrics.BB_rate,
        K_rate: metrics.K_rate,
        BB_K: metrics.BB_K,
        status: playerStatuses[normalizeNickname(b.name)]?.status || 'active',
        statusInfo: playerStatuses[normalizeNickname(b.name)],
      };
    }
  );

export const STATUS_PRIORITY: Record<string, number> = {
  active: 1,      // 현역
  retired: 2,     // 은퇴
  transferred: 3, // 이적
  inactive: 4,    // 휴식/비활동
};

  // Sort batters: Status priority (현역 > 은퇴 > 이적), then OPS descending (좋은 스탯 높게), then Name ABC (가나다)
  batters.sort((a, b) => {
    const statusA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
    const statusB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    if (b.OPS !== a.OPS) return b.OPS - a.OPS;
    if (b.H !== a.H) return b.H - a.H;
    return a.name.localeCompare(b.name, 'ko');
  });

  // Calculate Pitcher Sabermetrics
  const pitchers: PitcherCumulativeStat[] = Array.from(pitcherMap.values()).map(
    (p) => {
      const metrics = calculatePitchingMetrics({
        outs: p.totalOuts,
        ER: p.ER,
        hits: p.hits,
        HR: p.HR,
        BB: p.BB,
        SO: p.SO,
      });

      return {
        name: p.name,
        games: p.games,
        starts: p.starts,
        wins: p.wins,
        losses: p.losses,
        holds: p.holds,
        saves: p.saves,
        IP: metrics.IP,
        totalOuts: p.totalOuts,
        runs: p.runs,
        ER: p.ER,
        hits: p.hits,
        HR: p.HR,
        BB: p.BB,
        SO: p.SO,
        ERA: metrics.ERA,
        WHIP: metrics.WHIP,
        FIP: metrics.FIP,
        K9: metrics.K9,
        BB9: metrics.BB9,
        K_BB: metrics.K_BB,
        H9: metrics.H9,
        HR9: metrics.HR9,
        status: playerStatuses[normalizeNickname(p.name)]?.status || 'active',
        statusInfo: playerStatuses[normalizeNickname(p.name)],
      };
    }
  );

  // Sort pitchers: Status priority (현역 > 은퇴 > 이적), then Wins desc, then ERA asc (좋은 스탯 낮게), then Name ABC (가나다)
  pitchers.sort((a, b) => {
    const statusA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
    const statusB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.ERA !== b.ERA) return a.ERA - b.ERA;
    if (a.WHIP !== b.WHIP) return a.WHIP - b.WHIP;
    return a.name.localeCompare(b.name, 'ko');
  });

  return { batters, pitchers };
}
