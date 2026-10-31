/**
 * Baseball Sabermetrics Calculation Utilities
 */

/**
 * Parses inning text like "5이닝", "5.1이닝", "2.2이닝", "1 1/3" into outs and decimal innings.
 * In baseball scoring, "5.1" means 5 innings and 1 out (16 outs = 5.3333... innings).
 * "5.2" means 5 innings and 2 outs (17 outs = 5.6667... innings).
 */
export function parseInningsToOuts(text: string | number): number {
  if (typeof text === 'number') {
    const full = Math.floor(text);
    const fraction = text - full;
    // If it's expressed as 5.1 (meaning 1 out)
    if (Math.abs(fraction - 0.1) < 0.01) return full * 3 + 1;
    if (Math.abs(fraction - 0.2) < 0.01) return full * 3 + 2;
    // If it's already decimal 0.333 or 0.667
    if (Math.abs(fraction - 1 / 3) < 0.05) return full * 3 + 1;
    if (Math.abs(fraction - 2 / 3) < 0.05) return full * 3 + 2;
    return Math.round(text * 3);
  }

  const str = String(text).trim();
  // match e.g. "5.1", "5.2", "5", "5이닝", "5.1이닝", "5 1/3"
  const clean = str.replace(/이닝.*/i, '').trim();

  if (clean.includes('1/3')) {
    const full = parseInt(clean, 10) || 0;
    return full * 3 + 1;
  }
  if (clean.includes('2/3')) {
    const full = parseInt(clean, 10) || 0;
    return full * 3 + 2;
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;

  const full = Math.floor(num);
  const frac = Math.round((num - full) * 10); // .1 -> 1, .2 -> 2
  if (frac === 1) return full * 3 + 1;
  if (frac === 2) return full * 3 + 2;
  return full * 3;
}

export function outsToInningsText(outs: number): string {
  const full = Math.floor(outs / 3);
  const rem = outs % 3;
  if (rem === 0) return `${full}이닝`;
  return `${full}.${rem}이닝`;
}

export function outsToDecimalInnings(outs: number): number {
  return outs / 3;
}

/**
 * Batter Sabermetrics calculations
 */
export function calculateBattingMetrics(stats: {
  PA: number;
  AB: number;
  H: number;
  doubles?: number;
  triples?: number;
  HR?: number;
  BB?: number;
  HBP?: number;
  SO?: number;
  SF?: number;
}) {
  const {
    PA = 0,
    AB = 0,
    H = 0,
    doubles = 0,
    triples = 0,
    HR = 0,
    BB = 0,
    HBP = 0,
    SO = 0,
    SF = 0,
  } = stats;

  const singles = Math.max(0, H - (doubles + triples + HR));
  const TB = singles * 1 + doubles * 2 + triples * 3 + HR * 4;

  // AVG (타율)
  const AVG = AB > 0 ? H / AB : 0;

  // OBP (출루율)
  const obpDenominator = AB + BB + HBP + SF;
  const OBP = obpDenominator > 0 ? (H + BB + HBP) / obpDenominator : 0;

  // SLG (장타율)
  const SLG = AB > 0 ? TB / AB : 0;

  // OPS
  const OPS = OBP + SLG;

  // ISO (순장타율)
  const ISO = SLG - AVG;

  // BABIP (인플레이 타구 타율): (H - HR) / (AB - SO - HR + SF)
  const babipDenominator = AB - SO - HR + SF;
  const BABIP = babipDenominator > 0 ? (H - HR) / babipDenominator : 0;

  // wOBA (가중 출루율 - 표준 아마추어/KBO 계수)
  // wOBA = (0.69*BB + 0.72*HBP + 0.89*1B + 1.27*2B + 1.62*3B + 2.10*HR) / (AB + BB + SF + HBP)
  const wOBAdenom = AB + BB + SF + HBP;
  const wOBA =
    wOBAdenom > 0
      ? (0.69 * BB +
          0.72 * HBP +
          0.89 * singles +
          1.27 * doubles +
          1.62 * triples +
          2.1 * HR) /
        wOBAdenom
      : 0;

  // Rate stats
  const totalPA = PA > 0 ? PA : AB + BB + HBP + SF;
  const BB_rate = totalPA > 0 ? (BB / totalPA) * 100 : 0;
  const K_rate = totalPA > 0 ? (SO / totalPA) * 100 : 0;
  const BB_K = SO > 0 ? BB / SO : BB;

  return {
    singles,
    TB,
    AVG,
    OBP,
    SLG,
    OPS,
    ISO,
    BABIP,
    wOBA,
    BB_rate,
    K_rate,
    BB_K,
  };
}

/**
 * Pitcher Sabermetrics calculations
 */
export function calculatePitchingMetrics(stats: {
  outs: number;
  ER: number;
  hits: number;
  HR: number;
  BB: number;
  SO: number;
  FIP_constant?: number;
}) {
  const { outs, ER, hits, HR, BB, SO, FIP_constant = 3.2 } = stats;
  const IP = outs / 3;

  // ERA = (ER * 9) / IP
  const ERA = IP > 0 ? (ER * 9) / IP : 0;

  // WHIP = (hits + BB) / IP
  const WHIP = IP > 0 ? (hits + BB) / IP : 0;

  // FIP = ((13*HR + 3*BB - 2*SO) / IP) + FIP_constant
  const FIP = IP > 0 ? ((13 * HR + 3 * BB - 2 * SO) / IP) + FIP_constant : 0;

  // Per 9 Innings stats
  const K9 = IP > 0 ? (SO * 9) / IP : 0;
  const BB9 = IP > 0 ? (BB * 9) / IP : 0;
  const H9 = IP > 0 ? (hits * 9) / IP : 0;
  const HR9 = IP > 0 ? (HR * 9) / IP : 0;

  // K/BB ratio
  const K_BB = BB > 0 ? SO / BB : SO;

  return {
    IP,
    ERA,
    WHIP,
    FIP,
    K9,
    BB9,
    H9,
    HR9,
    K_BB,
  };
}

/**
 * Number formatters for Sabermetric display
 */
export function formatAvg(val: number): string {
  if (isNaN(val) || val <= 0) return '.000';
  if (val >= 1) return val.toFixed(3);
  return val.toFixed(3).replace(/^0/, '');
}

export function formatRate(val: number, decimals = 2): string {
  if (isNaN(val)) return '0.00';
  return val.toFixed(decimals);
}
