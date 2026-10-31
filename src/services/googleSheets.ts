import {
  GameRecord,
  BatterCumulativeStat,
  PitcherCumulativeStat,
} from '../types/baseball';
import { formatAvg, formatRate, outsToInningsText } from '../utils/sabermetrics';
import { STATUS_PRIORITY } from '../utils/accumulation';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Creates a new dedicated Google Spreadsheet for the baseball team
 */
export async function createTeamSpreadsheet(
  accessToken: string,
  title = '야구팀 기록지 & 세이버메트릭스 누적'
): Promise<SheetInfo> {
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: '타자_세이버메트릭스',
          gridProperties: { rowCount: 1000, columnCount: 50, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: '투수_세이버메트릭스',
          gridProperties: { rowCount: 1000, columnCount: 50, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: '경기기록_로그',
          gridProperties: { rowCount: 1000, columnCount: 50, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: '최신경기_상세',
          gridProperties: { rowCount: 1000, columnCount: 50, frozenRowCount: 1 },
        },
      },
    ],
  };

  const response = await fetch(SHEETS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`스프레드시트 생성 실패: ${err}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    title: data.properties?.title || title,
  };
}

/**
 * Fetches metadata of an existing spreadsheet
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetInfo> {
  const response = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('스프레드시트를 찾을 수 없거나 접근 권한이 없습니다.');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    title: data.properties?.title || '연결된 스프레드시트',
  };
}

/**
 * Grants write permission to anyone with the link so teammates can input data
 */
export async function makeSpreadsheetPubliclyEditable(
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'anyone',
        }),
      }
    );

    return res.ok;
  } catch (err) {
    console.warn('Failed to set Drive permissions:', err);
    return false;
  }
}

/**
 * Grants direct Google Drive editor permission to a specific administrator email
 */
export async function grantDrivePermissionToEmail(
  accessToken: string,
  spreadsheetId: string,
  email: string,
  role: 'writer' | 'commenter' | 'reader' = 'writer'
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          type: 'user',
          emailAddress: email.trim(),
        }),
      }
    );

    return res.ok;
  } catch (err) {
    console.warn(`Failed to invite admin ${email}:`, err);
    return false;
  }
}

/**
 * Ensures that all required tabs exist in the spreadsheet and have sufficient columns and rows.
 */
/**
 * Ensures that all required tabs exist in the spreadsheet and have sufficient columns and rows.
 * Returns a map of sheet title to sheetId for subsequent styling and formatting.
 */
export async function ensureSheetsStructure(
  accessToken: string,
  spreadsheetId: string
): Promise<Record<string, number>> {
  const sheetMap: Record<string, number> = {};
  try {
    const metaRes = await fetch(
      `${SHEETS_BASE_URL}/${spreadsheetId}?fields=sheets(properties(sheetId,title,gridProperties))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metaRes.ok) {
      return sheetMap;
    }

    const metaData = await metaRes.json();
    const existingSheets: Array<{
      properties: {
        sheetId: number;
        title: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }> = metaData.sheets || [];

    for (const s of existingSheets) {
      sheetMap[s.properties.title] = s.properties.sheetId;
    }

    const requiredTitles = [
      '타자_세이버메트릭스',
      '투수_세이버메트릭스',
      '경기기록_로그',
      '최신경기_상세',
    ];

    const requests: any[] = [];

    for (const title of requiredTitles) {
      const existing = existingSheets.find((s) => s.properties.title === title);
      if (!existing) {
        requests.push({
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount: 1000,
                columnCount: 50,
                frozenRowCount: 1,
              },
            },
          },
        });
      } else {
        const currentCols = existing.properties.gridProperties?.columnCount ?? 26;
        const currentRows = existing.properties.gridProperties?.rowCount ?? 100;
        if (currentCols < 50 || currentRows < 500) {
          requests.push({
            updateSheetProperties: {
              properties: {
                sheetId: existing.properties.sheetId,
                gridProperties: {
                  columnCount: Math.max(currentCols, 50),
                  rowCount: Math.max(currentRows, 1000),
                },
              },
              fields: 'gridProperties.columnCount,gridProperties.rowCount',
            },
          });
        }
      }
    }

    if (requests.length > 0) {
      const batchRes = await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        if (Array.isArray(batchData.replies)) {
          for (const rep of batchData.replies) {
            if (rep?.addSheet?.properties) {
              sheetMap[rep.addSheet.properties.title] = rep.addSheet.properties.sheetId;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('ensureSheetsStructure warning:', err);
  }
  return sheetMap;
}

/**
 * Applies visual styling and formatting to the Google Spreadsheet:
 * - Professional header styles (Navy background, bold white text, middle alignment)
 * - Highlights for key sabermetric stats (OPS, wOBA, ERA, WHIP)
 * - Auto-filter (setBasicFilter) on headers for direct sorting in Google Sheets
 * - Generous column widths (especially player nicknames at 180px) to prevent truncation
 * - Text wrapping (WRAP) on nickname and notes
 */
async function formatAndDecorateSheets(
  accessToken: string,
  spreadsheetId: string,
  sheetMap: Record<string, number>,
  batterCount: number,
  pitcherCount: number,
  gameCount: number
): Promise<void> {
  const requests: any[] = [];

  const batterSheetId = sheetMap['타자_세이버메트릭스'];
  const pitcherSheetId = sheetMap['투수_세이버메트릭스'];
  const gameSheetId = sheetMap['경기기록_로그'];

  // 1. Decorate Batter Sabermetrics Tab
  if (batterSheetId !== undefined) {
    // Header Row Style: Navy #1E293B, White bold text, centered
    requests.push({
      repeatCell: {
        range: {
          sheetId: batterSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 27,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.118, green: 0.161, blue: 0.231 },
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Highlight key sabermetric stats (AVG, OBP, SLG, OPS: cols 17-21)
    requests.push({
      repeatCell: {
        range: {
          sheetId: batterSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 17,
          endColumnIndex: 21,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.26, green: 0.15, blue: 0.05 },
            textFormat: {
              foregroundColor: { red: 1.0, green: 0.75, blue: 0.35 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Column Widths: 순위 (55px), 선수 닉네임 (180px - 긴 이름 짤림 방지!), 상태 (130px)
    requests.push(
      {
        updateDimensionProperties: {
          range: {
            sheetId: batterSheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 55 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: batterSheetId,
            dimension: 'COLUMNS',
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 180 }, // Wide width to prevent long nickname truncation
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: batterSheetId,
            dimension: 'COLUMNS',
            startIndex: 2,
            endIndex: 3,
          },
          properties: { pixelSize: 130 },
          fields: 'pixelSize',
        },
      }
    );

    // Text wrap on player nicknames and status notes
    requests.push({
      repeatCell: {
        range: {
          sheetId: batterSheetId,
          startRowIndex: 1,
          endRowIndex: Math.max(batterCount + 5, 20),
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat.wrapStrategy',
      },
    });

    // Auto-filter for sorting directly inside Google Sheets
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: batterSheetId,
            startRowIndex: 0,
            endRowIndex: Math.max(batterCount + 1, 2),
            startColumnIndex: 0,
            endColumnIndex: 27,
          },
        },
      },
    });
  }

  // 2. Decorate Pitcher Sabermetrics Tab
  if (pitcherSheetId !== undefined) {
    // Header Row Style: Navy #1E293B
    requests.push({
      repeatCell: {
        range: {
          sheetId: pitcherSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 24,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.118, green: 0.161, blue: 0.231 },
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Pitching Core highlight (ERA, WHIP, FIP: cols 16-19)
    requests.push({
      repeatCell: {
        range: {
          sheetId: pitcherSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 16,
          endColumnIndex: 19,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.18, blue: 0.28 },
            textFormat: {
              foregroundColor: { red: 0.4, green: 0.85, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Column Widths: 순위 (55px), 투수 닉네임 (180px - 긴 이름 짤림 방지!), 상태 (130px)
    requests.push(
      {
        updateDimensionProperties: {
          range: {
            sheetId: pitcherSheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 1,
          },
          properties: { pixelSize: 55 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: pitcherSheetId,
            dimension: 'COLUMNS',
            startIndex: 1,
            endIndex: 2,
          },
          properties: { pixelSize: 180 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: pitcherSheetId,
            dimension: 'COLUMNS',
            startIndex: 2,
            endIndex: 3,
          },
          properties: { pixelSize: 130 },
          fields: 'pixelSize',
        },
      }
    );

    // Text wrap on nickname and status
    requests.push({
      repeatCell: {
        range: {
          sheetId: pitcherSheetId,
          startRowIndex: 1,
          endRowIndex: Math.max(pitcherCount + 5, 20),
          startColumnIndex: 1,
          endColumnIndex: 3,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
          },
        },
        fields: 'userEnteredFormat.wrapStrategy',
      },
    });

    // Auto-filter
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: pitcherSheetId,
            startRowIndex: 0,
            endRowIndex: Math.max(pitcherCount + 1, 2),
            startColumnIndex: 0,
            endColumnIndex: 24,
          },
        },
      },
    });
  }

  // 3. Decorate Game Logs Tab
  if (gameSheetId !== undefined) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: gameSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.118, green: 0.161, blue: 0.231 },
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Set widths & text wrap for detailed game logs
    requests.push(
      {
        updateDimensionProperties: {
          range: {
            sheetId: gameSheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 6,
          },
          properties: { pixelSize: 95 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: gameSheetId,
            dimension: 'COLUMNS',
            startIndex: 6,
            endIndex: 7,
          },
          properties: { pixelSize: 260 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: gameSheetId,
            dimension: 'COLUMNS',
            startIndex: 7,
            endIndex: 8,
          },
          properties: { pixelSize: 320 },
          fields: 'pixelSize',
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: gameSheetId,
            dimension: 'COLUMNS',
            startIndex: 8,
            endIndex: 9,
          },
          properties: { pixelSize: 380 },
          fields: 'pixelSize',
        },
      },
      {
        repeatCell: {
          range: {
            sheetId: gameSheetId,
            startRowIndex: 1,
            endRowIndex: Math.max(gameCount + 5, 20),
            startColumnIndex: 6,
            endColumnIndex: 9,
          },
          cell: {
            userEnteredFormat: {
              wrapStrategy: 'WRAP',
            },
          },
          fields: 'userEnteredFormat.wrapStrategy',
        },
      }
    );

    // Auto-filter
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: gameSheetId,
            startRowIndex: 0,
            endRowIndex: Math.max(gameCount + 1, 2),
            startColumnIndex: 0,
            endColumnIndex: 9,
          },
        },
      },
    });
  }

  if (requests.length > 0) {
    try {
      await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    } catch (styleErr) {
      console.warn('Sheet formatting notice:', styleErr);
    }
  }
}

/**
 * Syncs all game records and cumulative Sabermetrics tables into the Google Spreadsheet
 */
export async function syncToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  batters: BatterCumulativeStat[],
  pitchers: PitcherCumulativeStat[],
  games: GameRecord[]
): Promise<void> {
  // 1. Ensure required tabs exist and have at least 50 columns to fit all sabermetrics
  const sheetMap = await ensureSheetsStructure(accessToken, spreadsheetId);

  // Helper for status label
  const getStatusLabel = (status?: string, info?: any) => {
    if (status === 'retired') return `은퇴 🎖️${info?.note ? ` (${info.note})` : ''}`;
    if (status === 'transferred') return `이적 ✈️${info?.destination ? ` [${info.destination}]` : ''}${info?.note ? ` (${info.note})` : ''}`;
    if (status === 'inactive') return `휴식 ⏳${info?.note ? ` (${info.note})` : ''}`;
    return '현역';
  };

  // Sort Batters: Status priority (현역 > 은퇴 > 이적 > 비활동), then OPS desc (좋은 스탯 높게), then Name ABC (가나다)
  const sortedBatters = [...batters].sort((a, b) => {
    const statusA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
    const statusB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    if (b.OPS !== a.OPS) return b.OPS - a.OPS;
    if (b.H !== a.H) return b.H - a.H;
    return a.name.localeCompare(b.name, 'ko');
  });

  // 1. Prepare Batter Sabermetrics Data
  const batterHeaders = [
    '순위',
    '선수 닉네임',
    '상태',
    '경기수(G)',
    '타석(PA)',
    '타수(AB)',
    '득점(R)',
    '안타(H)',
    '2루타(2B)',
    '3루타(3B)',
    '홈런(HR)',
    '루타(TB)',
    '타점(RBI)',
    '볼넷(BB)',
    '사구(HBP)',
    '삼진(SO)',
    '도루(SB)',
    '타율(AVG)',
    '출루율(OBP)',
    '장타율(SLG)',
    'OPS',
    '순장타율(ISO)',
    'BABIP',
    'wOBA',
    '볼넷율(BB%)',
    '삼진율(K%)',
    'BB/K',
  ];

  const batterRows = sortedBatters.map((b, idx) => [
    idx + 1,
    b.name,
    getStatusLabel(b.status, b.statusInfo),
    b.games,
    b.PA,
    b.AB,
    b.R,
    b.H,
    b.doubles,
    b.triples,
    b.HR,
    b.TB,
    b.RBI,
    b.BB,
    b.HBP,
    b.SO,
    b.SB,
    formatAvg(b.AVG),
    formatAvg(b.OBP),
    formatAvg(b.SLG),
    formatAvg(b.OPS),
    formatAvg(b.ISO),
    formatAvg(b.BABIP),
    formatAvg(b.wOBA),
    `${formatRate(b.BB_rate, 1)}%`,
    `${formatRate(b.K_rate, 1)}%`,
    formatRate(b.BB_K, 2),
  ]);

  // 2. Prepare Pitcher Sabermetrics Data
  const pitcherHeaders = [
    '순위',
    '투수 닉네임',
    '상태',
    '등판(G)',
    '선발(GS)',
    '승(W)',
    '패(L)',
    '홀드(HLD)',
    '세이브(SV)',
    '이닝(IP)',
    '실점(R)',
    '자책점(ER)',
    '피안타(H)',
    '피홈런(HR)',
    '사사구(BB)',
    '탈삼진(SO)',
    '평균자책점(ERA)',
    'WHIP',
    'FIP(수비무관)',
    'K/9',
    'BB/9',
    'K/BB',
    'H/9',
    'HR/9',
  ];

  // Sort Pitchers: Status priority (현역 > 은퇴 > 이적 > 비활동), then Wins desc, then ERA asc (좋은 스탯 낮게), then WHIP asc, then Name ABC
  const sortedPitchers = [...pitchers].sort((a, b) => {
    const statusA = STATUS_PRIORITY[a.status || 'active'] ?? 99;
    const statusB = STATUS_PRIORITY[b.status || 'active'] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.ERA !== b.ERA) return a.ERA - b.ERA;
    if (a.WHIP !== b.WHIP) return a.WHIP - b.WHIP;
    return a.name.localeCompare(b.name, 'ko');
  });

  const pitcherRows = sortedPitchers.map((p, idx) => [
    idx + 1,
    p.name,
    getStatusLabel(p.status, p.statusInfo),
    p.games,
    p.starts,
    p.wins,
    p.losses,
    p.holds,
    p.saves,
    outsToInningsText(p.totalOuts),
    p.runs,
    p.ER,
    p.hits,
    p.HR,
    p.BB,
    p.SO,
    formatRate(p.ERA, 2),
    formatRate(p.WHIP, 2),
    formatRate(p.FIP, 2),
    formatRate(p.K9, 1),
    formatRate(p.BB9, 1),
    formatRate(p.K_BB, 2),
    formatRate(p.H9, 1),
    formatRate(p.HR9, 1),
  ]);

  // 3. Prepare Game Logs Data
  const gameHeaders = [
    '등록일시',
    '경기일시',
    '상대팀',
    '홈/원정',
    '스코어',
    '결과',
    '라인스코어(R-H-E-B)',
    '주요 투수 결과',
    '선발 라인업(1~9번)',
  ];

  const gameRows = games.map((g) => {
    const away = g.lineScore?.away;
    const home = g.lineScore?.home;
    const lineSummary = `원정 ${away?.R || 0}점(${away?.H || 0}H ${away?.E || 0}E ${away?.B || 0}B) vs 홈 ${home?.R || 0}점(${home?.H || 0}H ${home?.E || 0}E ${home?.B || 0}B)`;
    const pitcherSummary = g.pitchers
      .map(
        (p) =>
          `${p.role} ${p.name} (${p.inningsText}, ${p.ER}자책, ${p.SO}K${p.decision ? ` [${p.decision}]` : ''})`
      )
      .join(' / ');
    const lineupSummary = g.batters
      .map(
        (b) =>
          `${b.order}번 ${b.name}${b.position ? `(${b.position})` : ''}: ${b.H}안타 ${b.RBI}타점`
      )
      .join(' | ');

    return [
      g.createdAt.split('T')[0],
      g.header.date,
      g.header.opponent,
      g.header.isHome ? '홈' : '원정',
      `${g.header.ourScore} : ${g.header.oppScore}`,
      g.header.outcome,
      lineSummary,
      pitcherSummary,
      lineupSummary,
    ];
  });

  // 4. Latest Match Boxscore Detail
  const latestGame = games[0];
  const latestRows: any[][] = [];
  if (latestGame) {
    latestRows.push([`[최신 경기 박스스코어] ${latestGame.header.date} vs ${latestGame.header.opponent} (${latestGame.header.isHome ? '홈' : '원정'}) - 결과: ${latestGame.header.outcome} (${latestGame.header.ourScore}:${latestGame.header.oppScore})`]);
    latestRows.push([]);
    latestRows.push(['-- 이닝 스코어보드 --']);
    latestRows.push(['팀', ...latestGame.lineScore.headers]);
    latestRows.push([
      latestGame.lineScore.away.name,
      ...latestGame.lineScore.away.innings,
      latestGame.lineScore.away.H,
      latestGame.lineScore.away.E,
      latestGame.lineScore.away.B,
    ]);
    latestRows.push([
      latestGame.lineScore.home.name,
      ...latestGame.lineScore.home.innings,
      latestGame.lineScore.home.H,
      latestGame.lineScore.home.E,
      latestGame.lineScore.home.B,
    ]);
    latestRows.push([]);
    latestRows.push(['-- 타자 기록 --']);
    latestRows.push(['타순', '닉네임', '포지션', '타수', '안타', '2루타', '3루타', '홈런', '타점', '득점', '볼넷', '삼진', '도루']);
    for (const b of latestGame.batters) {
      latestRows.push([b.order, b.name, b.position || '-', b.AB, b.H, b.doubles, b.triples, b.HR, b.RBI, b.R, b.BB, b.SO, b.SB]);
    }
    latestRows.push([]);
    latestRows.push(['-- 투수 기록 --']);
    latestRows.push(['구분', '닉네임', '이닝', '실점', '자책', '피안타', '피홈런', '사사구', '탈삼진', '결과']);
    for (const p of latestGame.pitchers) {
      latestRows.push([p.role, p.name, p.inningsText, p.runs, p.ER, p.hits, p.HR, p.BB, p.SO, p.decision || '-']);
    }
  }

  // 2. Clear previous sheet data so removed or reordered records don't leave residue
  try {
    await fetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          '타자_세이버메트릭스!A1:AZ1000',
          '투수_세이버메트릭스!A1:AZ1000',
          '경기기록_로그!A1:AZ1000',
          '최신경기_상세!A1:AZ1000',
        ],
      }),
    });
  } catch (clearErr) {
    console.warn('Batch clear warning:', clearErr);
  }

  // 3. Write data starting at A1 (auto-expands to match content dimensions without column constraint errors)
  const updateBatch = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: '타자_세이버메트릭스!A1',
        values: [batterHeaders, ...batterRows],
      },
      {
        range: '투수_세이버메트릭스!A1',
        values: [pitcherHeaders, ...pitcherRows],
      },
      {
        range: '경기기록_로그!A1',
        values: [gameHeaders, ...gameRows],
      },
      ...(latestRows.length > 0
        ? [
            {
              range: '최신경기_상세!A1',
              values: latestRows,
            },
          ]
        : []),
    ],
  };

  const response = await fetch(
    `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBatch),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`구글 스프레드시트 동기화 실패: ${errorText}`);
  }

  // 4. Beautify sheet: Header styling, core sabermetric highlights, generous column widths (180px for nicknames) & auto-filters
  await formatAndDecorateSheets(
    accessToken,
    spreadsheetId,
    sheetMap,
    sortedBatters.length,
    sortedPitchers.length,
    gameRows.length
  );
}
