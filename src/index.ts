import { Context, h, Schema, sleep, Session } from 'koishi'
import { } from '@koishijs/canvas'
import * as path from 'path';
import * as fs from 'fs';
import { } from 'koishi-plugin-markdown-to-image-service'

export const name = 'cchess'

export const usage = `## 使用

1. 安装 \`puppeteer\` 服务。
2. 设置指令别名。

## Q&A

1. 如何移动棋子？

- 纵线（炮二平五/炮8平5）或字母坐标（a0a1）。
- 详见 [中国象棋着法表示](https://www.xqbase.com/protocol/cchess_move.htm)。

## QQ 群

- 956758505`

export const inject = {
  required: ['database', 'puppeteer', 'canvas'],
  optional: ['markdownToImage'],
}

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
  isTextToImageConversionEnabled: boolean
}

const pieceSkins: string[] = ["棋弈无限图形棋子", "云库木制棋子", "刘炳森红黑牛角隶书棋子", "木制棋子", "本纹隶书棋子", "银灰将军体棋子", "棋弈无限红绿正棋子", "棋弈无限红绿棋子", "棋天大圣棋子", "棋者象棋棋子", "楷书玉石棋子", "水墨青瓷棋子", "牛皮纸华康金文棋子", "皮卡鱼棋子", "红蓝祥隶棋子", "红黑精典无阴影棋子", "红黑精典棋子", "行书玉石棋子", "象甲棋子", "金属棋子篆体棋子", "镌刻华彩棋子", "鹏飞红黑棋子", "鹏飞经典棋子", "鹏飞绿龙棋子", "龙腾四海棋子"];
const boardSkins: string[] = ["棋弈无限红绿棋盘", "一鸣惊人棋盘", "三星堆棋盘", "云库木制棋盘", "云心鹤眼棋盘", "兰亭集序无字棋盘", "兰亭集序棋盘", "凤舞九天棋盘", "卯兔添福棋盘", "叱咤风云棋盘", "君临天下棋盘", "壁画古梦棋盘", "大闹天宫棋盘", "天山共色棋盘", "女神之约棋盘", "小吕飞刀棋盘", "山海绘卷棋盘", "护眼绿棋盘", "星河璀璨棋盘", "木制棋盘", "本纹隶书白棋盘", "本纹隶书黑棋盘", "桃花源记棋盘", "棋天大圣棋盘", "棋天无大圣棋盘", "武侠江湖棋盘", "水墨青瓷棋盘", "清悠茶道棋盘", "游园惊梦棋盘", "牛转乾坤棋盘", "玉石太极棋盘", "皓月无痕棋盘", "皮卡鱼棋盘", "盲棋神迹棋盘", "空城计棋盘", "竹波烟雨棋盘", "经典木棋盘棋盘", "绿色棋盘", "象甲2023棋盘", "象甲征程棋盘", "象甲重燃棋盘", "金牛降世棋盘", "金虎贺岁棋盘", "金虎贺岁（王天一签名版）棋盘", "鎏金岁月棋盘", "霸王别姬棋盘", "鸿门宴棋盘", "鹏飞红黑棋盘", "鹏飞经典棋盘", "鹏飞绿龙棋盘", "龙腾天坛棋盘"];

export const Config: Schema<Config> = Schema.object({
  boardSkin: Schema.union(boardSkins).default('象甲2023棋盘').description(`棋盘皮肤。`),
  pieceSkin: Schema.union(pieceSkins).default('象甲棋子').description(`棋子皮肤。`),
  allowFreePieceMovementInHumanMachineMode: Schema.boolean().default(false).description(`是否允许在人机模式下所有用户都可以自由移动棋子，开启后可以不需要加入游戏直接开始玩人机模式。`),
  defaultEngineThinkingDepth: Schema.number().min(0).max(100).default(10).description(`默认引擎思考深度，最小为 0，最大为 100，越高 AI 棋力越强。由于 Nodejs 不支持 SIMD，所以不建议设置过高。`),
  defaultMaxLeaderboardEntries: Schema.number().min(0).default(10).description(`显示排行榜时默认的最大人数。`),
  retractDelay: Schema.number().min(0).default(0).description(`自动撤回等待的时间，单位是秒。值为 0 时不启用自动撤回功能。`),
  imgScale: Schema.number().min(1).default(1).description(`图片分辨率倍率。`),
  imageType: Schema.union(['png', 'jpeg', 'webp']).default('png').description(`发送的图片类型。`),
  isTextToImageConversionEnabled: Schema.boolean().default(false).description(`是否开启将文本转为图片的功能（可选），如需启用，需要启用 \`markdownToImage\` 服务。`),
  isChessImageWithOutlineEnabled: Schema.boolean().default(true).description(`是否为象棋图片添加辅助外框，关闭后可以显著提升图片速度，但无辅助外框，玩起来可能会比较累。`),
}) as any

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
  const engineSettings = {
    Threads: 1,
    Hash: 128,
    MultiPV: 1,
  }

  const thinkingSettings = {
    moveTime: 1,
    depth: config.defaultEngineThinkingDepth,
    enableHint: true,
  }

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
    let { channelId, content, userId, username } = session;
    const gameRecord = await getGameRecord(channelId);
    if (!gameRecord.isStarted) {
      return await next();
    }
    let playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });

    // 自动加入判断
    if (playerRecord.length === 0 && !config.allowFreePieceMovementInHumanMachineMode) {
      if (!(gameRecord.isEnginePlayRed || gameRecord.isEnginePlayBlack)) {
        return await next();
      } else {
        if (gameRecord.isEnginePlayRed) {
          await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: '黑方' })
          playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
        } else if (gameRecord.isEnginePlayBlack) {
          await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: '红方' })
          playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
        }
      }
    }

    if (playerRecord.length !== 0) {
      const turn = gameRecord.turn;
      const sideString = turn === 'w' ? '红方' : '黑方';
      if (playerRecord[0].side !== sideString) {
        return await next();
      }
    }

    if (!isMoveString(content) && !isValidFigureMoveName(content)) {
      return await next();
    }
    await session.execute(`cchess.移动 ${content}`);
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
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `**【@${username}】**\n游戏已经开始啦！\n${hImg}`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: true })
      }
      if (!choice) {
        choice = Math.random() < 0.5 ? '红方' : '黑方';
      } else if (choice.includes('红') && choice.includes('黑')) {
        return await sendMessage(session, `**【@${username}】**\n一次只能选择一方哦！`);
      } else if (choice.includes('红')) {
        choice = '红方';
      } else if (choice.includes('黑')) {
        choice = '黑方';
      } else {
        choice = Math.random() < 0.5 ? '红方' : '黑方';
      }

      const getPlayerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = getPlayerRecords.length;
      if (getPlayerRecord.length === 0) {
        await ctx.database.create('cchess_gaming_player_records', { channelId, userId, username, side: choice });
        return await sendMessage(session, `**【@${username}】**\n您加入游戏啦！\n您的队伍为：**【${choice}】**\n当前玩家人数为：**【${playersNum + 1}】**\n带“黑”或“红”加入游戏可以更换队伍哦~\n例如：\n- 加入指令 红\n- 加入指令 黑`);
      } else {
        await ctx.database.set('cchess_gaming_player_records', { channelId, userId }, { side: choice });
        return await sendMessage(session, `**【@${username}】**\n您已更换队伍为：**【${choice}】**\n当前玩家人数为：**【${playersNum}】**`);
      }
    })

  ctx.command('cchess.退出', '退出游戏')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏已经开始啦~\n不许逃跑哦！`);
      }
      await checkEngine(channelId);
      const getPlayerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = getPlayerRecords.length;
      if (getPlayerRecord.length === 0) {
        return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
      } else {
        await ctx.database.remove('cchess_gaming_player_records', { channelId, userId });
        return await sendMessage(session, `**【@${username}】**\n您已退出游戏！\n剩余玩家人数为：**【${playersNum - 1}】**`);
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
        return await sendMessage(session, `**【@${username}】**\n游戏已经开始啦！`);
      }
      await checkEngine(channelId);
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = getPlayerRecords.length;
      let redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
      let blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
      let message = '';
      if (playersNum < 2) {
        return await sendMessage(session, `**【@${username}】**\n当前玩家人数不足 2 人，无法开始游戏！`);
      } else {
        if (redPlayers.length !== 1 || blackPlayers.length !== 1) {
          const randomPlayer = getPlayerRecords[Math.floor(Math.random() * getPlayerRecords.length)];
          if (redPlayers.length < 1) {
            randomPlayer.side = '红方';
            message += `**【@${randomPlayer.username}】**被自动分配到红方。\n`;
          } else {
            randomPlayer.side = '黑方';
            message += `**【@${randomPlayer.username}】**被自动分配到黑方。\n`;
          }
          await ctx.database.set('cchess_gaming_player_records', {
            channelId,
            userId: randomPlayer.userId
          }, { side: randomPlayer.side });
          redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
          blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
        }
        message += `红方玩家（${redPlayers.length}）：\n${redPlayers.map(player => `**【@${player.username}】**`).join('\n')}\n\n`;
        message += `黑方玩家（${blackPlayers.length}）：\n${blackPlayers.map(player => `**【@${player.username}】**`).join('\n')}`;
        await ctx.database.set('cchess_game_records', { channelId }, { isStarted: true })
        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `### 游戏开始！\n${message}\n先手方为：**【${sideString}】**\n${hImg}`);
      }
    })

  ctx.command('cchess.开始.人机对战', '开始人机对战')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);

      if (gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏已经开始啦！`);
      }
      await checkEngine(channelId);

      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', { channelId })
      const playersNum = getPlayerRecords.length;
      let redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
      let blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
      let message = '';
      let AISide = '';
      if (playersNum < 1 && !config.allowFreePieceMovementInHumanMachineMode) {
        return await sendMessage(session, `**【@${username}】**\n当前玩家人数不足 1 人，无法开始游戏！`);
      } else {
        if (playersNum === 1) {
          if (getPlayerRecords[0].side === '红方') {
            await ctx.database.set('cchess_game_records', { channelId }, { isEnginePlayBlack: true });
            AISide = '黑方';
            message += `人类队伍为：**【红方】**\n`;
          } else {
            await ctx.database.set('cchess_game_records', { channelId }, { isEnginePlayRed: true });
            AISide = '红方';
            message += `人类队伍为：**【黑方】**\n`;
          }
        } else {
          if (redPlayers.length > blackPlayers.length) {
            await ctx.database.set('cchess_game_records', { channelId }, { isEnginePlayBlack: true });
            AISide = '黑方';
            message += `人类队伍为：**【红方】**\n`;
            for (const player of blackPlayers) {
              await ctx.database.set('cchess_gaming_player_records', { channelId, userId: player.userId }, { side: '红方' });
            }
          } else if (redPlayers.length < blackPlayers.length) {
            await ctx.database.set('cchess_game_records', { channelId }, { isEnginePlayRed: true });
            AISide = '红方';
            message += `人类队伍为：**【黑方】**\n`;
            for (const player of redPlayers) {
              await ctx.database.set('cchess_gaming_player_records', { channelId, userId: player.userId }, { side: '黑方' });
            }
          }
          if (redPlayers.length === blackPlayers.length) {
            const side = Math.random() < 0.5 ? '红方' : '黑方';
            message += `人类队伍为：**【${side}】**\n`;
            const computerSide = side === '红方' ? '黑方' : '红方';
            AISide = computerSide;
            await ctx.database.set('cchess_game_records', { channelId }, {
              isEnginePlayRed: computerSide === '红方',
              isEnginePlayBlack: computerSide === '黑方'
            });
            for (const player of getPlayerRecords) {
              await ctx.database.set('cchess_gaming_player_records', { channelId, userId: player.userId }, { side: side });
            }
          }
        }

        await ctx.database.set('cchess_game_records', { channelId }, { isStarted: true })

        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);

        if (AISide === sideString) {
          await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: true })
          await engineAction(channelId)
          while (true) {
            const gameRecord = await getGameRecord(channelId);
            if (!gameRecord.isAnalyzing) break;
            await sleep(500);
          }
        }

        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `### 游戏开始！\n${message}\n先手方为：**【${sideString}】**\n${hImg}`);
      }
    })

  ctx.command('cchess.结束', '强制结束游戏')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      await checkEngine(channelId);

      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏未开始哦！\n完全没必要强制结束嘛~`);
      } else {
        await endGame(channelId);
        return await sendMessage(session, `**【@${username}】**\n游戏已被强制结束！`);
      }
    })

  ctx.command('cchess.移动 <moveOperation:text>', '进行移动操作')
    .action(async ({ session }, moveOperation) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      if (!isMoveString(moveOperation) && !isValidFigureMoveName(moveOperation)) {
        return await sendMessage(session, `**【@${username}】**\n无效的移动！`);
      }
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      if (gameRecord.isRegretRequest) {
        return await sendMessage(session, `**【@${username}】**\n正在请求悔棋，等待回应中...`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      let playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        if (config.allowFreePieceMovementInHumanMachineMode) {
          const record = { channelId, userId, username, side: '' };
          if (gameRecord.isEnginePlayRed) record.side = '黑方';
          else if (gameRecord.isEnginePlayBlack) record.side = '红方';

          if (record.side) {
             await ctx.database.create('cchess_gaming_player_records', record)
             playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
          }
        } else {
          return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
        }
      }

      if (playerRecord.length === 0 || playerRecord[0].side !== sideString) {
        return await sendMessage(session, `**【@${username}】**\n还没轮到${sideString}走棋哦！\n当前走棋方为：**【${convertTurnToString(gameRecord.turn)}】**`);
      }

      await checkEngine(channelId);

      const board = gameRecord.board;
      let selectedPos: number[] = undefined;
      let newPos: number[] = undefined;

      // 处理中文纵线移动
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
        const duplicateMoveInfo = findMoveInfo(moveInfoList, moveOperation);
        if (!duplicateMoveInfo) {
          return await sendMessage(session, `**【@${username}】**\n无效的移动！`);
        } else {
          [selectedPos, newPos] = duplicateMoveInfo.moveCord;
        }
      } else {
        // 处理字母坐标移动
        [selectedPos, newPos] = moveStringToPos(moveOperation);
      }

      const [newCol, newRow] = newPos
      const piece = getPiece(board, selectedPos);
      const side = getSide(piece);
      const type = getType(piece);
      if (side !== gameRecord.turn) {
        return await sendMessage(session, `**【@${username}】**\n还没轮到${convertTurnToString(side)}走棋哦！\n当前走棋方为：**【${convertTurnToString(gameRecord.turn)}】**`);
      }
      const moveMap = getValidMoveMap(board, type, side, selectedPos);
      if (moveMap[newRow][newCol] !== 'go' && moveMap[newRow][newCol] !== 'eat') {
        return await sendMessage(session, `**【@${username}】**\n无效的移动！`);
      }

      await makeMove(channelId, selectedPos, newPos);
      await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: true })
      await engineAction(channelId)

      // 等待引擎简单校验（或 pondering）
      while (true) {
        const gameRecord = await getGameRecord(channelId);
        if (!gameRecord.isAnalyzing) break;
        await sleep(500);
      }

      const newGameRecord = await getGameRecord(channelId);
      if (newGameRecord.winSide !== '') {
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        await updatePlayerRecords(channelId, newGameRecord.winSide, newGameRecord.loseSide);
        await endGame(channelId);
        return await sendMessage(session, `**【@${username}】**\n### 绝杀！\n游戏结束！\n获胜方为：**【${convertTurnToString(newGameRecord.winSide)}】**\n${hImg}`);
      }

      // 人机模式下，机器走棋
      if (gameRecord.isEnginePlayRed || gameRecord.isEnginePlayBlack) {
        const gameRecordAfterMove = await getGameRecord(channelId);
        let { movesAfterLastEat, boardAfterLastEat, turnAfterLastEat } = gameRecordAfterMove;

        await ctx.database.set('cchess_game_records', { channelId }, { isAnalyzing: true })

        await sendCommand(channelId, "fen " + getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat));
        await go(channelId, 1e3 * thinkingSettings["movetime"], thinkingSettings["depth"], -1)

        while (true) {
          const rec = await getGameRecord(channelId);
          if (!rec.isAnalyzing) break;
          await sleep(500);
        }

        const engineResultRecord = await getGameRecord(channelId);
        if (engineResultRecord.winSide !== '') {
          const buffer = await drawChessBoard(channelId);
          const hImg = h.image(buffer, `image/${config.imageType}`)
          await updatePlayerRecords(channelId, engineResultRecord.winSide, engineResultRecord.loseSide);
          await endGame(channelId);
          return await sendMessage(session, `**【@${username}】**\n### 绝杀！\n游戏结束！\n获胜方为：**【${convertTurnToString(engineResultRecord.winSide)}】**\n${hImg}`);
        }
      }

      const buffer = await drawChessBoard(channelId);
      const hImg = h.image(buffer, `image/${config.imageType}`)
      return await sendMessage(session, `${hImg}`);
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
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);

      if (gameRecord.isRegretRequest) {
        return await sendMessage(session, `**【@${username}】**\n已经有悔棋请求了！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `**【@${username}】**\n对局分析中，请稍后再试！`);
      }
      if (gameRecord.moveList.length < 1) {
        return await sendMessage(session, `**【@${username}】**\n当前无法悔棋！`);
      }
      if (gameRecord.isEnginePlayBlack || gameRecord.isEnginePlayRed) {
        await undoMove(channelId);
        await undoMove(channelId);
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `**【@${username}】**\n悔棋成功！\n${hImg}`);
      } else {
        if (playerRecord[0].side === sideString) {
          return await sendMessage(session, `**【@${username}】**\n现在轮到你下棋，不可悔棋！`);
        } else {
          await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: true })
          return await sendMessage(session, `**【@${username}】**\n请求悔棋中...\n请对方输入相关指令选择同意或拒绝！`);
        }
      }
    })

  ctx.command('cchess.悔棋.同意', '同意悔棋')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);

      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `**【@${username}】**\n对局分析中，请稍后再试！`);
      }
      if (!gameRecord.isRegretRequest) {
        return await sendMessage(session, `**【@${username}】**\n当前无悔棋请求！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `**【@${username}】**\n您所在的队伍不能做出选择！`);
      } else {
        await undoMove(channelId);
        await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: false })
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `**【@${username}】**\n由于您同意了对方的悔棋请求！\n悔棋成功！\n${hImg}`);
      }
    })

  ctx.command('cchess.悔棋.拒绝', '拒绝悔棋')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);

      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `**【@${username}】**\n对局分析中，请稍后再试！`);
      }
      if (!gameRecord.isRegretRequest) {
        return await sendMessage(session, `**【@${username}】**\n当前无悔棋请求！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `**【@${username}】**\n您所在的队伍不能做出选择！`);
      } else {
        await ctx.database.set('cchess_game_records', { channelId }, { isRegretRequest: false })
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `**【@${username}】**\n由于您拒绝了对方的悔棋请求！\n悔棋失败，游戏继续进行！\n${hImg}`);
      }
    })

  ctx.command('cchess.认输', '认输')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);

      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `**【@${username}】**\n对局分析中，请稍后再试！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', { channelId, userId });
      if (playerRecord.length === 0) {
        return await sendMessage(session, `**【@${username}】**\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `**【@${username}】**\n还没轮到${sideString}走棋哦！\n当前走棋方为：**【${convertTurnToString(gameRecord.turn)}】**`);
      }
      const anotherSideString = convertTurnToString(turn === 'w' ? 'b' : 'w');
      await updatePlayerRecords(channelId, turn === 'w' ? 'b' : 'w', turn);
      await endGame(channelId);
      return await sendMessage(session, `**【@${username}】**\n认输成功！\n游戏结束！\n获胜方为：**【${anotherSideString}】**`);

    })

  ctx.command('cchess.查看云库残局', '云库残局指令帮助')
    .action(async ({ session }) => {
      await session.execute(`cchess.查看云库残局 -h`)
    })

  ctx.command('cchess.查看云库残局.DTM统计', '云库残局DTM统计')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `**【@${username}】**\nhttps://www.chessdb.cn/egtb_info_dtm.html`);
    })

  ctx.command('cchess.查看云库残局.DTC统计', '云库残局DTM统计')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `**【@${username}】**\nhttps://www.chessdb.cn/egtb_info.html`);
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
        return await sendMessage(session, `**【@${username}】**\n游戏已经开始啦~\n不可编辑棋盘！`);
      }
      await checkEngine(channelId);

      if (!fen || !isValidateFen(fen)) {
        return await sendMessage(session, `**【@${username}】**\n无效的FEN串！`);
      }

      const t = fen
      const newBoard = fenToBoard(t)
      const newTurn = "w"
      const newStartFen = t.includes("moves") ? t.split("moves")[0] : t;

      await ctx.database.set('cchess_game_records', { channelId }, {
        turn: newTurn,
        board: newBoard,
        moveList: [],
        movesAfterLastEat: [],
        boardAfterLastEat: fenToBoard(t),
        turnAfterLastEat: fenToTurn(t),
        lastMove: null,
        isHistoryMode: false,
        originalState: {},
        startFen: newStartFen
      })
      await parseFen(channelId, t)
      return await sendMessage(session, `**【@${username}】**\n棋盘编辑成功！`);
    })

  ctx.command('cchess.编辑棋盘.导出', '导出FEN串')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `**【@${username}】**\n游戏还未开始哦！`);
      }
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `**【@${username}】**\n对局分析中，请稍后再试！`);
      }
      await checkEngine(channelId);

      const fenWithFullMove = await getFenWithFullMove(channelId);
      return await sendMessage(session, `**【@${username}】**\n${fenWithFullMove}`);
    })

  ctx.command('cchess.编辑棋盘.使用方法', '查看编辑棋盘的fen使用方法')
    .action(async ({ session }) => {
      const { username, userId, channelId } = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `**【@${username}】**\nhttps://www.xqbase.com/protocol/cchess_fen.htm`);
    })

  ctx.command('cchess.排行榜.总胜场 [number:number]', '查看玩家总胜场排行榜')
    .action(async ({ session }, number = config.defaultMaxLeaderboardEntries) => {
      const { userId, username } = session
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return '请输入大于等于 0 的数字作为排行榜的参数。';
      }
      return await getLeaderboard(session, 'win', '玩家总胜场排行榜', number);
    });

  ctx.command('cchess.排行榜.总输场 [number:number]', '查看玩家总输场排行榜')
    .action(async ({ session }, number = config.defaultMaxLeaderboardEntries) => {
      const { userId, username } = session
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return '请输入大于等于 0 的数字作为排行榜的参数。';
      }
      return await getLeaderboard(session, 'lose', '查看玩家总输场排行榜', number);
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
        return sendMessage(session, `**【@${session.username}】**\n查询对象：${username}\n无任何游戏记录。`)
      }
      const { win, lose } = targetUserRecord[0]
      return sendMessage(session, `**【@${session.username}】**\n查询对象：${username}\n总胜场次数为：${win} 次\n总输场次数为：${lose} 次\n`)
    });

  // --- 辅助函数 ---

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

  async function updatePlayerRecords(channelId, winSide, loseSide) {
    const winnerPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {
      channelId,
      side: convertTurnToString(winSide)
    });

    const loserPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {
      channelId,
      side: convertTurnToString(loseSide)
    });

    for (const winnerPlayerRecord of winnerPlayerRecords) {
      const playerRecord = await ctx.database.get('cchess_player_records', { userId: winnerPlayerRecord.userId });
      await ctx.database.set('cchess_player_records', { userId: winnerPlayerRecord.userId }, { win: playerRecord[0].win + 1 });
    }

    for (const loserPlayerRecord of loserPlayerRecords) {
      const playerRecord = await ctx.database.get('cchess_player_records', { userId: loserPlayerRecord.userId });
      await ctx.database.set('cchess_player_records', { userId: loserPlayerRecord.userId }, { lose: playerRecord[0].lose + 1 });
    }
  }

  async function getLeaderboard(session: Session, sortField: string, title: string, number: number) {
    const getPlayers: PlayerRecord[] = await ctx.database.get('cchess_player_records', {})
    const sortedPlayers = getPlayers.sort((a, b) => b[sortField] - a[sortField])
    const topPlayers = sortedPlayers.slice(0, number)

    let result = `### ${title}：\n`;
    topPlayers.forEach((player, index) => {
      result += `${index + 1}. ${player.username}：${player[sortField]} 次\n`
    })
    return await sendMessage(session, result);
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

  async function checkEngine(channelId: string) {
    if (!engines[channelId]) {
      await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: false })
      await initEngine(channelId);
      while (true) {
        const gameRecord = await getGameRecord(channelId);
        if (gameRecord.isEngineReady) break;
        await sleep(500);
      }
    }
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
    let parts = fen.split(" ");
    let boardPart = parts[0];
    let turnPart = parts[1];
    if (!"rwb".includes(turnPart.toLowerCase())) return false;
    let rows = boardPart.split("/");
    if (rows.length != 10) return false;
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      let count = 0;
      for (let j = 0; j < row.length; j++) {
        let char = row.charAt(j);
        if (char >= "0" && char <= "9") {
          count += parseInt(char);
        } else {
          count++;
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

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj))
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
      fen, turn, board, moveList, movesAfterLastEat, boardAfterLastEat, turnAfterLastEat, lastMove, isHistoryMode, originalState, startFen
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
    boardAfterLastEat = deepCopy(fenToBoard(fen));
    turnAfterLastEat = turn;
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


  async function go(channelId, movetime = -1, depth = -1, nodes = -1) {
    let cmd = "go";
    if (movetime > 0) cmd += " movetime " + movetime;
    if (depth > 0) cmd += " depth " + depth;
    if (nodes > 0) cmd += " nodes " + nodes;
    await sendCommand(channelId, cmd);
    return true;
  }

  async function engineAction(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let { movesAfterLastEat, boardAfterLastEat, turnAfterLastEat } = gameRecord;
    await sendCommand(channelId, "fen " + getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat));
    await go(channelId, 1e3 * thinkingSettings["movetime"], thinkingSettings["depth"], -1)
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

  async function sendCommand(channelId, cmd) {
    const gameRecord = await getGameRecord(channelId);
    await checkEngine(channelId);
    if (engines[channelId] && !gameRecord.isEngineReady) {
      await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: true })
    }

    if (engines[channelId] || "uci" == cmd) {
      engines[channelId].send_command(cmd)
    } else {
      await sendCommand(channelId, cmd);
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

  async function engineMessageHandler(channelId, message) {
    const { command, wasmType, origin } = message;

    if (!engines[channelId]) {
      engines[channelId] = null
    }

    if (command !== undefined) {
      engines[channelId].send_command(command);
    } else if (wasmType !== undefined) {
      const wasmOrigin = origin;
      const wasmScriptPath = path.join(wasmOrigin, 'assets', 'wasm', 'pikafish.js');
      const wasmBinaryPath = path.join(wasmOrigin, 'assets', 'wasm', 'pikafish.wasm'); // 显式指定 wasm 路径

      const Pikafish = require(wasmScriptPath);

      // 核心修改：手动读取 .wasm 文件为 Buffer
      // 这样可以避免 emscripten 内部的 fetch 失败或路径解析错误
      let wasmBinary;
      try {
        wasmBinary = fs.readFileSync(wasmBinaryPath);
      } catch (e) {
        console.error(`无法读取 WASM 文件，请检查路径: ${wasmBinaryPath}`, e);
        return; // 终止
      }

      const instance = await Pikafish({
        // 显式传入二进制数据
        wasmBinary: wasmBinary,

        locateFile: (file) => {
          // 这里的逻辑主要用于加载 .data 或 .nnue 文件（如果有）
          // wasm 文件已经被 wasmBinary 接管，不会走这里了
          if (file.endsWith(".data")) {
            return path.join(wasmOrigin, 'assets', 'wasm', 'data', file);
          } else if (file.endsWith(".wasm")) {
              // 兜底，虽然理论上不会用到
              return path.join(wasmOrigin, 'assets', 'wasm', file);
          } else {
            return path.join(wasmOrigin, 'assets', 'wasm', file);
          }
        },
        // 打印错误日志以便调试
        print: (text) => { console.log("[Pikafish stdout]:", text) },
        printErr: (text) => { console.error("[Pikafish stderr]:", text) },
        setStatus: (status) => { }
      });

      engines[channelId] = instance;
      engines[channelId].read_stdout = async (stdout) => {
        await receiveOutput(channelId, stdout);
      };

      await ctx.database.set('cchess_game_records', { channelId }, { isEngineReady: true })
      await sleep(100)
      await sendCommand(channelId, "uci");
      await sleep(100)
      await setOptionList(channelId, engineSettings);
    }
  }


  async function initEngine(channelId) {
    await engineMessageHandler(channelId, { command: undefined, wasmType: 'single', origin: __dirname });
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

    return canvas.toBuffer('image/png');
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

    if (config.isChessImageWithOutlineEnabled) {
      return await createImage(await canvas.toBuffer('image/png'))
    } else {
      return await canvas.toBuffer('image/png');
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

  let sentMessages = [];

  async function sendMessage(session: Session, message: string): Promise<void> {
      const { bot, channelId } = session;
      let messageId;

      if (config.isTextToImageConversionEnabled) {
        const imageBuffer = await ctx.markdownToImage.convertToImage(message);
        [messageId] = await session.send(h.image(imageBuffer, `image/${config.imageType}`));
      } else {
        // 移除 Markdown 格式以便纯文本输出
        let plainText = message
          // 移除加粗 **text** -> text
          .replace(/\*\*(.*?)\*\*/g, '$1')
          // 移除标题 ### Title -> Title
          .replace(/^#+\s*/gm, '')
          // 移除链接 [text](url) -> text
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

        [messageId] = await session.send(plainText);
      }

      if (config.retractDelay === 0) return;
      sentMessages.push(messageId);

      if (sentMessages.length > 1) {
        const oldestMessageId = sentMessages.shift();
        setTimeout(async () => {
          try {
            await bot.deleteMessage(channelId, oldestMessageId);
          } catch (e) {}
        }, config.retractDelay * 1000);
      }
    }
}
