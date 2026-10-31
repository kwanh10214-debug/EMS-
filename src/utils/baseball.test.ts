import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInningsToOuts, calculateBattingMetrics, calculatePitchingMetrics } from './sabermetrics';
import { parseMatchRecord, getSampleMatchText } from './parser';
import { aggregateGameRecords } from './accumulation';
import { GameRecord } from '../types/baseball';

test('parseInningsToOuts accurately parses baseball notation', () => {
  assert.equal(parseInningsToOuts('5이닝'), 15);
  assert.equal(parseInningsToOuts('5.1이닝'), 16);
  assert.equal(parseInningsToOuts('5.2이닝'), 17);
  assert.equal(parseInningsToOuts('1 1/3'), 4);
  assert.equal(parseInningsToOuts('2 2/3'), 8);
  assert.equal(parseInningsToOuts(0), 0);
});

test('calculateBattingMetrics calculates AVG, OBP, SLG, OPS, ISO', () => {
  // 4 AB, 2 H (1 single, 1 HR), 1 BB
  const metrics = calculateBattingMetrics({
    PA: 5,
    AB: 4,
    H: 2,
    doubles: 0,
    triples: 0,
    HR: 1,
    BB: 1,
    HBP: 0,
    SO: 1,
    SF: 0,
  });

  assert.equal(metrics.AVG, 0.5); // 2 / 4
  assert.equal(metrics.OBP, 0.6); // (2 + 1) / (4 + 1)
  assert.equal(metrics.TB, 1 * 1 + 1 * 4); // 5 total bases
  assert.equal(metrics.SLG, 1.25); // 5 / 4
  assert.equal(metrics.OPS, 1.85); // 0.6 + 1.25
  assert.equal(metrics.ISO, 0.75); // 1.25 - 0.5
});

test('calculatePitchingMetrics calculates ERA, WHIP, FIP, K/9', () => {
  // 5 innings (15 outs), 2 ER, 4 hits, 1 HR, 2 BB, 6 SO
  const metrics = calculatePitchingMetrics({
    outs: 15,
    ER: 2,
    hits: 4,
    HR: 1,
    BB: 2,
    SO: 6,
    FIP_constant: 3.2,
  });

  assert.equal(metrics.IP, 5);
  assert.equal(metrics.ERA, (2 * 9) / 5); // 3.60
  assert.equal(metrics.WHIP, (4 + 2) / 5); // 1.20
  // FIP: ((13*1 + 3*2 - 2*6) / 5) + 3.20 = (7 / 5) + 3.2 = 1.4 + 3.2 = 4.60
  assert.equal(Math.round(metrics.FIP * 100) / 100, 4.6);
  assert.equal(metrics.K9, (6 * 9) / 5); // 10.8
});

test('parseMatchRecord parses the exact user format', () => {
  const sample = getSampleMatchText();
  const parsed = parseMatchRecord(sample);

  assert.equal(parsed.header.date, '2026. 05. 14. 14시');
  assert.equal(parsed.header.opponent, '드래곤즈');
  assert.equal(parsed.header.isHome, true);
  assert.equal(parsed.header.ourScore, 8);
  assert.equal(parsed.header.oppScore, 5);
  assert.equal(parsed.header.outcome, '승');

  assert.equal(parsed.batters.length, 9);
  assert.equal(parsed.batters[0].name, '번개타자');
  assert.equal(parsed.batters[0].position, 'CF');
  assert.equal(parsed.batters[0].AB, 4);
  assert.equal(parsed.batters[0].H, 2);
  assert.equal(parsed.batters[0].HR, 1);
  assert.equal(parsed.batters[0].RBI, 2);

  assert.equal(parsed.pitchers.length, 4);
  assert.equal(parsed.pitchers[0].name, '에이스김');
  assert.equal(parsed.pitchers[0].role, 'SP');
  assert.equal(parsed.pitchers[0].IP, 5);
  assert.equal(parsed.pitchers[0].ER, 2);
  assert.equal(parsed.pitchers[0].SO, 6);
  assert.equal(parsed.pitchers[0].decision, '승');
});

test('aggregateGameRecords accumulates statistics when nicknames match', () => {
  const game1: GameRecord = {
    id: 'game-1',
    header: {
      date: '2026. 05. 10.',
      opponent: '팀A',
      isHome: true,
      ourScore: 5,
      oppScore: 3,
      outcome: '승',
    },
    lineScore: {} as any,
    batters: [
      {
        order: 1,
        name: '홍길동',
        PA: 4,
        AB: 4,
        R: 1,
        H: 2,
        doubles: 1,
        triples: 0,
        HR: 0,
        RBI: 1,
        BB: 0,
        HBP: 0,
        SO: 0,
        SF: 0,
        SB: 1,
        CS: 0,
      },
    ],
    pitchers: [
      {
        role: 'SP',
        name: '최동원',
        inningsText: '5이닝',
        IP: 5,
        runs: 2,
        ER: 2,
        hits: 4,
        HR: 1,
        BB: 2,
        SO: 5,
        decision: '승',
      },
    ],
    createdAt: new Date().toISOString(),
  };

  const game2: GameRecord = {
    id: 'game-2',
    header: {
      date: '2026. 05. 17.',
      opponent: '팀B',
      isHome: false,
      ourScore: 4,
      oppScore: 2,
      outcome: '승',
    },
    lineScore: {} as any,
    batters: [
      {
        order: 1,
        name: '홍길동', // Same nickname!
        PA: 4,
        AB: 3,
        R: 2,
        H: 1,
        doubles: 0,
        triples: 0,
        HR: 1,
        RBI: 2,
        BB: 1,
        HBP: 0,
        SO: 1,
        SF: 0,
        SB: 0,
        CS: 0,
      },
      {
        order: 2,
        name: '이순신', // New player!
        PA: 4,
        AB: 4,
        R: 0,
        H: 1,
        doubles: 0,
        triples: 0,
        HR: 0,
        RBI: 0,
        BB: 0,
        HBP: 0,
        SO: 2,
        SF: 0,
        SB: 0,
        CS: 0,
      },
    ],
    pitchers: [
      {
        role: 'SP',
        name: '최동원', // Same nickname!
        inningsText: '4이닝',
        IP: 4,
        runs: 1,
        ER: 1,
        hits: 3,
        HR: 0,
        BB: 1,
        SO: 4,
        decision: '승',
      },
    ],
    createdAt: new Date().toISOString(),
  };

  const { batters, pitchers } = aggregateGameRecords([game1, game2]);

  // 홍길동 accumulated stats: 2 games, 7 AB, 3 H (1 double, 1 HR), 1 BB
  const hong = batters.find((b) => b.name === '홍길동');
  assert.ok(hong);
  assert.equal(hong.games, 2);
  assert.equal(hong.PA, 8);
  assert.equal(hong.AB, 7);
  assert.equal(hong.H, 3);
  assert.equal(hong.HR, 1);
  assert.equal(hong.doubles, 1);
  assert.equal(hong.BB, 1);
  assert.equal(hong.SB, 1);
  assert.equal(hong.AVG, 3 / 7);

  // 이순신: 1 game
  const lee = batters.find((b) => b.name === '이순신');
  assert.ok(lee);
  assert.equal(lee.games, 1);
  assert.equal(lee.AB, 4);

  // 최동원 accumulated stats: 2 games, 2 starts, 2 wins, 9 IP, 3 ER, 9 SO
  const choi = pitchers.find((p) => p.name === '최동원');
  assert.ok(choi);
  assert.equal(choi.games, 2);
  assert.equal(choi.starts, 2);
  assert.equal(choi.wins, 2);
  assert.equal(choi.totalOuts, 27); // 5*3 + 4*3
  assert.equal(choi.IP, 9);
  assert.equal(choi.ER, 3);
  assert.equal(choi.ERA, (3 * 9) / 9); // 3.00 ERA
  assert.equal(choi.SO, 9);
});
