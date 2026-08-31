import { Context, h, Schema, sleep, Session } from 'koishi'
import { } from '@koishijs/canvas'
import * as path from 'path';
import * as fs from 'fs';

export const name = 'cchess'

export const usage = `## 使用

\`cchess.加入\` 入座，\`cchess.开始.人人对战\` 或 \`cchess.开始.人机对战\` 开局。着法可直接发送，如炮二平五或 \`b2e2\`。

## 指令

| 指令 | 说明 |
| --- | --- |
| \`cchess.加入 [红/黑]\` | 入座 |
| \`cchess.退出\` | 开局前离席 |
| \`cchess.开始.人人对战\` | 人人对战 |
| \`cchess.开始.人机对战\` | 人机对战（皮卡鱼） |
| \`cchess.移动 <着法>\` | 落子 |
| \`cchess.悔棋.请求\` | 悔棋 |
| \`cchess.认输\` | 认输 |
| \`cchess.结束\` | 强制清盘 |
| \`cchess.编辑棋盘.导入 <FEN>\` | 导入局面 |
| \`cchess.编辑棋盘.导出\` | 导出局面 |
| \`cchess.排行榜.总胜场 [人数]\` | 胜场榜 |
| \`cchess.查询玩家记录 [@某人]\` | 查看战绩 |`

export const inject = ['database', 'puppeteer', 'canvas']

export interface Config {
  boardSkin: string
  pieceSkin: string
  defaultEngineThinkingDepth: number
  allowFreePieceMovementInHumanMachineMode: boolean
  defaultMaxLeaderboardEntries: number
  retractDelay: number
  isChessImageWithOutlineEnabled: boolean
  imgScale: number
  imageType: "png" | "jpeg" | "webp"
}

const pieceSkins: string[] = ["棋弈无限图形棋子", "云库木制棋子", "刘炳森红黑牛角隶书棋子", "木制棋子", "本纹隶书棋子", "银灰将军体棋子", "棋弈无限红绿正棋子", "棋弈无限红绿棋子", "棋天大圣棋子", "棋者象棋棋子", "楷书玉石棋子", "水墨青瓷棋子", "牛皮纸华康金文棋子", "皮卡鱼棋子", "红蓝祥隶棋子", "红黑精典无阴影棋子", "红黑精典棋子", "行书玉石棋子", "象甲棋子", "金属棋子篆体棋子", "镌刻华彩棋子", "鹏飞红黑棋子", "鹏飞经典棋子", "鹏飞绿龙棋子", "龙腾四海棋子"];
const boardSkins: string[] = ["棋弈无限红绿棋盘", "一鸣惊人棋盘", "三星堆棋盘", "云库木制棋盘", "云心鹤眼棋盘", "兰亭集序无字棋盘", "兰亭集序棋盘", "凤舞九天棋盘", "卯兔添福棋盘", "叱咤风云棋盘", "君临天下棋盘", "壁画古梦棋盘", "大闹天宫棋盘", "天山共色棋盘", "女神之约棋盘", "小吕飞刀棋盘", "山海绘卷棋盘", "护眼绿棋盘", "星河璀璨棋盘", "木制棋盘", "本纹隶书白棋盘", "本纹隶书黑棋盘", "桃花源记棋盘", "棋天大圣棋盘", "棋天无大圣棋盘", "武侠江湖棋盘", "水墨青瓷棋盘", "清悠茶道棋盘", "游园惊梦棋盘", "牛转乾坤棋盘", "玉石太极棋盘", "皓月无痕棋盘", "皮卡鱼棋盘", "盲棋神迹棋盘", "空城计棋盘", "竹波烟雨棋盘", "经典木棋盘棋盘", "绿色棋盘", "象甲2023棋盘", "象甲征程棋盘", "象甲重燃棋盘", "金牛降世棋盘", "金虎贺岁棋盘", "金虎贺岁（王天一签名版）棋盘", "鎏金岁月棋盘", "霸王别姬棋盘", "鸿门宴棋盘", "鹏飞红黑棋盘", "鹏飞经典棋盘", "鹏飞绿龙棋盘", "龙腾天坛棋盘"];

export const Config: Schema<Config> = Schema.object({
  boardSkin: Schema.union(boardSkins).default('象甲2023棋盘').description(`棋盘皮肤。`),
  pieceSkin: Schema.union(pieceSkins).default('象甲棋子').description(`棋子皮肤。`),
  allowFreePieceMovementInHumanMachineMode: Schema.boolean().default(false).description(`是否允许在人机模式下所有用户都可以自由移动棋子，开启后可以不需要加入游戏直接开始玩人机模式。`),
  defaultEngineThinkingDepth: Schema.number().min(0).max(100).default(10).description(`默认引擎思考深度，越高 AI 棋力越强，耗时也越长（小于 1 时按 1 计算）。由于 Nodejs 不支持 SIMD，所以不建议设置过高。`),
  defaultMaxLeaderboardEntries: Schema.number().min(0).default(10).description(`显示排行榜时默认的最大人数。`),
  retractDelay: Schema.number().min(0).default(0).description(`自动撤回等待的时间，单位是秒。值为 0 时不启用自动撤回功能。`),
  imgScale: Schema.number().min(1).default(1).description(`图片分辨率倍率。`),
  imageType: Schema.union(['png', 'jpeg', 'webp']).default('png').description(`发送的图片类型。`),
  isChessImageWithOutlineEnabled: Schema.boolean().default(true).description(`是否为象棋图片添加辅助外框，关闭后可以显著提升图片速度，但无辅助外框，玩起来可能会比较累。`),
}) as any

// --- 消息排版 ---

const RULE = '━━━━━━━━━━━━━━'

const SIDE_ICONS: Record<string, string> = { 红方: '🔴', 黑方: '⚫' }

const MEDALS = ['🥇', '🥈', '🥉']

/** 为阵营名称附上颜色标识，如「🔴 红方」。 */
function withSideIcon(side: string): string {
  return side ? `${SIDE_ICONS[side] ?? '⚪'} ${side}` : '未知'
}

/** 「键 · 值」形式的信息条目。 */
function field(key: string, value: string | number): string {
  return `${key} · ${value}`
}

type Line = string | false | null | undefined

interface PanelOptions {
  /** 标题前的图标。 */
  icon?: string
  /** 消息标题。 */
  title: string
  /** 需要提醒的用户名。 */
  at?: string
  /** 正文，假值会被自动忽略。 */
  body?: Line[]
  /** 底部提示，假值会被自动忽略。 */
  tips?: Line[]
  /** 附带的棋盘图片。 */
  image?: string
}

/** 保留空行，仅剔除 false / null / undefined 占位。 */
function isLine(line: Line): line is string {
  return typeof line === 'string'
}

/** 统一的消息排版：标题 · 分隔线 · 正文 · 提示 · 图片。 */
function panel(options: PanelOptions): string {
  const { icon = '♟️', title, at, body = [], tips = [], image } = options
  const lines: string[] = [`${icon} ${title}`, RULE]
  if (at) lines.push(`@${at}`)
  lines.push(...body.filter(isLine))
  const validTips = tips.filter(isLine).filter(Boolean)
  if (validTips.length) lines.push(RULE, ...validTips)
  if (image) lines.push(image)
  return lines.join('\n')
}

declare module 'koishi' {
  interface Tables {
    cchess_game_records: GameRecord
    cchess_gaming_player_records: GamingPlayer
    cchess_player_records: PlayerRecord
    monetary: Monetary
  }
}

interface Monetary {
  uid: number
  currency: string
  value: number
}

export interface GameRecord {
  id: number
  fen: string
  turn: string
  engine: null
  isDraw: boolean
  winSide: string
  startFen: string
  loseSide: string
  channelId: string
  board: string[][]
  originalState: any
  isStarted: boolean
  ponderHint: any[][]
  thinkingSide: string
  moveList: MoveData[]
  lastMove: number[][]
  isAnalyzing: boolean
  isFlipBoard: boolean
  currentMoveId: string
  moveTreePtr: MoveData
  thinkingDetail: any[]
  isHistoryMode: boolean
  isEngineReady: boolean
  isRegretRequest: boolean
  isEngineAnalyze: boolean
  isEnginePlayRed: boolean
  turnAfterLastEat: string
  isEnginePlayBlack: boolean
  movesAfterLastEat: MoveData[]
  boardAfterLastEat: string[][]
}

export interface GamingPlayer {
  id: number
  channelId: string
  userId: string
  username: string
  side: string
}

export interface PlayerRecord {
  id: number
  userId: string
  username: string
  win: number
  lose: number
}

interface MoveData {
  moveId: string;
  fen: string;
  side: string;
  moveCord: number[][];
  move: string;
  chnMoveName: string;
  next: null | MoveData;
}

interface MoveInfo {
  moveCord: number[][],
  moveString: string,
  figureMoveName: string
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('cchess')
  const engines: { [channelId: string]: any } = {};
  /** 正在初始化的引擎，避免同一频道重复创建实例。 */
  const enginePromises: { [channelId: string]: Promise<void> } = {};
  /** 正在结算的频道，避免同一频道内的落子相互覆盖。 */
  const busyChannels = new Set<string>();

  ctx.on('dispose', () => {
    const channelIds = Object.keys(engines);
    channelIds.forEach((channelId) => {
      if (engines[channelId]) {
        try {
          engines[channelId].send_command('quit');
        } catch (e) { }
        engines[channelId] = null;
      }
    });
  });

  // 棋盘绘制常量
  const CELL_WIDTH = 54 // 棋子宽度
  const ARROW_OFFSET = 33
  const BOARD_PADDING = 33 // 棋盘边距
  const PIECE_SIZE = 50 // 棋子显示大小
  const BOARD_WIDTH = 500
  const BOARD_HEIGHT = 550

  const scale = config.imgScale
  const isFlipBoard = false
  const imageMimeType = `image/${config.imageType}` as 'image/png'
  const engineSettings = {
    Threads: 1,
    Hash: 128,
    MultiPV: 1,
  }

  /** 引擎思考深度，至少为 1，否则引擎会无限思考下去。 */
  const thinkingDepth = Math.max(1, Math.round(config.defaultEngineThinkingDepth) || 1)
  /** 等待引擎给出结果的最长时间。 */
  const ENGINE_TIMEOUT = 120 * 1000

  const piecesImgResources = loadPiecesImageResources(config.pieceSkin);
  const outerFrameImg = fs.readFileSync(path.join(__dirname, 'assets', '棋盘皮肤', `外框.png`));
  const boardSkinImg = fs.readFileSync(path.join(__dirname, 'assets', '棋盘皮肤', `${config.boardSkin}.webp`));

  const possibleFigureNames = ["将", "士", "象", "车", "马", "炮", "卒", "帅", "仕", "相", "兵"];

  // 数据库定义
  ctx.model.extend('cchess_game_records', {
    id: 'unsigned',
    channelId: 'string',
    isStarted: 'boolean',
    isFlipBoard: 'boolean',
    isHistoryMode: 'boolean',
    turn: { type: 'string', initial: 'w' },
    moveList: { type: 'json', initial: [] },
    isDraw: { type: 'boolean', initial: false },
    winSide: { type: 'string', initial: '' },
    loseSide: { type: 'string', initial: '' },
    originalState: { type: 'json', initial: {} },
    thinkingDetail: { type: 'json', initial: [] },
    currentMoveId: { type: 'string', initial: '' },
    thinkingSide: { type: 'string', initial: 'w' },
    movesAfterLastEat: { type: 'json', initial: [] },
    isAnalyzing: { type: 'boolean', initial: false },
    turnAfterLastEat: { type: 'string', initial: 'w' },
    isEngineReady: { type: 'boolean', initial: false },
    isEnginePlayRed: { type: 'boolean', initial: false },
    isEngineAnalyze: { type: 'boolean', initial: false },
    isRegretRequest: { type: 'boolean', initial: false },
    lastMove: { type: 'json', initial: [[0, 0], [0, 0]] },
    isEnginePlayBlack: { type: 'boolean', initial: false },
    ponderHint: { type: 'json', initial: [[0, 0], [0, 0]] },
    fen: { type: 'string', initial: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w' },
    startFen: { type: 'string', initial: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w' },
    board: { type: 'json', initial: fenToBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w') },
    boardAfterLastEat: {
      type: 'json',
      initial: fenToBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w')
    },
    moveTreePtr: {
      type: 'json',
      initial: { moveId: '', fen: '', side: '', moveCord: [[0, 0], [0, 0]], move: '', chnMoveName: '', next: null }
    },
  }, {
    primary: 'id',
    autoInc: true,
  })

  ctx.model.extend('cchess_gaming_player_records', {
    id: 'unsigned',
    channelId: 'string',
    userId: 'string',
    username: 'string',
    side: 'string',
  }, {
    primary: 'id',
    autoInc: true,
  })

  ctx.model.extend('cchess_player_records', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
    win: 'unsigned',
    lose: 'unsigned',
  }, {
    primary: 'id',
    autoInc: true,
  })

  // 中间件：处理直接输入棋谱的情况
  ctx.middleware(async (session, next) => {
    const { channelId, content, userId, username } = session;
    // 先做零成本的文本判断，避免为每一条消息访问数据库
    if (!channelId || !content) return next();
    const moveOperation = content.trim();
    if (!isMoveString(moveOperation) && !isValidFigureMoveName(moveOperation)) return next();

    const [gameRecord] = await ctx.database.get('cchess_game_records', { channelId });
    if (!gameRecord?.isStarted) return next();

    let playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });

    // 人机对战中，未加入的玩家自动补位到人类一方
    if (playerRecord.length === 0 && !config.allowFreePieceMovementInHumanMachineMode) {
      const humanSide = gameRecord.isEnginePlayRed ? '黑方' : gameRecord.isEnginePlayBlack ? '红方' : '';
      if (!humanSide) return next();
      await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: humanSide });
      playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
    }

    if (playerRecord.length !== 0 && playerRecord[0].side !== convertTurnToString(gameRecord.turn)) {
      return next();
    }

    await session.execute(`cchess.移动 ${moveOperation}`);
  });

  ctx.command('cchess', '中国象棋游戏指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess -h`)
    })

  ctx.command('cchess.加入 [choice:string]', '加入游戏并选择红黑方')
    .action(async ({ session }, choice) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋局已经开战',
          at: username,
          body: ['本局正在进行，无法中途加入。'],
          tips: ['本局结束后可再加入。'],
          image: await renderBoard(channelId),
        }));
      }

      // 在后台预热引擎，避免首次落子时长时间等待
      void checkEngine(channelId);

      if (choice?.includes('红') && choice.includes('黑')) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '一次只能选一方',
          at: username,
          body: ['请只选择红方或黑方。'],
          tips: ['「cchess.加入 红」执红先行', '「cchess.加入 黑」执黑应招'],
        }));
      }
      if (choice?.includes('红')) choice = '红方';
      else if (choice?.includes('黑')) choice = '黑方';
      else choice = Math.random() < 0.5 ? '红方' : '黑方';

      const selfRecords = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      const allRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = allRecords.length;
      if (selfRecords.length === 0) {
        await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: choice });
        return await sendMessage(session, panel({
          icon: '✅',
          title: '入座成功',
          at: username,
          body: [field('阵营', withSideIcon(choice)), field('当前人数', `${playersNum + 1} 人`)],
          tips: ['再次发送「cchess.加入 红 / 黑」即可换边', '人齐后发送「cchess.开始.人人对战」开局'],
        }));
      } else {
        await ctx.database.set('cchess_gaming_player_records', { channelId, userId }, { side: choice });
        return await sendMessage(session, panel({
          icon: '✅',
          title: '换边成功',
          at: username,
          body: [field('新的阵营', withSideIcon(choice)), field('当前人数', `${playersNum} 人`)],
        }));
      }
    })

  ctx.command('cchess.退出', '退出游戏')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋局已经开战',
          at: username,
          body: ['对局进行中，无法退出。'],
          tips: ['可发送「cchess.认输」结束本局'],
        }));
      }
      const selfRecords = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      const allRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = allRecords.length;
      if (selfRecords.length === 0) {
        return await sendMessage(session, notJoinedPanel(username));
      } else {
        await ctx.database.remove('cchess_gaming_player_records', { channelId, userId });
        return await sendMessage(session, panel({
          icon: '✅',
          title: '已离席',
          at: username,
          body: ['已退出本局。', field('剩余人数', `${playersNum - 1} 人`)],
        }));
      }
    })

  ctx.command('cchess.开始', '开始游戏指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.开始 -h`)
    })

  ctx.command('cchess.开始.人人对战', '开始人人对战')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)

      const gameRecord = await getGameRecord(channelId);

      if (gameRecord.isStarted) {
        return await sendMessage(session, alreadyStartedPanel(username));
      }
      // 引擎用于判定绝杀，在后台预热即可
      void checkEngine(channelId);
      const playerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = playerRecords.length;
      let redPlayers = playerRecords.filter((player) => player.side === '红方');
      let blackPlayers = playerRecords.filter((player) => player.side === '黑方');
      let assignNotice = '';
      if (playersNum < 2) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋差一手，人差一位',
          at: username,
          body: ['人人对战至少需要 2 位棋手。', field('当前人数', `${playersNum} 人`)],
          tips: ['邀请好友发送「cchess.加入」一同入座'],
        }));
      }

      if (redPlayers.length !== 1 || blackPlayers.length !== 1) {
        const randomPlayer = playerRecords[Math.floor(Math.random() * playerRecords.length)];
        randomPlayer.side = redPlayers.length < 1 ? '红方' : '黑方';
        assignNotice = `🎲 @${randomPlayer.username} 被随机分配至 ${withSideIcon(randomPlayer.side)}`;
        await ctx.database.set('cchess_gaming_player_records', {
          channelId,
          userId: randomPlayer.userId
        }, { side: randomPlayer.side });
        redPlayers = playerRecords.filter((player) => player.side === '红方');
        blackPlayers = playerRecords.filter((player) => player.side === '黑方');
      }

      await ctx.database.set('cchess_game_records', { channelId }, { isStarted: true })
      const sideString = convertTurnToString(gameRecord.turn);
      return await sendMessage(session, panel({
        icon: '✅',
        title: '楚河汉界，对局开始',
        body: [
          ...(assignNotice ? [assignNotice, ''] : []),
          `${withSideIcon('红方')}（${redPlayers.length}）`,
          ...redPlayers.map((player) => `　@${player.username}`),
          '',
          `${withSideIcon('黑方')}（${blackPlayers.length}）`,
          ...blackPlayers.map((player) => `　@${player.username}`),
          '',
          field('先手', withSideIcon(sideString)),
        ],
        tips: ['直接发送着法即可落子，如「炮二平五」或「b2e2」'],
        image: await renderBoard(channelId),
      }));
    })

  ctx.command('cchess.开始.人机对战', '开始人机对战')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);

      if (gameRecord.isStarted) {
        return await sendMessage(session, alreadyStartedPanel(username));
      }

      const playerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = playerRecords.length;
      const redPlayers = playerRecords.filter((player) => player.side === '红方');
      const blackPlayers = playerRecords.filter((player) => player.side === '黑方');
      if (playersNum < 1 && !config.allowFreePieceMovementInHumanMachineMode) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '尚无棋手入座',
          at: username,
          body: ['人机对战至少需要 1 位棋手。'],
          tips: ['发送「cchess.加入」即可入座挑战皮卡鱼'],
        }));
      }

      if (!await checkEngine(channelId)) {
        return await sendMessage(session, engineUnavailablePanel(username));
      }

      // 决定人类阵营：人少的一方并入人多的一方，势均力敌则听天由命
      let humanSide: string;
      if (playersNum === 1) {
        humanSide = playerRecords[0].side === '红方' ? '红方' : '黑方';
      } else if (redPlayers.length !== blackPlayers.length) {
        humanSide = redPlayers.length > blackPlayers.length ? '红方' : '黑方';
      } else {
        humanSide = Math.random() < 0.5 ? '红方' : '黑方';
      }
      const engineSide = humanSide === '红方' ? '黑方' : '红方';

      for (const player of playerRecords) {
        if (player.side === humanSide) continue;
        await ctx.database.set('cchess_gaming_player_records', { channelId, userId: player.userId }, { side: humanSide });
      }
      await ctx.database.set('cchess_game_records', { channelId }, {
        isStarted: true,
        isEnginePlayRed: engineSide === '红方',
        isEnginePlayBlack: engineSide === '黑方',
      })

      const sideString = convertTurnToString(gameRecord.turn);
      // 引擎执先手时，先替它落下第一子
      if (engineSide === sideString) await requestEngineMove(channelId);

      return await sendMessage(session, panel({
        icon: '✅',
        title: '人机对局开始',
        body: [
          field('棋　手', withSideIcon(humanSide)),
          field('皮卡鱼', withSideIcon(engineSide)),
          field('先　手', withSideIcon(sideString)),
          field('思考深度', `${thinkingDepth} 层`),
        ],
        tips: ['直接发送着法即可落子，如「炮二平五」或「b2e2」'],
        image: await renderBoard(channelId),
      }));
    })

  ctx.command('cchess.结束', '强制结束游戏')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);

      if (!gameRecord.isStarted) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋盘尚且空空',
          at: username,
          body: ['当前没有进行中的对局，无需收拾残局。'],
          tips: ['发送「cchess.加入」入座，再开一局'],
        }));
      }
      await endGame(channelId);
      return await sendMessage(session, panel({
        icon: '✅',
        title: '对局已强制结束',
        at: username,
        body: ['棋盘已收，胜负不计。'],
        tips: ['发送「cchess.加入」重整旗鼓'],
      }));
    })

  ctx.command('cchess.移动 <moveOperation:text>', '进行移动操作')
    .action(async ({ session }, moveOperation) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      moveOperation = moveOperation?.trim()
      if (!moveOperation || (!isMoveString(moveOperation) && !isValidFigureMoveName(moveOperation))) {
        return await sendMessage(session, invalidMovePanel(username, '看不懂这一着'));
      }
      if (busyChannels.has(channelId)) {
        return await sendMessage(session, panel({
          icon: '⏳',
          title: '棋局正在推演',
          at: username,
          body: ['上一着棋尚未结算，请稍候片刻。'],
        }));
      }

      busyChannels.add(channelId);
      try {
        const gameRecord = await getGameRecord(channelId);
        if (!gameRecord.isStarted) {
          return await sendMessage(session, notStartedPanel(username));
        }
        if (gameRecord.isRegretRequest) {
          return await sendMessage(session, panel({
            icon: '⏳',
            title: '悔棋请求待决',
            at: username,
            body: ['对方的悔棋请求尚未答复，棋局暂歇。'],
            tips: ['发送「cchess.悔棋.同意」或「cchess.悔棋.拒绝」'],
          }));
        }

        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);
        let playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
        if (playerRecord.length === 0) {
          const humanSide = gameRecord.isEnginePlayRed ? '黑方' : gameRecord.isEnginePlayBlack ? '红方' : '';
          if (!config.allowFreePieceMovementInHumanMachineMode || !humanSide) {
            return await sendMessage(session, notJoinedPanel(username));
          }
          await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: humanSide })
          playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
        }

        if (playerRecord[0].side !== sideString) {
          return await sendMessage(session, notYourTurnPanel(username, playerRecord[0].side, sideString));
        }

        const board = gameRecord.board;
        let selectedPos: number[];
        let newPos: number[];

        // 处理中文纵线着法
        if (possibleFigureNames.some(figureName => moveOperation.includes(figureName))) {
          const figureName = getFigureNameFromMoveOperation(moveOperation);
          const englishLetter = getEnglishLetterFromFigureName(figureName);
          const processedLetter = processEnglishLetter(englishLetter, turn);
          const letterPositions = findLetterPositions(board, processedLetter);
          const moveInfoList: MoveInfo[] = [];
          for (const pos of letterPositions) {
            const piece = processedLetter;
            const side = getSide(piece);
            const type = getType(piece);
            const moveMap = getValidMoveMap(board, type, side, [pos[1], pos[0]]);
            const legalPositions = findLegalMovePositions(moveMap);
            const fen = getFen(board, side);
            for (const toPos of legalPositions) {
              const moveString = moveToMoveString([[pos[1], pos[0]], [toPos[1], toPos[0]]]);
              const figureMoveName = getFigureMoveName(fen, moveString);
              moveInfoList.push({
                moveCord: [[pos[1], pos[0]], [toPos[1], toPos[0]]],
                moveString: moveString,
                figureMoveName: figureMoveName
              });
            }
          }
          const matchedMoveInfo = findMoveInfo(moveInfoList, moveOperation);
          if (!matchedMoveInfo) {
            return await sendMessage(session, invalidMovePanel(username, `${sideString}走不出这一着`));
          }
          [selectedPos, newPos] = matchedMoveInfo.moveCord;
        } else {
          // 处理字母坐标着法
          [selectedPos, newPos] = moveStringToPos(moveOperation);
        }

        const [newCol, newRow] = newPos
        const piece = getPiece(board, selectedPos);
        if (!piece || piece === 'invalid') {
          return await sendMessage(session, invalidMovePanel(username, '起点空无一子'));
        }
        const side = getSide(piece);
        const type = getType(piece);
        if (side !== turn) {
          return await sendMessage(session, notYourTurnPanel(username, convertTurnToString(side), sideString));
        }
        const moveMap = getValidMoveMap(board, type, side, selectedPos);
        if (moveMap[newRow][newCol] !== 'go' && moveMap[newRow][newCol] !== 'eat') {
          return await sendMessage(session, invalidMovePanel(username, '此着不合棋规'));
        }

        const isEngineGame = gameRecord.isEnginePlayRed || gameRecord.isEnginePlayBlack;
        const movesBefore = gameRecord.moveList.length;
        await makeMove(channelId, selectedPos, newPos);

        // 已经吃将分出胜负时，无需再劳烦引擎
        let record = await getGameRecord(channelId);
        if (record.winSide === '') {
          // 人机模式下这一步即引擎的应招；人人模式仅借引擎判断对方是否已无着可走，一层足矣
          await requestEngineMove(channelId, isEngineGame ? thinkingDepth : 1);
          record = await getGameRecord(channelId);
        }
        if (record.winSide !== '') {
          return await sendMessage(session, await settleVictory(channelId, record.winSide, record.loseSide, '绝杀！', { withBoard: true }));
        }

        // 人机模式下，再确认人类一方是否已被绝杀
        if (isEngineGame) {
          await requestEngineMove(channelId, 1);
          record = await getGameRecord(channelId);
          if (record.winSide !== '') {
            return await sendMessage(session, await settleVictory(channelId, record.winSide, record.loseSide, '绝杀！', { withBoard: true }));
          }
        }

        const newMoves = record.moveList.slice(movesBefore);
        return await sendMessage(session, panel({
          title: `第 ${record.moveList.length} 手`,
          body: [
            ...newMoves.map((move) => `${withSideIcon(convertTurnToString(move.side))}　${move.chnMoveName}　${move.move}`),
            field('轮到', withSideIcon(convertTurnToString(record.turn))),
          ],
          image: await renderBoard(channelId),
        }));
      } finally {
        busyChannels.delete(channelId);
      }
    })

  ctx.command('cchess.悔棋', '悔棋指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.悔棋 -h`)
    })

  ctx.command('cchess.悔棋.请求', '请求悔棋')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, notStartedPanel(username));
      }
      if (gameRecord.isAnalyzing || busyChannels.has(channelId)) {
        return await sendMessage(session, analyzingPanel(username));
      }
      if (gameRecord.isRegretRequest) {
        return await sendMessage(session, panel({
          icon: '⏳',
          title: '已有悔棋请求',
          at: username,
          body: ['正在等待对方答复，请勿重复请求。'],
        }));
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, notJoinedPanel(username));
      }
      if (gameRecord.moveList.length < 1) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋局初开',
          at: username,
          body: ['一子未落，无悔可言。'],
        }));
      }

      const sideString = convertTurnToString(gameRecord.turn);
      if (gameRecord.isEnginePlayBlack || gameRecord.isEnginePlayRed) {
        await undoMove(channelId);
        await undoMove(channelId);
        return await sendMessage(session, panel({
          icon: '✅',
          title: '悔棋成功',
          at: username,
          body: ['棋子已归原位，皮卡鱼宽宏大量。'],
          image: await renderBoard(channelId),
        }));
      }
      if (playerRecord[0].side === sideString) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '此刻不可悔棋',
          at: username,
          body: ['轮到你落子，上一着是对方所走。'],
          tips: ['落子之后，方有悔棋之说'],
        }));
      }
      await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: true })
      return await sendMessage(session, panel({
        icon: '⏳',
        title: '悔棋请求已送出',
        at: username,
        body: [field('等待答复', withSideIcon(sideString))],
        tips: ['对方可发送「cchess.悔棋.同意」或「cchess.悔棋.拒绝」'],
      }));
    })

  ctx.command('cchess.悔棋.同意', '同意悔棋')
    .action(async ({ session }) => {
      const { username, channelId } = session
      const decision = await checkRegretDecision(session, '同意');
      if (typeof decision === 'string') return await sendMessage(session, decision);

      await undoMove(channelId);
      await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: false })
      return await sendMessage(session, panel({
        icon: '✅',
        title: '悔棋成功',
        at: username,
        body: ['已同意悔棋，棋子已归原位。'],
        tips: ['对局继续。'],
        image: await renderBoard(channelId),
      }));
    })

  ctx.command('cchess.悔棋.拒绝', '拒绝悔棋')
    .action(async ({ session }) => {
      const { username, channelId } = session
      const decision = await checkRegretDecision(session, '拒绝');
      if (typeof decision === 'string') return await sendMessage(session, decision);

      await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: false })
      return await sendMessage(session, panel({
        icon: '⚠️',
        title: '悔棋被拒',
        at: username,
        body: ['落子无悔，棋局继续。'],
        image: await renderBoard(channelId),
      }));
    })

  ctx.command('cchess.认输', '认输')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, notStartedPanel(username));
      }
      if (gameRecord.isAnalyzing || busyChannels.has(channelId)) {
        return await sendMessage(session, analyzingPanel(username));
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, notJoinedPanel(username));
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '此刻不便认输',
          at: username,
          body: [field('你的阵营', withSideIcon(playerRecord[0].side)), field('当前轮走', withSideIcon(sideString))],
          tips: ['轮到你走棋时，才可以认输'],
        }));
      }

      const message = await settleVictory(channelId, turn === 'w' ? 'b' : 'w', turn, '拱手认负', {
        icon: '✅',
        at: username,
        extra: [`${withSideIcon(sideString)} 推枰认负，风度翩翩。`],
      });
      return await sendMessage(session, message);
    })

  ctx.command('cchess.查看云库残局', '云库残局指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.查看云库残局 -h`)
    })

  ctx.command('cchess.查看云库残局.DTM统计', '云库残局 DTM 统计')
    .action(async ({ session }) => {
      const { username, userId } = session
      await updateNameInPlayerRecord(userId, username)
      return await sendMessage(session, panel({
        icon: '📋',
        title: '云库残局 · DTM 统计',
        at: username,
        body: ['DTM：距将死的步数统计。', 'https://www.chessdb.cn/egtb_info_dtm.html'],
      }));
    })

  ctx.command('cchess.查看云库残局.DTC统计', '云库残局 DTC 统计')
    .action(async ({ session }) => {
      const { username, userId } = session
      await updateNameInPlayerRecord(userId, username)
      return await sendMessage(session, panel({
        icon: '📋',
        title: '云库残局 · DTC 统计',
        at: username,
        body: ['DTC：距吃子的步数统计。', 'https://www.chessdb.cn/egtb_info.html'],
      }));
    })

  ctx.command('cchess.编辑棋盘', '编辑棋盘指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.编辑棋盘 -h`)
    })

  ctx.command('cchess.编辑棋盘.导入 <fen:text>', '导入FEN串')
    .action(async ({ session }, fen) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, panel({
          icon: '⚠️',
          title: '棋局进行中',
          at: username,
          body: ['对弈期间不可改动棋盘。'],
          tips: ['发送「cchess.结束」收局后再行摆谱'],
        }));
      }

      fen = fen?.trim()
      if (!fen || !isValidateFen(fen)) {
        return await sendMessage(session, panel({
          icon: '❌',
          title: 'FEN 串无法解析',
          at: username,
          body: ['请检查局面串的格式是否完整。'],
          tips: [
            '示例：rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w',
            '发送「cchess.编辑棋盘.使用方法」查看规范',
          ],
        }));
      }

      const newStartFen = fen.includes("moves") ? fen.split("moves")[0].trim() : fen;

      await ctx.database.set('cchess_game_records', { channelId }, {
        turn: fenToTurn(fen),
        board: fenToBoard(fen),
        moveList: [],
        movesAfterLastEat: [],
        boardAfterLastEat: fenToBoard(fen),
        turnAfterLastEat: fenToTurn(fen),
        lastMove: null,
        isHistoryMode: false,
        originalState: {},
        startFen: newStartFen
      })
      await parseFen(channelId, fen)
      const record = await getGameRecord(channelId);
      return await sendMessage(session, panel({
        icon: '✅',
        title: '棋盘摆放完毕',
        at: username,
        body: [field('轮走方', withSideIcon(convertTurnToString(record.turn)))],
        tips: ['发送「cchess.开始.人人对战」或「cchess.开始.人机对战」由此局面开战'],
        image: await renderBoard(channelId),
      }));
    })

  ctx.command('cchess.编辑棋盘.导出', '导出FEN串')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, notStartedPanel(username));
      }
      if (gameRecord.isAnalyzing || busyChannels.has(channelId)) {
        return await sendMessage(session, analyzingPanel(username));
      }

      const fenWithFullMove = await getFenWithFullMove(channelId);
      return await sendMessage(session, panel({
        icon: '📋',
        title: '当前局面 FEN',
        at: username,
        body: [fenWithFullMove],
        tips: ['可用「cchess.编辑棋盘.导入」还原此局面'],
      }));
    })

  ctx.command('cchess.编辑棋盘.使用方法', '查看编辑棋盘的fen使用方法')
    .action(async ({ session }) => {
      const { username, userId } = session
      await updateNameInPlayerRecord(userId, username)
      return await sendMessage(session, panel({
        icon: '📋',
        title: 'FEN 串使用方法',
        at: username,
        body: ['中国象棋 FEN 格式规范：', 'https://www.xqbase.com/protocol/cchess_fen.htm'],
      }));
    })

  ctx.command('cchess.排行榜', '排行榜指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.排行榜 -h`)
    })

  ctx.command('cchess.排行榜.总胜场 [number:number]', '查看玩家总胜场排行榜')
    .action(async ({ session }, number = config.defaultMaxLeaderboardEntries) => {
      const { userId, username } = session
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return await sendMessage(session, invalidLeaderboardSizePanel(username));
      }
      return await getLeaderboard(session, 'win', '总胜场排行榜', '🏆', number);
    });

  ctx.command('cchess.排行榜.总输场 [number:number]', '查看玩家总输场排行榜')
    .action(async ({ session }, number = config.defaultMaxLeaderboardEntries) => {
      const { userId, username } = session
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return await sendMessage(session, invalidLeaderboardSizePanel(username));
      }
      return await getLeaderboard(session, 'lose', '总输场排行榜', '🍂', number);
    });

  ctx.command('cchess.查询玩家记录 [targetUser:text]', '查询玩家记录')
    .action(async ({ session }, targetUser) => {
      let { userId, username } = session
      await updateNameInPlayerRecord(userId, username)
      if (targetUser) {
        targetUser = await replaceAtTags(session, targetUser);
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = targetUser.match(userIdRegex);
        userId = match?.[1] ?? userId;
        username = match?.[2] ?? username;
      }
      const targetUserRecord = await ctx.database.get('cchess_player_records', { userId })
      if (targetUserRecord.length === 0) {
        await ctx.database.create('cchess_player_records', {
          userId,
          username,
          lose: 0,
          win: 0,
        })
        return await sendMessage(session, panel({
          icon: '🔍',
          title: '棋士档案',
          at: session.username,
          body: [field('查询对象', username), '尚无对局记录，静待首战。'],
          tips: ['发送「cchess.加入」开启第一局'],
        }))
      }
      const { win, lose } = targetUserRecord[0]
      const total = win + lose
      const winRate = total === 0 ? '—' : `${(win / total * 100).toFixed(1)}%`
      return await sendMessage(session, panel({
        icon: '🔍',
        title: '棋士档案',
        at: session.username,
        body: [
          field('查询对象', username),
          field('胜　场', `${win} 局`),
          field('负　场', `${lose} 局`),
          field('总对局', `${total} 局`),
          field('胜　率', winRate),
        ],
      }))
    });

  // --- 常用提示 ---

  function notStartedPanel(username: string): string {
    return panel({
      icon: '⚠️',
      title: '棋局尚未开始',
      at: username,
      body: ['当前频道还没有进行中的对局。'],
      tips: ['「cchess.加入」入座', '「cchess.开始.人人对战」与好友手谈', '「cchess.开始.人机对战」挑战皮卡鱼'],
    })
  }

  function alreadyStartedPanel(username: string): string {
    return panel({
      icon: '⚠️',
      title: '棋局已经开战',
      at: username,
      body: ['本局尚未结束，不必重开。'],
      tips: ['「cchess.认输」结束本局', '「cchess.结束」强制清盘'],
    })
  }

  function notJoinedPanel(username: string): string {
    return panel({
      icon: '⚠️',
      title: '你尚未入座',
      at: username,
      body: ['请先加入对局。'],
      tips: ['发送「cchess.加入」加入对局'],
    })
  }

  function analyzingPanel(username: string): string {
    return panel({
      icon: '⏳',
      title: '皮卡鱼正在推演',
      at: username,
      body: ['引擎正在计算局面，请稍候再试。'],
    })
  }

  function notYourTurnPanel(username: string, yourSide: string, currentSide: string): string {
    return panel({
      icon: '⚠️',
      title: '尚未轮到你',
      at: username,
      body: [field('你的阵营', withSideIcon(yourSide)), field('当前轮走', withSideIcon(currentSide))],
      tips: ['请等待对方落子。'],
    })
  }

  function invalidMovePanel(username: string, reason: string): string {
    return panel({
      icon: '❌',
      title: reason,
      at: username,
      body: ['请确认着法是否合乎棋规。'],
      tips: ['纵线：炮二平五 / 炮8平5', '坐标：b2e2', '详见 https://www.xqbase.com/protocol/cchess_move.htm'],
    })
  }

  function engineUnavailablePanel(username: string): string {
    return panel({
      icon: '⏳',
      title: '皮卡鱼尚未就绪',
      at: username,
      body: ['引擎启动失败，暂时无法进行人机对战。'],
      tips: ['稍后重试，或改用「cchess.开始.人人对战」'],
    })
  }

  function invalidLeaderboardSizePanel(username: string): string {
    return panel({
      icon: '⚠️',
      title: '榜单人数有误',
      at: username,
      body: ['请输入不小于 0 的整数。'],
      tips: ['例如：cchess.排行榜.总胜场 10'],
    })
  }

  // --- 辅助函数 ---

  /** 渲染当前棋盘并封装为图片元素。 */
  async function renderBoard(channelId: string): Promise<string> {
    return h.image(await drawChessBoard(channelId), imageMimeType).toString()
  }

  /** 结算战绩、收起棋盘，并生成战报。 */
  async function settleVictory(
    channelId: string,
    winSide: string,
    loseSide: string,
    title: string,
    options: { icon?: string, at?: string, extra?: Line[], withBoard?: boolean } = {},
  ): Promise<string> {
    const { icon = '✅', at, extra = [], withBoard = false } = options
    const image = withBoard ? await renderBoard(channelId) : undefined
    const winners = await ctx.database.get('cchess_gaming_player_records', {
      channelId,
      side: convertTurnToString(winSide),
    })
    await updatePlayerRecords(channelId, winSide, loseSide)
    await endGame(channelId)
    return panel({
      icon,
      title,
      at,
      body: [
        ...extra,
        field('胜方', withSideIcon(convertTurnToString(winSide))),
        field('棋手', winners.length ? winners.map((player) => `@${player.username}`).join('、') : '皮卡鱼'),
      ],
      tips: ['发送「cchess.加入」再战一局'],
      image,
    })
  }

  /** 校验悔棋表决的前置条件；通过时返回 null，否则返回提示消息。 */
  async function checkRegretDecision(session: Session, action: string): Promise<string | null> {
    const { username, userId, channelId } = session
    await updateNameInPlayerRecord(userId, username)
    const gameRecord = await getGameRecord(channelId);
    if (!gameRecord.isStarted) return notStartedPanel(username);
    if (gameRecord.isAnalyzing || busyChannels.has(channelId)) return analyzingPanel(username);
    if (!gameRecord.isRegretRequest) {
      return panel({
        icon: '⚠️',
        title: '暂无悔棋请求',
        at: username,
        body: [`当前没有待答复的请求，无从${action}。`],
      });
    }
    const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
    if (playerRecord.length === 0) return notJoinedPanel(username);
    const sideString = convertTurnToString(gameRecord.turn);
    if (playerRecord[0].side !== sideString) {
      return panel({
        icon: '⚠️',
        title: '无权表决',
        at: username,
        body: ['悔棋请求正由对方等待答复。', field('应答方', withSideIcon(sideString))],
      });
    }
    return null;
  }

  async function replaceAtTags(session: Session, content: string): Promise<string> {
    const atRegex = /<at id="(\d+)"(?: name="([^"]*)")?\/>/g;
    let match;
    while ((match = atRegex.exec(content)) !== null) {
      const userId = match[1];
      const name = match[2];
      if (!name) {
        let guildMember;
        try {
          guildMember = await session.bot.getGuildMember(session.guildId, userId);
        } catch (error) {
          guildMember = { user: { name: '未知用户' } };
        }
        const newAtTag = `<at id="${userId}" name="${guildMember.user.name}"/>`;
        content = content.replace(match[0], newAtTag);
      }
    }
    return content;
  }

  async function updatePlayerRecords(channelId: string, winSide: string, loseSide: string) {
    await addPlayerCount(channelId, convertTurnToString(winSide), 'win');
    await addPlayerCount(channelId, convertTurnToString(loseSide), 'lose');
  }

  /** 为某一阵营的所有棋手累加战绩。 */
  async function addPlayerCount(channelId: string, side: string, key: 'win' | 'lose') {
    if (!side) return;
    const gamingPlayers = await ctx.database.get('cchess_gaming_player_records', { channelId, side });
    for (const gamingPlayer of gamingPlayers) {
      const [playerRecord] = await ctx.database.get('cchess_player_records', { userId: gamingPlayer.userId });
      if (!playerRecord) {
        await ctx.database.create('cchess_player_records', {
          userId: gamingPlayer.userId,
          username: gamingPlayer.username,
          win: key === 'win' ? 1 : 0,
          lose: key === 'lose' ? 1 : 0,
        });
        continue;
      }
      const update = key === 'win' ? { win: playerRecord.win + 1 } : { lose: playerRecord.lose + 1 };
      await ctx.database.set('cchess_player_records', { userId: gamingPlayer.userId }, update);
    }
  }

  async function getLeaderboard(session: Session, sortField: 'win' | 'lose', title: string, icon: string, number: number) {
    // 过滤、排序、截断交给数据库，只有前 number 行进内存
    const topPlayers = await ctx.database
      .select('cchess_player_records')
      .where({ [sortField]: { $gt: 0 } })
      .orderBy(sortField, 'desc')
      .limit(number)
      .execute()

    return await sendMessage(session, panel({
      icon,
      title,
      body: topPlayers.length
        ? topPlayers.map((player, index) => `${MEDALS[index] ?? `${index + 1}.`} ${player.username}　${player[sortField]} 局`)
        : ['榜上尚无名姓，快去手谈一局。'],
      tips: topPlayers.length ? [] : ['发送「cchess.加入」开启对局'],
    }));
  }

  async function updateNameInPlayerRecord(userId: string, username: string): Promise<void> {
    const userRecord = await ctx.database.get('cchess_player_records', { userId });
    if (userRecord.length === 0) {
      await ctx.database.create('cchess_player_records', { userId, username });
      return;
    }
    if (username !== userRecord[0].username) {
      await ctx.database.set('cchess_player_records', { userId }, { username });
    }
  }

  /** 确保频道的引擎已就绪；同一频道的并发调用会共享同一次初始化。 */
  async function checkEngine(channelId: string): Promise<boolean> {
    if (engines[channelId]) return true;
    if (!enginePromises[channelId]) {
      enginePromises[channelId] = initEngine(channelId).finally(() => {
        delete enginePromises[channelId];
      });
    }
    try {
      await enginePromises[channelId];
    } catch (error) {
      logger.error(error);
    }
    return !!engines[channelId];
  }

  /** 等待引擎给出结果；超时后自动解除分析状态，避免指令永远卡住。 */
  async function waitForAnalysis(channelId: string, timeout = ENGINE_TIMEOUT): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const { isAnalyzing } = await getGameRecord(channelId);
      if (!isAnalyzing) return true;
      await sleep(200);
    }
    logger.warn(`频道 ${channelId} 等待引擎结果超时。`);
    await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: false });
    return false;
  }

  /**
   * 让引擎在当前局面上思考一步并等待结果。
   * 人机模式下这一步即引擎的应招，其余情况用于判断轮走方是否已被绝杀。
   */
  async function requestEngineMove(channelId: string, depth = thinkingDepth): Promise<boolean> {
    await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: true });
    const { movesAfterLastEat, boardAfterLastEat, turnAfterLastEat } = await getGameRecord(channelId);
    const fen = getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat);
    if (await sendCommand(channelId, `fen ${fen}`) && await go(channelId, -1, depth, -1)) {
      return await waitForAnalysis(channelId);
    }
    await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: false });
    return false;
  }

  async function getFenWithFullMove(channelId, separator = " ") {
    const gameRecord = await getGameRecord(channelId);
    const { startFen, moveList } = gameRecord;
    let moves = [];
    for (let move of moveList) moves.push(move.move);
    let fullFen = startFen;
    if (moves.length > 0) {
      fullFen += " moves " + moves.join(separator);
    }
    return fullFen
  }

  function fenToTurn(t) {
    let e = t.split(" ");
    return "b" == e[1] ? "b" : "w"
  }

  function isValidateFen(fen: string) {
    if (!fen) return false;
    const parts = fen.trim().split(/\s+/);
    const boardPart = parts[0];
    const turnPart = parts[1];
    if (!boardPart || !turnPart) return false;
    if (!["w", "b", "r"].includes(turnPart.toLowerCase())) return false;
    // 双方主将俱在，才是合法的局面
    if (!boardPart.includes("k") || !boardPart.includes("K")) return false;
    let rows = boardPart.split("/");
    if (rows.length != 10) return false;
    const pieceChars = "rnbakcpRNBAKCP";
    for (const row of rows) {
      let count = 0;
      for (const char of row) {
        if (char >= "1" && char <= "9") {
          count += parseInt(char);
        } else if (pieceChars.includes(char)) {
          count++;
        } else {
          return false;
        }
      }
      if (count != 9) return false;
    }
    return true;
  }

  async function parseFen(channelId, fenString) {
    const parts = fenString.split(" ");
    const board = fenToBoard(parts[0])
    const turn = "b" == parts[1] ? "b" : "w"
    await ctx.database.set('cchess_game_records', { channelId }, { turn, board })
    if (parts.length > 3 && "moves" == parts[2]) {
      if (parts[3].length == 4) {
        for (let i = 3; i < parts.length; i++) {
          await makeMoveByString(channelId, parts[i]);
        }
      } else {
        let movesStr = parts[3];
        for (let i = 0; i < movesStr.length; i += 4) {
          await makeMoveByString(channelId, movesStr.substring(i, i + 4))
        }
      }
    }
  }

  /** 棋盘与走子列表都是纯数据，用 structuredClone 比 JSON 往返快得多。 */
  function deepCopy<T>(obj: T): T {
    return structuredClone(obj)
  }

  async function gotoHistory(channelId, targetMove) {
    const gameRecord = await getGameRecord(channelId);
    let {
      turn, board, moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, isHistoryMode, originalState
    } = gameRecord;

    if (!isHistoryMode) {
       originalState = {
        fen: getFen(board, turn),
        turn: turn,
        board: deepCopy(board),
        moveList: deepCopy(moveList),
        movesAfterLastEat: deepCopy(movesAfterLastEat),
        boardAfterLastEat: deepCopy(boardAfterLastEat),
        turnAfterLastEat: turnAfterLastEat,
        lastMove: lastMove
      };
      isHistoryMode = true;
    }

    let moveId = targetMove.moveId
    let idx = originalState.moveList.findIndex((m => m.moveId == moveId));
    moveList = originalState.moveList.slice(0, idx + 1);

    idx = originalState.movesAfterLastEat.findIndex((m => m.moveId == moveId));
    if (idx != -1) {
      movesAfterLastEat = originalState.movesAfterLastEat.slice(0, idx + 1);
    } else {
      boardAfterLastEat = fenToBoard(targetMove.fen);
      turnAfterLastEat = "w" == targetMove.side ? "b" : "w";
      movesAfterLastEat = [];
    }

    lastMove = targetMove.moveCord;
    turn = "w" == targetMove.side ? "b" : "w";
    board = fenToBoard(targetMove.fen);

    await ctx.database.set('cchess_game_records', { channelId }, {
      fen: targetMove.fen,
      turn, board, moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, originalState, isHistoryMode
    })
  }

  async function gotoStart(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let {
      turn, board, moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, isHistoryMode, originalState, startFen
    } = gameRecord;

    if (!isHistoryMode) {
      originalState = {
        fen: getFen(board, turn),
        turn: turn,
        board: deepCopy(board),
        moveList: deepCopy(moveList),
        movesAfterLastEat: deepCopy(movesAfterLastEat),
        boardAfterLastEat: deepCopy(boardAfterLastEat),
        turnAfterLastEat: turnAfterLastEat,
        lastMove: lastMove
      };
      isHistoryMode = true;
    }

    await parseFen(channelId, startFen);
    moveList = [];
    movesAfterLastEat = [];
    // 回到开局局面，吃子基准也应取自开局串
    boardAfterLastEat = fenToBoard(startFen);
    turnAfterLastEat = fenToTurn(startFen);
    lastMove = null;

    await ctx.database.set('cchess_game_records', { channelId }, {
      moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, originalState, isHistoryMode
    })
  }

  async function undoMove(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let {
      turn, board, moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, isHistoryMode, originalState
    } = gameRecord;

    if (!isHistoryMode) {
      originalState = {
        fen: getFen(board, turn),
        turn: turn,
        board: deepCopy(board),
        moveList: deepCopy(moveList),
        movesAfterLastEat: deepCopy(movesAfterLastEat),
        boardAfterLastEat: deepCopy(boardAfterLastEat),
        turnAfterLastEat: turnAfterLastEat,
        lastMove: lastMove
      };
      isHistoryMode = true;
    }

    await ctx.database.set('cchess_game_records', { channelId }, { originalState, isHistoryMode });

    if (moveList.length > 1) {
      let target = moveList[moveList.length - 2];
      await gotoHistory(channelId, target)
    } else {
      await gotoStart(channelId)
    }
  }

  async function endGame(channelId: string): Promise<void> {
    await ctx.database.remove('cchess_game_records', { channelId });
    await ctx.database.remove('cchess_gaming_player_records', { channelId });
  }

  async function onEngineBestMove(channelId, move, ponder) {
    const gameRecord = await getGameRecord(channelId);
    let { isEnginePlayRed, isEnginePlayBlack, board, turn } = gameRecord;
    if (!move) {
      await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: false })
      return;
    }

    if ("(none)" === move) {
      await ctx.database.set('cchess_game_records', { channelId }, {
        winSide: turn === 'w' ? 'b' : 'w',
        loseSide: turn,
        isAnalyzing: false
      });
      return;
    }
    let side = getSideByMoveString(board, move);
    if (side !== turn && isEnginePlayRed || side !== turn && isEnginePlayBlack) {
      // 引擎试图走错方（虽然不太可能发生）
      await ctx.database.set('cchess_game_records', { channelId }, {
        winSide: turn,
        loseSide: turn === 'w' ? 'b' : 'w',
        isAnalyzing: false
      });
      return;
    }
    if (("w" === side && isEnginePlayRed) || ("b" === side && isEnginePlayBlack)) {
      await makeMoveByString(channelId, move)
    }

    await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: false })
  }


  async function go(channelId: string, movetime = -1, depth = -1, nodes = -1) {
    let cmd = "go";
    if (movetime > 0) cmd += " movetime " + movetime;
    if (depth > 0) cmd += " depth " + depth;
    if (nodes > 0) cmd += " nodes " + nodes;
    return await sendCommand(channelId, cmd);
  }

  function moveStringToPos(moveStr: string) {
    const xMap = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8 };
    const yMap = { 0: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1, 9: 0 };
    const from = [xMap[moveStr[0]], yMap[moveStr[1]]];
    const to = [xMap[moveStr[2]], yMap[moveStr[3]]];
    return [from, to];
  }

  async function makeMoveByString(channelId, moveStr) {
    let [from, to] = moveStringToPos(moveStr);
    await makeMove(channelId, from, to)
  }

  function getSideByMoveString(board, moveStr) {
    let [from, to] = moveStringToPos(moveStr);
    return getSide(board[from[1]][from[0]])
  }

  function getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat) {
    let moves = [];
    for (let m of movesAfterLastEat) moves.push(m.move);
    let fen = boardToFen(boardAfterLastEat, "w", turnAfterLastEat);
    if (moves.length > 0) fen += " moves " + moves.join(" ");
    return fen;
  }

  async function setOption(channelId, name, value) {
    await sendCommand(channelId, "setoption name " + name + " value " + value)
  }

  async function setOptionList(channelId, options) {
    for (let key in options)
      await setOption(channelId, key, options[key])
  }

  async function sendCommand(channelId: string, cmd: string): Promise<boolean> {
    if (!await checkEngine(channelId)) {
      logger.warn(`频道 ${channelId} 的引擎未就绪，已忽略指令：${cmd}`);
      return false;
    }
    const gameRecord = await getGameRecord(channelId);
    if (!gameRecord.isEngineReady) {
      await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: true })
    }
    try {
      engines[channelId].send_command(cmd);
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }

  async function receiveOutput(channelId, output) {
    try {
      if (!output) return;
      let parts = output.split(" ");
      let command = parts[0];

      if (command === "bestmove") {
        if (parts.length === 4 && parts[2] === "ponder") {
          await onEngineBestMove(channelId, parts[1], parts[3]);
        } else {
          await onEngineBestMove(channelId, parts[1], null);
        }
      }
    } catch (error) {
      logger.error(error);
    }
  }

  async function initEngine(channelId: string): Promise<void> {
    const wasmOrigin = __dirname;
    const wasmScriptPath = path.join(wasmOrigin, 'assets', 'wasm', 'pikafish.js');
    const wasmBinaryPath = path.join(wasmOrigin, 'assets', 'wasm', 'pikafish.wasm'); // 显式指定 wasm 路径

    await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: false })

    // 手动读取 .wasm 为 Buffer，避免 emscripten 内部的 fetch 失败或路径解析错误
    let wasmBinary: Buffer;
    try {
      wasmBinary = fs.readFileSync(wasmBinaryPath);
    } catch (error) {
      logger.error(`无法读取 WASM 文件，请检查路径：${wasmBinaryPath}`);
      throw error;
    }

    const Pikafish = require(wasmScriptPath);
    const instance = await Pikafish({
      // 显式传入二进制数据
      wasmBinary,

      locateFile: (file: string) => {
        // 主要用于加载 .data 或 .nnue 文件，wasm 已由 wasmBinary 接管
        if (file.endsWith(".data")) {
          return path.join(wasmOrigin, 'assets', 'wasm', 'data', file);
        }
        return path.join(wasmOrigin, 'assets', 'wasm', file);
      },
      print: (text: string) => { logger.debug("[pikafish] %s", text) },
      printErr: (text: string) => { logger.warn("[pikafish] %s", text) },
      setStatus: () => { },
    });

    instance.read_stdout = async (stdout: string) => {
      await receiveOutput(channelId, stdout);
    };
    engines[channelId] = instance;

    await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: true })
    await sleep(100)
    await sendCommand(channelId, "uci");
    await sleep(100)
    await setOptionList(channelId, engineSettings);
  }

  function findMoveInfo(moveInfoList: MoveInfo[], moveOperation: string): MoveInfo | undefined {
    return moveInfoList.find(moveInfo => moveInfo.figureMoveName === moveOperation);
  }

  function findLegalMovePositions(moveMap: string[][]): number[][] {
    const legalPositions: number[][] = [];
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if ((moveMap[i][j] === 'go' || moveMap[i][j] === 'eat')) {
          legalPositions.push([i, j]);
        }
      }
    }
    return legalPositions;
  }

  function findLetterPositions(board: string[][], processedLetter: string): number[][] {
    const positions: number[][] = [];
    for (let i = 0; i < board.length; i++) {
      for (let j = 0; j < board[i].length; j++) {
        if (board[i][j] === processedLetter) {
          positions.push([i, j]);
        }
      }
    }
    return positions;
  }

  function processEnglishLetter(englishLetter: string, turn: string): string {
    if (turn === 'w') {
      return englishLetter.toUpperCase();
    } else {
      return englishLetter.toLowerCase();
    }
  }

  const chineseToEnglishMap: { [key: string]: string } = {
    "将": "k", "士": "a", "象": "b", "车": "r", "马": "n", "炮": "c", "卒": "p",
    "帅": "k", "仕": "a", "相": "b", "兵": "p"
  };

  function getEnglishLetterFromFigureName(figureName: string): string | null {
    return chineseToEnglishMap[figureName] || null;
  }

  function getFigureNameFromMoveOperation(moveOperation: string): string | null {
    const figureNamesRegex = new RegExp(possibleFigureNames.join("|"));
    const figureNameMatches = moveOperation.match(figureNamesRegex);
    if (figureNameMatches && figureNameMatches.length > 0) {
      return figureNameMatches[0];
    }
    return null;
  }

  function isValidFigureMoveName(move: string): boolean {
    const possibleActions = ["进", "退", "平"];
    const possiblePositions = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "9", "8", "7", "6", "5", "4", "3", "2", "1"];

    const figureNamesRegex = new RegExp(possibleFigureNames.join("|"));
    const actionRegex = new RegExp(possibleActions.join("|"));
    const positionRegex = new RegExp(possiblePositions.join("|"), "g");

    if (move.length !== 4) return false;

    const figureNameMatches = move.match(figureNamesRegex);
    const actionMatches = move.match(actionRegex);
    const positionMatches = move.match(positionRegex);

    return !!(figureNameMatches && figureNameMatches.length === 1 &&
      actionMatches && actionMatches.length === 1 &&
      positionMatches && positionMatches.length >= 1 && positionMatches.length <= 2);
  }

  function convertTurnToString(turn): string {
    if (turn === 'w') {
      return '红方';
    } else if (turn === 'b') {
      return '黑方';
    }
    return '';
  }

  async function createImage(buffer: Buffer): Promise<Buffer> {
    const canvas = await ctx.canvas.createCanvas(620 * scale, 780 * scale);
    const context = canvas.getContext('2d');

    const outerFrame = await ctx.canvas.loadImage(outerFrameImg);
    context.drawImage(outerFrame, 0, 0, 620 * scale, 780 * scale);

    const boardImg = await ctx.canvas.loadImage(buffer);
    context.drawImage(boardImg, 36.5 * scale, 90 * scale, 550 * scale, 605 * scale);

    return canvas.toBuffer(imageMimeType);
  }

  function isMoveString(str: string): boolean {
    const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    if (str.length !== 4) return false;
    return boardLetters.includes(str[0]) &&
      boardLetters.includes(str[2]) &&
      parseInt(str[1]) >= 0 && parseInt(str[1]) <= 9 &&
      parseInt(str[3]) >= 0 && parseInt(str[3]) <= 9;
  }

  function getType(t) { return t.toLowerCase() }

  // --- 走法生成逻辑 (保持原逻辑准确性，仅变量重命名) ---

  function getValidMoveMapKings(board: string[][], side: string, pos: number[]) {
    let minRow, maxRow, map = getEmptyBoard(), col = pos[0], row = pos[1];
    if (row <= 2) { minRow = 0; maxRow = 2; }
    else if (row >= 7) { minRow = 7; maxRow = 9; }
    else { minRow = row - 1; maxRow = row + 1; }

    const minCol = 3, maxCol = 5;
    const checkAndSet = (c, r) => {
        let type = getValidType(board, side, [c, r]);
        if (type === "eat" || type === "go") setMoveMap(map, [c, r], type);
    }

    if (col + 1 <= maxCol) checkAndSet(col + 1, row);
    if (col - 1 >= minCol) checkAndSet(col - 1, row);
    if (row + 1 <= maxRow) checkAndSet(col, row + 1);
    if (row - 1 >= minRow) checkAndSet(col, row - 1);
    return map;
  }

  function getValidMoveMapCannons(board: string[][], side: string, pos: number[]) {
    let map = getEmptyBoard(), col = pos[0], row = pos[1], flag = false;

    // Right
    for (let c = col + 1; c < 9; c++) {
      let type = getValidType(board, side, [c, row]);
      if (flag) { if (type === "eat") { setMoveMap(map, [c, row], "eat"); break; } }
      else {
        if (type === "block" || type === "eat") { flag = true; }
        else if (type === "go") setMoveMap(map, [c, row], "go");
      }
    }
    // Left
    flag = false;
    for (let c = col - 1; c >= 0; c--) {
        let type = getValidType(board, side, [c, row]);
        if (flag) { if (type === "eat") { setMoveMap(map, [c, row], "eat"); break; } }
        else {
            if (type === "block" || type === "eat") { flag = true; }
            else if (type === "go") setMoveMap(map, [c, row], "go");
        }
    }
    // Down
    flag = false;
    for (let r = row + 1; r < 10; r++) {
        let type = getValidType(board, side, [col, r]);
        if (flag) { if (type === "eat") { setMoveMap(map, [col, r], "eat"); break; } }
        else {
            if (type === "block" || type === "eat") { flag = true; }
            else if (type === "go") setMoveMap(map, [col, r], "go");
        }
    }
    // Up
    flag = false;
    for (let r = row - 1; r >= 0; r--) {
        let type = getValidType(board, side, [col, r]);
        if (flag) { if (type === "eat") { setMoveMap(map, [col, r], "eat"); break; } }
        else {
            if (type === "block" || type === "eat") { flag = true; }
            else if (type === "go") setMoveMap(map, [col, r], "go");
        }
    }
    return map;
  }

  function getSideByKing(board, pos) {
    let row = pos[1];
    let searchRange = row <= 4 ? {min:0, max:2} : {min:7, max:9};
    for (let r = searchRange.min; r <= searchRange.max; r++) {
        for (let c = 3; c <= 5; c++) {
            let p = getPiece(board, [c, r]);
            if (p === "K") return "w";
            if (p === "k") return "b";
        }
    }
    return "";
  }

  function getValidMoveMapPawns(board: string[][], side: string, pos: number[]) {
    let map = getEmptyBoard(), col = pos[0], row = pos[1];
    let kingSide = getSideByKing(board, pos);

    if (side === kingSide) { // 未过河
       if (row <= 4) { // 红方
           let type = getValidType(board, side, [col, row + 1]);
           if (type === "eat" || type === "go") setMoveMap(map, [col, row + 1], type);
       } else { // 黑方
           let type = getValidType(board, side, [col, row - 1]);
           if (type === "eat" || type === "go") setMoveMap(map, [col, row - 1], type);
       }
    } else { // 已过河
        if (row <= 4) { // 黑方过河
           let type = getValidType(board, side, [col, row - 1]);
           if (type === "eat" || type === "go") setMoveMap(map, [col, row - 1], type);
        } else { // 红方过河
           let type = getValidType(board, side, [col, row + 1]);
           if (type === "eat" || type === "go") setMoveMap(map, [col, row + 1], type);
        }
        // 横向
        let typeL = getValidType(board, side, [col - 1, row]);
        if (typeL === "eat" || typeL === "go") setMoveMap(map, [col - 1, row], typeL);
        let typeR = getValidType(board, side, [col + 1, row]);
        if (typeR === "eat" || typeR === "go") setMoveMap(map, [col + 1, row], typeR);
    }
    return map;
  }

  function getValidMoveMapBishops(board: string[][], side: string, pos: number[]) {
    let minRow, maxRow, map = getEmptyBoard(), col = pos[0], row = pos[1];
    if (row <= 4) { minRow = 0; maxRow = 4; }
    else if (row >= 5) { minRow = 5; maxRow = 9; }
    else { minRow = row - 1; maxRow = row + 1; }

    const check = (cOffset, rOffset) => {
        if (col + cOffset * 2 >= 0 && col + cOffset * 2 <= 8 && row + rOffset * 2 >= minRow && row + rOffset * 2 <= maxRow) {
            if (getPiece(board, [col + cOffset, row + rOffset]) === "") {
                let type = getValidType(board, side, [col + cOffset * 2, row + rOffset * 2]);
                if (type === "eat" || type === "go") setMoveMap(map, [col + cOffset * 2, row + rOffset * 2], type);
            }
        }
    }
    check(1, 1); check(-1, 1); check(1, -1); check(-1, -1);
    return map;
  }

  function getValidMoveMap(board: string[][], type: string, side: string, position: number[]) {
    switch (type) {
      case "r": return getValidMoveMapRooks(board, side, position);
      case "n": return getValidMoveMapKnights(board, side, position);
      case "a": return getValidMoveMapAdvisors(board, side, position);
      case "b": return getValidMoveMapBishops(board, side, position);
      case "k": return getValidMoveMapKings(board, side, position);
      case "c": return getValidMoveMapCannons(board, side, position);
      case "p": return getValidMoveMapPawns(board, side, position);
      default: return getEmptyBoard();
    }
  }

  function getValidMoveMapRooks(board: string[][], side: string, pos: number[]) {
    let map = getEmptyBoard(), col = pos[0], row = pos[1];
    const scan = (cStart, cEnd, rStart, rEnd, cStep, rStep) => {
        for (let c = cStart, r = rStart; c !== cEnd && r !== rEnd; c+=cStep, r+=rStep) {
            if (c === col && r === row) continue;
            let type = getValidType(board, side, [c, r]);
            if (type === "block") break;
            map[r][c] = type;
            if (type === "eat") break;
        }
    }
    scan(col, 9, row, row + 1, 1, 0); // Right
    scan(col, -1, row, row + 1, -1, 0); // Left
    scan(col, col + 1, row, 10, 0, 1); // Down
    scan(col, col + 1, row, -1, 0, -1); // Up
    return map;
  }

  function getValidType(board, side, pos) {
    let p = getPiece(board, pos);
    return p === undefined ? "invalid" : p === "" ? "go" : side !== getSide(p) ? "eat" : "block";
  }

  function getValidMoveMapAdvisors(board: string[][], side: string, pos: number[]) {
    let minRow, maxRow, map = getEmptyBoard(), col = pos[0], row = pos[1];
    if (row <= 2) { minRow = 0; maxRow = 2; }
    else if (row >= 7) { minRow = 7; maxRow = 9; }
    else { minRow = row - 1; maxRow = row + 1; }
    const minCol = 3, maxCol = 5;

    const check = (cOffset, rOffset) => {
        let c = col + cOffset, r = row + rOffset;
        if (c >= minCol && c <= maxCol && r >= minRow && r <= maxRow) {
            let type = getValidType(board, side, [c, r]);
            if (type === "eat" || type === "go") setMoveMap(map, [c, r], type);
        }
    }
    check(1, 1); check(-1, 1); check(1, -1); check(-1, -1);
    return map;
  }

  function setMoveMap(map, pos, type) {
    if (pos[0] >= 0 && pos[0] <= 8 && pos[1] >= 0 && pos[1] <= 9) {
        map[pos[1]][pos[0]] = type;
    }
  }

  function getValidMoveMapKnights(board: string[][], side: string, pos: number[]) {
    let map = getEmptyBoard(), col = pos[0], row = pos[1];
    const check = (legC, legR, targetC, targetR) => {
        if (getPiece(board, [col + legC, row + legR]) === "") {
            let type = getValidType(board, side, [col + targetC, row + targetR]);
            setMoveMap(map, [col + targetC, row + targetR], type);
        }
    }
    check(1, 0, 2, 1); check(1, 0, 2, -1);
    check(-1, 0, -2, 1); check(-1, 0, -2, -1);
    check(0, 1, 1, 2); check(0, 1, -1, 2);
    check(0, -1, 1, -2); check(0, -1, -1, -2);
    return map;
  }

  // 中文纵线命名常量
  var ActionMap = { w: ["进", "退"], b: ["退", "进"], p: "平" };
  var PositionMap = { w: ["前", "后"], b: ["后", "前"], m: "中" };
  var PieceNameMap = { k: "将", a: "士", b: "象", r: "车", n: "马", c: "炮", p: "卒", K: "帅", A: "仕", B: "相", R: "车", N: "马", C: "炮", P: "兵" };
  var NumberMap = {
    w: ["一", "二", "三", "四", "五", "六", "七", "八", "九"],
    b: ["9", "8", "7", "6", "5", "4", "3", "2", "1"]
  };

  function parseChessNotation(fen) {
    let e = [];
    for (let s = 0; s < 9; s++) { e[s] = []; for (let t = 0; t < 10; t++) e[s][t] = 0 }
    let i = fen.split(" ")[0].split("/"), n = ["k", "a", "b", "r", "n", "c", "p", "K", "A", "B", "R", "N", "C", "P"], A = 0;
    for (let s = 0; s < 10; s++) {
      let t = i[s], a = 0;
      for (let k = 0; k < t.length; k++) {
        let o = t[k];
        if (o >= "0" && o <= "9") a += parseInt(o);
        else if (-1 != n.indexOf(o)) {
          let t = o >= "a" && o <= "z" ? "b" : "w";
          e[a][s] = t + o + A, a++, A++
        }
      }
    }
    return e
  }

  function getFigureMoveName(fen, moveString) {
    let i = parseChessNotation(fen);
    var n = moveString.charCodeAt(0) - 97, A = 9 - (moveString.charCodeAt(1) - 48), s = moveString.charCodeAt(2) - 97, a = 9 - (moveString.charCodeAt(3) - 48), o = 0, r = 0, l = 0, d = '';
    if ("A" != i[n][A].charAt(1) && "B" != i[n][A].charAt(1) && "a" != i[n][A].charAt(1) && "b" != i[n][A].charAt(1)) {
      for (var g = 0; g < 9; g++) if (g != n) { for (var f = 0; f < 10; f++) 0 != i[g][f] && i[g][f].substring(0, 2) == i[n][A].substring(0, 2) && l++; l < 2 && (l = 0) }
      for (f = 0; f < 10; f++) 0 != i[n][f] && i[n][f].substring(0, 2) == i[n][A].substring(0, 2) && (f < A ? 0 == l ? (d = PositionMap[i[n][A].charAt(0)][1] + PieceNameMap[i[n][A].charAt(1)], o++) : (d = PositionMap[i[n][A].charAt(0)][1] + NumberMap[i[n][A].charAt(0)][9 - n - 1], o++) : f == A ? 0 == o ? d = PieceNameMap[i[n][A].charAt(1)] + NumberMap[i[n][A].charAt(0)][9 - n - 1] : r = o : 0 == l ? 0 == o ? d = PositionMap[i[n][A].charAt(0)][0] + PieceNameMap[i[n][A].charAt(1)] : (d = PositionMap["m"] + PieceNameMap[i[n][A].charAt(1)], o++) : 0 == o ? d = PositionMap[i[n][A].charAt(0)][0] + NumberMap[i[n][A].charAt(0)][9 - n - 1] : (d = PositionMap["m"] + NumberMap[i[n][A].charAt(0)][9 - n - 1], o++));
      o > 2 && o != r && (d = "w" == i[n][A].charAt(0) ? NumberMap["w"][r] + PieceNameMap[i[n][A].charAt(1)] : NumberMap["w"][o - r] + PieceNameMap[i[n][A].charAt(1)])
    } else d = PieceNameMap[i[n][A].charAt(1)] + NumberMap[i[n][A].charAt(0)][9 - n - 1];
    var h = '';
    return h = A > a ? n == s ? "w" == i[n][A].charAt(0) ? ActionMap[i[n][A].charAt(0)][0] + NumberMap[i[n][A].charAt(0)][A - a - 1] : ActionMap[i[n][A].charAt(0)][0] + NumberMap[i[n][A].charAt(0)][9 - (A - a - 1) - 1] : ActionMap[i[n][A].charAt(0)][0] + NumberMap[i[n][A].charAt(0)][9 - s - 1] : A == a ? ActionMap["p"] + NumberMap[i[n][A].charAt(0)][9 - s - 1] : n == s ? "w" == i[n][A].charAt(0) ? ActionMap[i[n][A].charAt(0)][1] + NumberMap[i[n][A].charAt(0)][a - A - 1] : ActionMap[i[n][A].charAt(0)][1] + NumberMap[i[n][A].charAt(0)][9 - (a - A - 1) - 1] : ActionMap[i[n][A].charAt(0)][1] + NumberMap[i[n][A].charAt(0)][9 - s - 1], d + h
  }


  function moveToMoveString(move: number[][]) {
    const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
    let startSquare = move[0];
    let endSquare = move[1];
    let startSquareAlgebraic = boardLetters[startSquare[0]] + (9 - startSquare[1]).toString();
    let endSquareAlgebraic = boardLetters[endSquare[0]] + (9 - endSquare[1]).toString();
    return startSquareAlgebraic + endSquareAlgebraic;
  }

  function moveStringToMove(moveString: string): number[][] {
    const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    let startSquareAlgebraic = moveString.substring(0, 2);
    let endSquareAlgebraic = moveString.substring(2);
    let startSquare: number[] = [boardLetters.indexOf(startSquareAlgebraic[0]), 9 - parseInt(startSquareAlgebraic[1])];
    let endSquare: number[] = [boardLetters.indexOf(endSquareAlgebraic[0]), 9 - parseInt(endSquareAlgebraic[1])];
    return [startSquare, endSquare];
  }

  function genRandomId(length: number): string {
    let id = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) id += characters.charAt(Math.floor(Math.random() * characters.length));
    return id;
  }

  async function makeMove(channelId: string, fromPos: number[], toPos: number[]) {
    const gameRecord = await getGameRecord(channelId);
    let {
      turn, board, moveTreePtr, moveList, isHistoryMode, boardAfterLastEat, turnAfterLastEat, movesAfterLastEat
    } = gameRecord;

    if (isHistoryMode) gameRecord.isHistoryMode = false;

    const lastMove = [fromPos, toPos];
    const moveId = genRandomId(8);
    const pieceAtDestination = board[toPos[1]][toPos[0]] !== "";

    const side = getSide(getPiece(board, fromPos));
    const fen = getFen(board, side);

    if (board[toPos[1]][toPos[0]] === 'K' || board[toPos[1]][toPos[0]] === 'k') {
      await ctx.database.set('cchess_game_records', { channelId }, {
        winSide: board[toPos[1]][toPos[0]] === 'K' ? 'b' : 'w',
        loseSide: board[toPos[1]][toPos[0]] === 'K' ? 'w' : 'b',
      });
    }
    board[toPos[1]][toPos[0]] = board[fromPos[1]][fromPos[0]];
    board[fromPos[1]][fromPos[0]] = "";

    turn = turn === getSide(board[toPos[1]][toPos[0]]) ? (turn === "w" ? "b" : "w") : turn;

    const moveString = moveToMoveString([fromPos, toPos]);
    const figureMoveName = getFigureMoveName(fen, moveString);
    const moveData: MoveData = {
      moveId, fen: getFen(board, turn), side, moveCord: [fromPos, toPos], move: moveString, chnMoveName: figureMoveName, next: null
    };

    moveList.push(moveData);
    moveTreePtr.next = moveData;
    moveTreePtr = moveData;

    if (pieceAtDestination) {
      boardAfterLastEat = fenToBoard(getFen(board, turn));
      turnAfterLastEat = turn;
      movesAfterLastEat = [];
    } else {
      movesAfterLastEat.push(moveData);
    }

    const updatedGameRecord = {
      fen: moveData.fen,
      turn, board, lastMove, moveTreePtr, moveList, isHistoryMode, boardAfterLastEat, turnAfterLastEat, movesAfterLastEat
    };
    Object.assign(gameRecord, updatedGameRecord);
    await ctx.database.set('cchess_game_records', { channelId }, updatedGameRecord);
  }


  function getFen(board: string[][], turn): string {
    return boardToFen(board, 'w', turn);
  }

  function boardToFen(board: string[][], side: string, turn: string = "w"): string {
    if (board === null) return "";
    const ranks = side === "w" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    let fenString = "";

    for (const row of ranks) {
      let emptyCount = 0;
      for (let col = 0; col < 9; col++) {
        const piece = board[row][col];
        if (piece === "") {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fenString += emptyCount;
            emptyCount = 0;
          }
          fenString += piece;
        }
      }
      if (emptyCount > 0) fenString += emptyCount;
      fenString += "/";
    }
    fenString = fenString.substring(0, fenString.length - 1) + " " + turn;
    return fenString;
  }

  function getSide(piece: string): string {
    if (!piece || piece === "invalid") return "";
    return "RNBAKCP".includes(piece) ? "w" : "b";
  }

  async function getGameRecord(channelId: string): Promise<GameRecord> {
    let gameRecord = await ctx.database.get('cchess_game_records', { channelId });
    if (gameRecord.length === 0) {
      await ctx.database.create('cchess_game_records', { channelId });
      gameRecord = await ctx.database.get('cchess_game_records', { channelId });
    }
    return gameRecord[0];
  }

  async function drawChessBoard(channelId: string): Promise<Buffer> {
    const gameRecord = await getGameRecord(channelId);
    let { board, lastMove, moveList } = gameRecord;
    const canvas = await ctx.canvas.createCanvas(BOARD_WIDTH * scale, BOARD_HEIGHT * scale);
    const context = canvas.getContext('2d');
    const boardImg = await ctx.canvas.loadImage(boardSkinImg);

    context.drawImage(boardImg, 0, 0, BOARD_WIDTH * scale, BOARD_HEIGHT * scale);

    const pieceImages = {};
    const pieceImagePromises = Object.keys(piecesImgResources).map(piece => {
      return ctx.canvas.loadImage(piecesImgResources[piece]).then(img => {
        pieceImages[piece] = img;
      });
    });

    await Promise.all(pieceImagePromises);

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = getPiece(board, [col, row]);
        if (piece === "") continue;

        const xPos = ((isFlipBoard ? 8 - col : col) * CELL_WIDTH + BOARD_PADDING - PIECE_SIZE / 2) * scale;
        const yPos = ((isFlipBoard ? 9 - row : row) * CELL_WIDTH + BOARD_PADDING - PIECE_SIZE / 2) * scale;

        const pieceImg = pieceImages[piece];
        context.drawImage(pieceImg, xPos, yPos, PIECE_SIZE * scale, PIECE_SIZE * scale);
      }
    }

    if (lastMove !== null) {
      let [start, end] = lastMove;
      let sx = start[0], sy = start[1], ex = end[0], ey = end[1];
      let startX = sx * CELL_WIDTH + ARROW_OFFSET
      let startY = sy * CELL_WIDTH + BOARD_PADDING
      let endX = ex * CELL_WIDTH + ARROW_OFFSET
      let endY = ey * CELL_WIDTH + BOARD_PADDING

      // 简单的箭头计算，略微调整终点以免完全覆盖棋子中心
      let dist = Math.sqrt((startX - endX) ** 2 + (startY - endY) ** 2)
      let adjustedEndX = startX + (endX - startX) * (dist - 30) / dist
      let adjustedEndY = startY + (endY - startY) * (dist - 30) / dist;

      await drawLineArrow(context, startX * scale, startY * scale, adjustedEndX * scale, adjustedEndY * scale, "rgba(128, 171, 69, 0.7)", 15 * scale)
    }

    if (moveList.length > 0) {
      const currentMoveId = moveList[moveList.length - 1].moveId;
      await ctx.database.set('cchess_game_records', { channelId }, { currentMoveId });
    }

    // 叠加外框时先输出无损的 png，最终再按配置的格式编码
    if (config.isChessImageWithOutlineEnabled) {
      return await createImage(await canvas.toBuffer('image/png'))
    } else {
      return await canvas.toBuffer(imageMimeType);
    }
  }


  async function drawLineArrow(ctx, fromX, fromY, toX, toY, color = "black", headSize = 20) {
    var angle = Math.atan2(toY - fromY, toX - fromX);
    var headAngle = 45 * Math.PI / 180;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    // 箭头主干

    // 计算箭头头部点
    var angle1 = angle + headAngle;
    var angle2 = angle - headAngle;

    var topX = toX - headSize * Math.cos(angle1);
    var topY = toY - headSize * Math.sin(angle1);
    var botX = toX - headSize * Math.cos(angle2);
    var botY = toY - headSize * Math.sin(angle2);

    // 绘制箭头（填充三角形）
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(topX, topY);
    ctx.lineTo(botX, botY);
    ctx.lineTo(toX, toY);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.fill();
    ctx.stroke();
  }

  interface Resource {
    prefix: string;
    type: string;
  }

  function loadPiecesImageResources(folder, format = "webp") {
    const imgResources: { [key: string]: Buffer } = {};
    const resources: Resource[] = [
      { prefix: 'w', type: 'rnbakcp' },
      { prefix: 'b', type: 'rnbakcp' },
    ];

    for (const { prefix, type } of resources) {
      const items = Array.from(type);
      for (const item of items) {
        const filename = `${prefix}${item}`;
        const imgFilePath = path.join(__dirname, 'assets', '棋子皮肤', folder, `${filename}.${format}`);
        const key = prefix === 'w' ? item.toUpperCase() : item;
        imgResources[key] = fs.readFileSync(imgFilePath);
      }
    }
    return imgResources;
  }

  function fenToBoard(fenString: string): string[][] {
    let fenParts = fenString.split(" ");
    let rows = fenParts[0].split("/");
    let emptyBoard = getEmptyBoard();
    let pieceTypes = "rnbakRNBAKCPcp".split("");
    let numbers = "123456789".split("");
    for (let rowIdx in rows) {
      let colIdx = 0;
      let currentRow = rows[rowIdx].split("");
      for (let i = 0; i < currentRow.length; i++) {
        if (pieceTypes.includes(currentRow[i])) {
          emptyBoard[rowIdx][colIdx] = currentRow[i];
          colIdx++;
        } else if (numbers.includes(currentRow[i])) {
          colIdx += Number(currentRow[i]);
        }
      }
    }
    return emptyBoard;
  }

  function getEmptyBoard(): string[][] {
    let emptyBoard = [];
    for (let row = 0; row < 10; row++) {
      let currentRow = [];
      for (let col = 0; col < 9; col++) {
        currentRow.push("");
      }
      emptyBoard.push(currentRow);
    }
    return emptyBoard;
  }

  function getPiece(board: string[][], position: number[]): string {
    if (position[0] < 0 || position[0] > 8 || position[1] < 0 || position[1] > 9) {
      return "invalid";
    } else {
      const piece = board[position[1]][position[0]];
      return piece ? piece : "";
    }
  }

  /** 各频道待撤回的上一条消息。 */
  const sentMessages: { [channelId: string]: string } = {};

  async function sendMessage(session: Session, message: string): Promise<void> {
    const { bot, channelId } = session;
    const [messageId] = await session.send(message);

    if (config.retractDelay === 0 || !messageId) return;

    // 仅保留最新一条消息，上一条延时撤回，避免刷屏
    const previousMessageId = sentMessages[channelId];
    sentMessages[channelId] = messageId;
    if (!previousMessageId) return;

    ctx.setTimeout(async () => {
      try {
        await bot.deleteMessage(channelId, previousMessageId);
      } catch (error) {
        logger.debug(error);
      }
    }, config.retractDelay * 1000);
  }
}
