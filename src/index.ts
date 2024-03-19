import {Context, h, Schema, sleep} from 'koishi'
import {} from '@koishijs/canvas'
import * as path from 'path';
import * as fs from 'fs';
import {} from 'koishi-plugin-markdown-to-image-service'

export const name = 'cchess'
export const usage = `## 🌈 使用

- 建议自行添加别名，如 \`cc\` 等更方便的指令。
- 请安装并启用所需服务，\`canvas\` 服务可使用 \`puppeteer\` 提供。
- 支持使用中国象棋纵线（炮二平五/炮8平5）和字母坐标（a0a1）进行移动。[了解详情 - 中国象棋着法表示](https://www.xqbase.com/protocol/cchess_move.htm)

## 🌼 指令

- \`cchess.退出\`: 退出当前游戏。
- \`cchess.结束\`: 强制结束本局游戏。
- \`cchess.认输\`: 认输结束本局游戏。
- \`cchess.排行榜.总胜/输场\`: 请求悔棋操作。
- \`cchess.开始.人人对战\`: 开始人人对战模式。
- \`cchess.开始.人机对战\`: 开始人机对战模式。
- \`cchess.悔棋.请求/同意/拒绝\`: 请求悔棋操作。
- \`cchess.加入 [红/黑]\`: 加入游戏，可选红/黑方。
- \`cchess.移动 [纵线/字母坐标]\`: 通过指令移动棋子。
- \`cchess.查看云库残局.DTM统计/DTC统计\`: 查看云库残局统计。
- \`cchess.查询玩家记录 [@某人 或 不填则查自己]\`: 查询玩家记录。
- \`cchess.编辑棋盘.导入/导出/使用方法\`: 导入/导出棋盘状态与fen使用方法。`
export const inject = {
  // required: ['monetary', 'database', 'puppeteer', 'canvas'],
  required: ['database', 'puppeteer', 'canvas'],
  optional: ['markdownToImage'],
}

// pzx* pz*
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

const pieceSkins: string[] = ["云库木制棋子", "刘炳森红黑牛角隶书棋子", "木制棋子", "本纹隶书棋子", "银灰将军体棋子", "棋弈无限红绿正棋子", "棋弈无限红绿棋子", "棋天大圣棋子", "棋者象棋棋子", "楷书玉石棋子", "水墨青瓷棋子", "牛皮纸华康金文棋子", "皮卡鱼棋子", "红蓝祥隶棋子", "红黑精典无阴影棋子", "红黑精典棋子", "行书玉石棋子", "象甲棋子", "金属棋子篆体棋子", "镌刻华彩棋子", "鹏飞红黑棋子", "鹏飞经典棋子", "鹏飞绿龙棋子", "龙腾四海棋子"];
const boardSkins: string[] = ["棋弈无限红绿棋盘", "一鸣惊人棋盘", "三星堆棋盘", "云库木制棋盘", "云心鹤眼棋盘", "兰亭集序无字棋盘", "兰亭集序棋盘", "凤舞九天棋盘", "卯兔添福棋盘", "叱咤风云棋盘", "君临天下棋盘", "壁画古梦棋盘", "大闹天宫棋盘", "天山共色棋盘", "女神之约棋盘", "小吕飞刀棋盘", "山海绘卷棋盘", "护眼绿棋盘", "星河璀璨棋盘", "木制棋盘", "本纹隶书白棋盘", "本纹隶书黑棋盘", "桃花源记棋盘", "棋天大圣棋盘", "棋天无大圣棋盘", "武侠江湖棋盘", "水墨青瓷棋盘", "清悠茶道棋盘", "游园惊梦棋盘", "牛转乾坤棋盘", "玉石太极棋盘", "皓月无痕棋盘", "皮卡鱼棋盘", "盲棋神迹棋盘", "空城计棋盘", "竹波烟雨棋盘", "经典木棋盘棋盘", "绿色棋盘", "象甲2023棋盘", "象甲征程棋盘", "象甲重燃棋盘", "金牛降世棋盘", "金虎贺岁棋盘", "金虎贺岁（王天一签名版）棋盘", "鎏金岁月棋盘", "霸王别姬棋盘", "鸿门宴棋盘", "鹏飞红黑棋盘", "鹏飞经典棋盘", "鹏飞绿龙棋盘", "龙腾天坛棋盘"];
export const Config: Schema<Config> = Schema.object({
  boardSkin: Schema.union(boardSkins).default('象甲2023棋盘').description(`棋盘皮肤。`),
  pieceSkin: Schema.union(pieceSkins).default('象甲棋子').description(`棋子皮肤。`),
  allowFreePieceMovementInHumanMachineMode: Schema.boolean().default(false).description(` 是否允许在人机模式下自由移动棋子，开启后可以不需要加入游戏直接开始玩人机模式。`),
  defaultEngineThinkingDepth: Schema.number().min(0).max(100).default(10).description(`默认引擎思考深度，越高 AI 棋力越强。由于 Nodejs 不支持 SIMD，所以不建议设置过高。`),
  defaultMaxLeaderboardEntries: Schema.number().min(0).default(10).description(`显示排行榜时默认的最大人数。`),
  retractDelay: Schema.number().min(0).default(0).description(`自动撤回等待的时间，单位是秒。值为 0 时不启用自动撤回功能。`),
  imgScale: Schema.number().min(1).default(1).description(`图片分辨率倍率。`),
  imageType: Schema.union(['png', 'jpeg', 'webp']).default('png').description(`发送的图片类型。`),
  isTextToImageConversionEnabled: Schema.boolean().default(false).description(`是否开启将文本转为图片的功能（可选），如需启用，需要启用 \`markdownToImage\` 服务。`),
  isChessImageWithOutlineEnabled: Schema.boolean().default(true).description(`是否为象棋图片添加辅助外框，关闭后可以显著提升图片速度，但无辅助外框，玩起来可能会比较累。`),
}) as any

// smb*
declare module 'koishi' {
  interface Tables {
    cchess_game_records: GameRecord
    cchess_gaming_player_records: GamingPlayer
    cchess_player_records: PlayerRecord
    monetary: Monetary
  }
}

// jk*
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
  // lastPV: any
  isDraw: boolean
  winSide: string
  startFen: string
  loseSide: string
  channelId: string
  board: string[][]
  originalState: any
  isStarted: boolean
  ponderHint: any[][]
  // bestMoveHint: any
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
  // multiPvInfoBuffer: any
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
  // cl*
  const engines: { [channelId: string]: any } = {};
  // fzy*

  ctx.on('dispose', () => {
    const channelIds = Object.keys(engines);

    channelIds.forEach((channelId) => {
      if (engines[channelId]) {
        engines[channelId].send_command('quit');
        engines[channelId] = null;
      }
    });
  });

  const we = 54 // 棋子宽度
  const pe = 33
  const Pe = 33 // 棋盘边距
  const Be = 50 // 棋子显示大小
  const Ie = 54
  const Me = 500
  const ye = 550
  const ze = 500
  const ke = 120

  const weight = 500
  const height = 550
  const scale = config.imgScale
  const isFlipBoard = false
  const engineSettings = {
    Threads: 1,
    Hash: 128,
    MultiPV: 1,
    // "Skill Level": 20,
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

  // tzb*
  ctx.model.extend('cchess_game_records', {
    id: 'unsigned',
    channelId: 'string',
    isStarted: 'boolean',
    isFlipBoard: 'boolean',
    isHistoryMode: 'boolean',
    turn: {type: 'string', initial: 'w'},
    moveList: {type: 'json', initial: []},
    isDraw: {type: 'boolean', initial: false},
    winSide: {type: 'string', initial: ''},
    loseSide: {type: 'string', initial: ''},
    // lastPV: {type: 'json', initial: null},
    originalState: {type: 'json', initial: {}},
    thinkingDetail: {type: 'json', initial: []},
    currentMoveId: {type: 'string', initial: ''},
    thinkingSide: {type: 'string', initial: 'w'},
    movesAfterLastEat: {type: 'json', initial: []},
    isAnalyzing: {type: 'boolean', initial: false},
    turnAfterLastEat: {type: 'string', initial: 'w'},
    isEngineReady: {type: 'boolean', initial: false},
    // multiPvInfoBuffer: {type: 'json', initial: {}},
    isEnginePlayRed: {type: 'boolean', initial: false},
    isEngineAnalyze: {type: 'boolean', initial: false},
    isRegretRequest: {type: 'boolean', initial: false},
    lastMove: {type: 'json', initial: [[0, 0], [0, 0]]},
    isEnginePlayBlack: {type: 'boolean', initial: false},
    ponderHint: {type: 'json', initial: [[0, 0], [0, 0]]},
    // bestMoveHint: {type: 'json', initial: [[0, 0], [0, 0]]},
    fen: {type: 'string', initial: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'},
    startFen: {type: 'string', initial: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'},
    board: {type: 'json', initial: fenToBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w')},
    boardAfterLastEat: {
      type: 'json',
      initial: fenToBoard('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w')
    },
    moveTreePtr: {
      type: 'json',
      initial: {moveId: '', fen: '', side: '', moveCord: [[0, 0], [0, 0]], move: '', chnMoveName: '', next: null}
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

  // zjj*
  ctx.middleware(async (session, next) => {
    let {channelId, content, userId, username} = session;
    const gameRecord = await getGameRecord(channelId);
    if (!gameRecord.isStarted) {
      return await next();
    }
    let playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
    if (playerRecord.length === 0 && !config.allowFreePieceMovementInHumanMachineMode) {
      if (!(gameRecord.isEnginePlayRed || gameRecord.isEnginePlayBlack)) {
        return await next();
      } else {
        if (gameRecord.isEnginePlayRed) {
          await ctx.database.create('cchess_gaming_player_records', {channelId, userId, username, side: '黑方'})
          playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
        } else if (gameRecord.isEnginePlayBlack) {
          await ctx.database.create('cchess_gaming_player_records', {channelId, userId, username, side: '红方'})
          playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
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

  // bz*
  ctx.command('cchess', '中国象棋游戏指令帮助')
    .action(async ({session}) => {
      await session.execute(`cchess -h`)
    })

  // jr* j*
  ctx.command('cchess.加入 [choice:string]', '加入游戏并选择红黑方')
    .action(async ({session}, choice) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `【@${username}】\n游戏已经开始啦！\n${hImg}`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (!choice) {
        choice = Math.random() < 0.5 ? '红方' : '黑方';
      } else if (choice.includes('红') && choice.includes('黑')) {
        return await sendMessage(session, `【@${username}】\n一次只能选择一方哦！`);
      } else if (choice.includes('红')) {
        choice = '红方';
      } else if (choice.includes('黑')) {
        choice = '黑方';
      } else {
        choice = Math.random() < 0.5 ? '红方' : '黑方';
      }

      const getPlayerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {channelId})
      const playersNum = getPlayerRecords.length;
      if (getPlayerRecord.length === 0) {
        await ctx.database.create('cchess_gaming_player_records', {channelId, userId, username, side: choice});
        return await sendMessage(session, `【@${username}】\n您加入游戏啦！\n您的队伍为：【${choice}】\n当前玩家人数为：【${playersNum + 1}】\n带“黑”或“红”加入游戏可以更换队伍哦~\n例如：\n- 加入指令 红\n- 加入指令 黑`);
      } else {
        await ctx.database.set('cchess_gaming_player_records', {channelId, userId}, {side: choice});
        return await sendMessage(session, `【@${username}】\n您已更换队伍为：【${choice}】\n当前玩家人数为：【${playersNum}】`);
      }
    })

  // tc* q*
  ctx.command('cchess.退出', '退出游戏')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏已经开始啦~\n不许逃跑哦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      const getPlayerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {channelId})
      const playersNum = getPlayerRecords.length;
      if (getPlayerRecord.length === 0) {
        return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
      } else {
        await ctx.database.remove('cchess_gaming_player_records', {channelId, userId});
        return await sendMessage(session, `【@${username}】\n您已退出游戏！\n剩余玩家人数为：【${playersNum - 1}】`);
      }
    })

  // ksbz* ks*
  ctx.command('cchess.开始', '开始游戏指令帮助')
    .action(async ({session}) => {
      await session.execute(`cchess.开始 -h`)
    })

  // rrdz*
  ctx.command('cchess.开始.人人对战', '开始人人对战')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)

      const gameRecord = await getGameRecord(channelId);

      if (gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏已经开始啦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {channelId})
      const playersNum = getPlayerRecords.length;
      let redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
      let blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
      let message = '';
      if (playersNum < 2) {
        return await sendMessage(session, `【@${username}】\n当前玩家人数不足 2 人，无法开始游戏！`);
      } else {
        if (redPlayers.length !== 1 || blackPlayers.length !== 1) {
          const randomPlayer = getPlayerRecords[Math.floor(Math.random() * getPlayerRecords.length)];
          if (redPlayers.length < 1) {
            randomPlayer.side = '红方';
            message += `【@${randomPlayer.username}】被自动分配到红方。\n`;
          } else {
            randomPlayer.side = '黑方';
            message += `【@${randomPlayer.username}】被自动分配到黑方。\n`;
          }
          await ctx.database.set('cchess_gaming_player_records', {
            channelId,
            userId: randomPlayer.userId
          }, {side: randomPlayer.side});
          redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
          blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
        }
        message += `红方玩家（${redPlayers.length}）：\n${redPlayers.map(player => `【@${player.username}】`).join('\n')}\n\n`;
        message += `黑方玩家（${blackPlayers.length}）：\n${blackPlayers.map(player => `【@${player.username}】`).join('\n')}`;
        await ctx.database.set('cchess_game_records', {channelId}, {
          isStarted: true,
        })
        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `游戏开始！\n${message}\n先手方为：【${sideString}】\n${hImg}`);
      }
    })

  // rjdz*
  ctx.command('cchess.开始.人机对战', '开始人机对战')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);

      if (gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏已经开始啦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      const getPlayerRecords = await ctx.database.get('cchess_gaming_player_records', {channelId})
      const playersNum = getPlayerRecords.length;
      let redPlayers = getPlayerRecords.filter((player) => player.side === '红方');
      let blackPlayers = getPlayerRecords.filter((player) => player.side === '黑方');
      let message = '';
      let AISide = '';
      if (playersNum < 1 && !config.allowFreePieceMovementInHumanMachineMode) {
        return await sendMessage(session, `【@${username}】\n当前玩家人数不足 1 人，无法开始游戏！`);
      } else {
        if (playersNum === 1) {
          if (getPlayerRecords[0].side === '红方') {
            await ctx.database.set('cchess_game_records', {channelId}, {isEnginePlayBlack: true});
            AISide = '黑方';
            message += `人类队伍为：【红方】\n`;
          } else {
            await ctx.database.set('cchess_game_records', {channelId}, {isEnginePlayRed: true});
            AISide = '红方';
            message += `人类队伍为：【黑方】\n`;
          }
        } else {
          if (redPlayers.length > blackPlayers.length) {
            await ctx.database.set('cchess_game_records', {channelId}, {isEnginePlayBlack: true});
            AISide = '黑方';
            message += `人类队伍为：【红方】\n`;
            for (const player of blackPlayers) {
              await ctx.database.set('cchess_gaming_player_records', {
                channelId,
                userId: player.userId
              }, {side: '红方'});
            }
          } else if (redPlayers.length < blackPlayers.length) {
            await ctx.database.set('cchess_game_records', {channelId}, {isEnginePlayRed: true});
            AISide = '红方';
            message += `人类队伍为：【黑方】\n`;
            for (const player of redPlayers) {
              await ctx.database.set('cchess_gaming_player_records', {
                channelId,
                userId: player.userId
              }, {side: '黑方'});
            }
          }
          if (redPlayers.length === blackPlayers.length) {
            const side = Math.random() < 0.5 ? '红方' : '黑方';
            message += `人类队伍为：【${side}】\n`;
            const computerSide = side === '红方' ? '黑方' : '红方';
            AISide = computerSide;
            await ctx.database.set('cchess_game_records', {channelId}, {
              isEnginePlayRed: computerSide === '红方',
              isEnginePlayBlack: computerSide === '黑方'
            });
            for (const player of getPlayerRecords) {
              await ctx.database.set('cchess_gaming_player_records', {channelId, userId: player.userId}, {side: side});
            }
          }
        }

        await ctx.database.set('cchess_game_records', {channelId}, {
          isStarted: true,
        })

        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);

        if (AISide === sideString) {
          await ctx.database.set('cchess_game_records', {channelId}, {
            isAnalyzing: true,
          })
          await engineAction(channelId)
          while (true) {
            const gameRecord = await getGameRecord(channelId);
            if (!gameRecord.isAnalyzing) {
              break;
            }
            await sleep(500);
          }
        }

        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `游戏开始！\n${message}\n先手方为：【${sideString}】\n${hImg}`);
      }
    })

  // js*
  ctx.command('cchess.结束', '强制结束游戏')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏未开始哦！\n完全没必要强制结束嘛~`);
      } else {
        await endGame(channelId);
        return await sendMessage(session, `【@${username}】\n游戏已被强制结束！`);
      }
    })

  // yd*
  ctx.command('cchess.移动 <moveOperation:text>', '进行移动操作')
    .action(async ({session}, moveOperation) => {
        const {username, userId, channelId} = session
        await updateNameInPlayerRecord(userId, username)
        if (!isMoveString(moveOperation) && !isValidFigureMoveName(moveOperation)) {
          return await sendMessage(session, `【@${username}】\n无效的移动！`);
        }
        const gameRecord = await getGameRecord(channelId);
        if (!gameRecord.isStarted) {
          return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
        }
        if (gameRecord.isRegretRequest) {
          return await sendMessage(session, `【@${username}】\n正在请求悔棋，等待回应中...`);
        }
        const turn = gameRecord.turn;
        const sideString = convertTurnToString(turn);
        let playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
        if (playerRecord.length === 0) {
          if (config.allowFreePieceMovementInHumanMachineMode) {
            if (gameRecord.isEnginePlayRed) {
              await ctx.database.create('cchess_gaming_player_records', {channelId, userId, username, side: '黑方'})
              playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
            } else if (gameRecord.isEnginePlayBlack) {
              await ctx.database.create('cchess_gaming_player_records', {channelId, userId, username, side: '红方'})
              playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
            }
          } else {
            return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
          }
        }

        if (playerRecord[0].side !== sideString) {
          return await sendMessage(session, `【@${username}】\n还没轮到${sideString}走棋哦！\n当前走棋方为：【${convertTurnToString(gameRecord.turn)}】`);
        }

        await checkEngine(channelId);
        if (engines[channelId] && !gameRecord.isEngineReady) {
          await ctx.database.set('cchess_game_records', {channelId}, {
            isEngineReady: true
          })
        }

        const board = gameRecord.board;
        let selectedPos = undefined;
        let newPos = undefined;

        // 中文纵线
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
            return await sendMessage(session, `【@${username}】\n无效的移动！`);
          } else {
            [selectedPos, newPos] = duplicateMoveInfo.moveCord;
          }
        } else {
          // 字母坐标
          // [selectedPos, newPos] = moveStringToMove(moveOperation);
          [selectedPos, newPos] = moveStringToPos(moveOperation);
        }

        const [newCol, newRow] = newPos
        const piece = getPiece(board, selectedPos);
        const side = getSide(piece);
        const type = getType(piece);
        if (side !== gameRecord.turn) {
          return await sendMessage(session, `【@${username}】\n还没轮到${convertTurnToString(side)}走棋哦！\n当前走棋方为：【${convertTurnToString(gameRecord.turn)}】`);
        }
        const moveMap = getValidMoveMap(board, type, side, selectedPos);
        if (moveMap[newRow][newCol] !== 'go' && moveMap[newRow][newCol] !== 'eat') {
          return await sendMessage(session, `【@${username}】\n无效的移动！`);
        }
        await makeMove(channelId, selectedPos, newPos);
        await ctx.database.set('cchess_game_records', {channelId}, {
          isAnalyzing: true
        })
        await engineAction(channelId)
        while (true) {
          const gameRecord = await getGameRecord(channelId);
          if (!gameRecord.isAnalyzing) {
            break;
          }
          await sleep(500);
        }
        const newGameRecord = await getGameRecord(channelId);
        if (newGameRecord.winSide !== '') {
          const buffer = await drawChessBoard(channelId);
          const hImg = h.image(buffer, `image/${config.imageType}`)

          await updatePlayerRecords(channelId, newGameRecord.winSide, newGameRecord.loseSide);

          await endGame(channelId);
          return await sendMessage(session, `【@${username}】\n绝杀！\n游戏结束！\n获胜方为：【${convertTurnToString(newGameRecord.winSide)}】\n${hImg}`);
        }

        if (gameRecord.isEnginePlayRed || gameRecord.isEnginePlayBlack) {
          // 分析人类的局势
          const gameRecord = await getGameRecord(channelId);
          let {
            movesAfterLastEat,
            boardAfterLastEat,
            turnAfterLastEat,
            // multiPvInfoBuffer
          } = gameRecord;

          await ctx.database.set('cchess_game_records', {channelId}, {
            isAnalyzing: true
          })

          await sendCommand(channelId, "fen " + getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat)),
            await go(channelId, 1e3 * thinkingSettings["movetime"], thinkingSettings["depth"], -1)

          while (true) {
            const gameRecord = await getGameRecord(channelId);
            if (!gameRecord.isAnalyzing) {
              break;
            }
            await sleep(500);
          }
          const newGameRecord = await getGameRecord(channelId);
          if (newGameRecord.winSide !== '') {
            const buffer = await drawChessBoard(channelId);
            const hImg = h.image(buffer, `image/${config.imageType}`)

            await updatePlayerRecords(channelId, newGameRecord.winSide, newGameRecord.loseSide);

            await endGame(channelId);
            return await sendMessage(session, `【@${username}】\n绝杀！\n游戏结束！\n获胜方为：【${convertTurnToString(newGameRecord.winSide)}】\n${hImg}`);
          }
        }

        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `${hImg}`);
      }
    )

  // hq*
  ctx.command('cchess.悔棋', '悔棋指令帮助')
    .action(async ({session}) => {
      await session.execute(`cchess.悔棋 -h`)
    })

  // qqhq*
  ctx.command('cchess.悔棋.请求', '请求悔棋')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (gameRecord.isRegretRequest) {
        return await sendMessage(session, `【@${username}】\n已经有悔棋请求了！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      if (playerRecord.length === 0) {
        return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `【@${username}】\n对局分析中，请稍后再试！`);
      }
      if (gameRecord.moveList.length < 1) {
        return await sendMessage(session, `【@${username}】\n当前无法悔棋！`);
      }
      if (gameRecord.isEnginePlayBlack || gameRecord.isEnginePlayRed) {
        await undoMove(channelId);
        await undoMove(channelId);
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `【@${username}】\n悔棋成功！\n${hImg}`);
      } else {
        if (playerRecord[0].side === sideString) {
          return await sendMessage(session, `【@${username}】\n现在轮到你下棋，不可悔棋！`);
        } else {
          await ctx.database.set('cchess_game_records', {channelId}, {
            isRegretRequest: true
          })
          return await sendMessage(session, `【@${username}】\n请求悔棋中...\n清对方输入相关指令选择同意或拒绝！`);
        }
      }
    })

  // tyhq*
  ctx.command('cchess.悔棋.同意', '同意悔棋')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `【@${username}】\n对局分析中，请稍后再试！`);
      }
      if (!gameRecord.isRegretRequest) {
        return await sendMessage(session, `【@${username}】\n当前无悔棋请求！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      if (playerRecord.length === 0) {
        return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `【@${username}】\n您所在的队伍不能做出选择！`);
      } else {
        await undoMove(channelId);
        await ctx.database.set('cchess_game_records', {channelId}, {
          isRegretRequest: false
        })
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `【@${username}】\n由于您同意了对方的悔棋请求！\n悔棋成功！\n${hImg}`);
      }
    })

  // jjhq*
  ctx.command('cchess.悔棋.拒绝', '拒绝悔棋')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `【@${username}】\n对局分析中，请稍后再试！`);
      }
      if (!gameRecord.isRegretRequest) {
        return await sendMessage(session, `【@${username}】\n当前无悔棋请求！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      if (playerRecord.length === 0) {
        return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `【@${username}】\n您所在的队伍不能做出选择！`);
      } else {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isRegretRequest: false
        })
        const buffer = await drawChessBoard(channelId);
        const hImg = h.image(buffer, `image/${config.imageType}`)
        return await sendMessage(session, `【@${username}】\n由于您拒绝了对方的悔棋请求！\n悔棋失败，游戏继续进行！\n${hImg}`);
      }
    })

  // rs*
  ctx.command('cchess.认输', '认输')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `【@${username}】\n对局分析中，请稍后再试！`);
      }
      const playerRecord = await ctx.database.get('cchess_gaming_player_records', {channelId, userId});
      if (playerRecord.length === 0) {
        return await sendMessage(session, `【@${username}】\n您还未加入游戏呢！`);
      }
      const turn = gameRecord.turn;
      const sideString = convertTurnToString(turn);
      if (playerRecord[0].side !== sideString) {
        return await sendMessage(session, `【@${username}】\n还没轮到${sideString}走棋哦！\n当前走棋方为：【${convertTurnToString(gameRecord.turn)}】`);
      }
      const anotherSideString = convertTurnToString(turn === 'w' ? 'b' : 'w');
      await updatePlayerRecords(channelId, turn === 'w' ? 'b' : 'w', turn);
      await endGame(channelId);
      return await sendMessage(session, `【@${username}】\n认输成功！\n游戏结束！\n获胜方为：【${anotherSideString}】`);

    })

  // ykcj*
  ctx.command('cchess.查看云库残局', '云库残局指令帮助')
    .action(async ({session}) => {
      await session.execute(`cchess.查看云库残局 -h`)
    })

  // DTM*
  ctx.command('cchess.查看云库残局.DTM统计', '云库残局DTM统计')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `【@${username}】\nhttps://www.chessdb.cn/egtb_info_dtm.html`);
    })

  // DTC*
  ctx.command('cchess.查看云库残局.DTC统计', '云库残局DTM统计')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `【@${username}】\nhttps://www.chessdb.cn/egtb_info.html`);
    })

  // bjqp*
  ctx.command('cchess.编辑棋盘', '编辑棋盘指令帮助')
    .action(async ({session}) => {
      await session.execute(`cchess.编辑棋盘 -h`)
    })

  // dr*
  ctx.command('cchess.编辑棋盘.导入 <fen:text>', '导入FEN串')
    .action(async ({session}, fen) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏已经开始啦~\n不可编辑棋盘！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      if (!fen) {
        return await sendMessage(session, `【@${username}】\n无效的FEN串！`);
      }
      if (!isValidateFen(fen)) {
        return await sendMessage(session, `【@${username}】\n无效的FEN串！`);
      }
      let {
        turn,
        board,
        moveList,
        movesAfterLastEat,
        boardAfterLastEat,
        turnAfterLastEat,
        lastMove,
        isHistoryMode,
        originalState,
        startFen
      } = gameRecord;
      const t = fen
      board = fenToBoard(t)
      turn = "w"
      moveList = []
      movesAfterLastEat = []
      boardAfterLastEat = fenToBoard(t)
      turnAfterLastEat = fenToTurn(t)
      t.includes("moves") ? startFen = t.split("moves")[0] : startFen = t
      isHistoryMode = !1
      originalState = {}
      lastMove = null
      await ctx.database.set('cchess_game_records', {channelId}, {
        turn,
        board,
        moveList,
        movesAfterLastEat,
        boardAfterLastEat,
        turnAfterLastEat,
        lastMove,
        isHistoryMode,
        originalState,
        startFen
      })
      await parseFen(channelId, t)
      return await sendMessage(session, `【@${username}】\n棋盘编辑成功！`);
    })

  // dc*
  ctx.command('cchess.编辑棋盘.导出', '导出FEN串')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      const gameRecord = await getGameRecord(channelId);
      if (!gameRecord.isStarted) {
        return await sendMessage(session, `【@${username}】\n游戏还未开始哦！`);
      }
      if (gameRecord.isAnalyzing) {
        return await sendMessage(session, `【@${username}】\n对局分析中，请稍后再试！`);
      }
      await checkEngine(channelId);
      if (engines[channelId] && !gameRecord.isEngineReady) {
        await ctx.database.set('cchess_game_records', {channelId}, {
          isEngineReady: true
        })
      }
      const fenWithFullMove = await getFenWithFullMove(channelId);
      return await sendMessage(session, `【@${username}】\n${fenWithFullMove}`);
    })

  // syff*
  ctx.command('cchess.编辑棋盘.使用方法', '查看编辑棋盘的fen使用方法')
    .action(async ({session}) => {
      const {username, userId, channelId} = session
      await updateNameInPlayerRecord(userId, username)
      await checkEngine(channelId);
      return await sendMessage(session, `【@${username}】\nhttps://www.xqbase.com/protocol/cchess_fen.htm`);
    })

  // zsc*
  ctx.command('cchess.排行榜.总胜场 [number:number]', '查看玩家总胜场排行榜')
    .action(async ({session}, number = config.defaultMaxLeaderboardEntries) => {
      const {channelId, username, userId} = session
      // 更新玩家记录表中的用户名
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return '请输入大于等于 0 的数字作为排行榜的参数。';
      }
      return await getLeaderboard(session, 'win', 'win', '玩家总胜场排行榜', number);
    });
// zsc*
  ctx.command('cchess.排行榜.总输场 [number:number]', '查看玩家总输场排行榜')
    .action(async ({session}, number = config.defaultMaxLeaderboardEntries) => {
      const {channelId, username, userId} = session
      // 更新玩家记录表中的用户名
      await updateNameInPlayerRecord(userId, username)
      if (typeof number !== 'number' || isNaN(number) || number < 0) {
        return '请输入大于等于 0 的数字作为排行榜的参数。';
      }
      return await getLeaderboard(session, 'lose', 'lose', '查看玩家总输场排行榜', number);
    });
  // cx*
  ctx.command('cchess.查询玩家记录 [targetUser:text]', '查询玩家记录')
    .action(async ({session}, targetUser) => {
      let {channelId, userId, username} = session
      await updateNameInPlayerRecord(userId, username)
      if (targetUser) {
        const userIdRegex = /<at id="([^"]+)"(?: name="([^"]+)")?\/>/;
        const match = targetUser.match(userIdRegex);
        userId = match?.[1] ?? userId;
        username = match?.[2] ?? username;
      }
      const targetUserRecord = await ctx.database.get('cchess_player_records', {userId})
      if (targetUserRecord.length === 0) {
        await ctx.database.create('cchess_player_records', {
          userId,
          username,
          lose: 0,
          win: 0,
        })
        return sendMessage(session, `【@${session.username}】\n查询对象：${username}
无任何游戏记录。`)
      }
      const {win, lose} = targetUserRecord[0]
      return sendMessage(session, `【@${session.username}】\n查询对象：${username}
总胜场次数为：${win} 次
总输场次数为：${lose} 次
`)
    });

  // hs*
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
      const playerRecord = await ctx.database.get('cchess_player_records', {userId: winnerPlayerRecord.userId});
      await ctx.database.set('cchess_player_records', {userId: winnerPlayerRecord.userId}, {win: playerRecord[0].win + 1});
    }

    for (const loserPlayerRecord of loserPlayerRecords) {
      const playerRecord = await ctx.database.get('cchess_player_records', {userId: loserPlayerRecord.userId});
      await ctx.database.set('cchess_player_records', {userId: loserPlayerRecord.userId}, {lose: playerRecord[0].lose + 1});
    }
  }


  async function getLeaderboard(session: any, type: string, sortField: string, title: string, number: number) {
    const getPlayers: PlayerRecord[] = await ctx.database.get('cchess_player_records', {})
    const sortedPlayers = getPlayers.sort((a, b) => b[sortField] - a[sortField])
    const topPlayers = sortedPlayers.slice(0, number)

    let result = `${title}：\n`;
    topPlayers.forEach((player, index) => {
      result += `${index + 1}. ${player.username}：${player[sortField]} 次\n`
    })
    return await sendMessage(session, result);
  }

  async function updateNameInPlayerRecord(userId: string, username: string): Promise<void> {
    const userRecord = await ctx.database.get('cchess_player_records', {userId});

    if (userRecord.length === 0) {
      await ctx.database.create('cchess_player_records', {
        userId,
        username,
      });
      return;
    }

    const existingRecord = userRecord[0];
    let isChange = false

    if (username !== existingRecord.username) {
      existingRecord.username = username;
      isChange = true
    }

    if (isChange) {
      await ctx.database.set('cchess_player_records', {userId}, {
        username: existingRecord.username,
      });
    }

  }

  async function checkEngine(channelId: string) {
    if (!engines[channelId]) {
      await ctx.database.set('cchess_game_records', {channelId}, {
        isEngineReady: false
      })

      await initEngine(channelId);

      while (true) {
        const gameRecord = await getGameRecord(channelId);
        if (gameRecord.isEngineReady) {
          break;
        }
        await sleep(500);
      }
    }
  }

  async function getFenWithFullMove(channelId, t = " ") {
    const gameRecord = await getGameRecord(channelId);
    let {
      // originalState,
      // isHistoryMode,
      startFen
    } = gameRecord;
    let e = []
    // , i = this;
    // isHistoryMode && (i = originalState);
    for (let A of gameRecord.moveList)
      e.push(A.move);
    let n = startFen;
    return e.length > 0 && (n += " moves " + e.join(t)),
      n
  }

  function fenToTurn(t) {
    let e = t.split(" ");
    return "b" == e[1] ? "b" : "w"
  }

  function isValidateFen(t) {
    let e = t.split(" ")
      , i = e[0]
      , n = e[1];
    if (!"rwb".includes(n.toLowerCase()))
      return !1;
    let A = i.split("/");
    if (10 != A.length)
      return !1;
    for (let s = 0; s < A.length; s++) {
      let t = A[s]
        , e = t.length
        , i = 0;
      for (let n = 0; n < e; n++) {
        let e = t.charAt(n);
        e >= "0" && e <= "9" ? i += parseInt(e) : i++
      }
      if (9 != i)
        return !1
    }
    return !0
  }

  async function parseFen(channelId, t) {
    const gameRecord = await getGameRecord(channelId);
    let {
      turn,
      board,
    } = gameRecord;
    let e = t.split(" ");
    board = fenToBoard(e[0])
    turn = "b" == e[1] ? "b" : "w"
    await ctx.database.set('cchess_game_records', {channelId}, {
      turn,
      board,
    })
    if (e.length > 3 && "moves" == e[2])
      if (4 == e[3].length)
        for (let i = 3; i < e.length; i++)
          await makeMoveByString(channelId, e[i]);
      else {
        let t = e[3];
        for (let e = 0; e < t.length; e += 4)
          await makeMoveByString(channelId, t.substring(e, e + 4))
      }
  }

  function deepCopy(t) {
    return JSON.parse(JSON.stringify(t))
  }

  async function gotoHistory(channelId, t) {

    const gameRecord = await getGameRecord(channelId);
    let {
      fen,
      turn,
      board,
      moveList,
      movesAfterLastEat,
      boardAfterLastEat,
      turnAfterLastEat,
      lastMove,
      isHistoryMode,
      originalState
    } = gameRecord;
    isHistoryMode || (originalState = {
      fen: getFen(board, turn),
      turn: turn,
      board: deepCopy(board),
      moveList: deepCopy(moveList),
      movesAfterLastEat: deepCopy(movesAfterLastEat),
      boardAfterLastEat: deepCopy(boardAfterLastEat),
      turnAfterLastEat: turnAfterLastEat,
      lastMove: lastMove
    },
      isHistoryMode = !0);
    let e = t.moveId
      , i = originalState.moveList.findIndex((t => t.moveId == e));
    moveList = originalState.moveList.slice(0, i + 1),
      i = originalState.movesAfterLastEat.findIndex((t => t.moveId == e)),
      -1 != i ? movesAfterLastEat = originalState.movesAfterLastEat.slice(0, i + 1) : (boardAfterLastEat = fenToBoard(t.fen),
        turnAfterLastEat = "w" == t.side ? "b" : "w",
        movesAfterLastEat = []),
      lastMove = t.moveCord,
      turn = "w" == t.side ? "b" : "w",
      board = fenToBoard(t.fen),
      await ctx.database.set('cchess_game_records', {channelId}, {
        fen: t.fen,
        turn,
        board,
        moveList,
        movesAfterLastEat,
        boardAfterLastEat,
        turnAfterLastEat,
        lastMove,
        originalState,
        isHistoryMode
      })
  }

  async function gotoStart(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let {
      fen,
      turn,
      board,
      moveList,
      movesAfterLastEat,
      boardAfterLastEat,
      turnAfterLastEat,
      lastMove,
      isHistoryMode,
      originalState,
      startFen
    } = gameRecord;
    isHistoryMode || (originalState = {
      fen: getFen(board, turn),
      turn: turn,
      board: deepCopy(board),
      moveList: deepCopy(moveList),
      movesAfterLastEat: deepCopy(movesAfterLastEat),
      boardAfterLastEat: deepCopy(boardAfterLastEat),
      turnAfterLastEat: turnAfterLastEat,
      lastMove: lastMove
    },
      isHistoryMode = !0),
      await parseFen(channelId, startFen),
      moveList = [],
      movesAfterLastEat = [],
      boardAfterLastEat = deepCopy(fenToBoard(fen)),
      turnAfterLastEat = turn,
      lastMove = null,
      await ctx.database.set('cchess_game_records', {channelId}, {
        moveList,
        movesAfterLastEat,
        boardAfterLastEat,
        turnAfterLastEat,
        lastMove,
        originalState,
        isHistoryMode
      })
  }

  async function undoMove(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let {
      fen,
      turn,
      board,
      moveList,
      movesAfterLastEat,
      boardAfterLastEat,
      turnAfterLastEat,
      lastMove,
      isHistoryMode,
      originalState
    } = gameRecord;
    if (isHistoryMode || (originalState = {
      fen: getFen(board, turn),
      turn: turn,
      board: deepCopy(board),
      moveList: deepCopy(moveList),
      movesAfterLastEat: deepCopy(movesAfterLastEat),
      boardAfterLastEat: deepCopy(boardAfterLastEat),
      turnAfterLastEat: turnAfterLastEat,
      lastMove: lastMove
    },
      isHistoryMode = !0),
      await ctx.database.set('cchess_game_records', {channelId}, {
        originalState,
        isHistoryMode
      }), moveList.length > 1) {
      let t = moveList[moveList.length - 2];
      await gotoHistory(channelId, t)
    } else
      await gotoStart(channelId)
  }

  async function endGame(channelId: string): Promise<void> {
    await ctx.database.remove('cchess_game_records', {channelId});
    await ctx.database.remove('cchess_gaming_player_records', {channelId});
  }

  async function onEngineBestMove(channelId, t, e) {
    const gameRecord = await getGameRecord(channelId);
    let {
      isEnginePlayRed,
      isEnginePlayBlack,
      // bestMoveHint,
      board,
      turn
    } = gameRecord;
    if (!t) {
      await ctx.database.set('cchess_game_records', {channelId}, {
        isAnalyzing: false
      })
      return;
    }

    if ("(none)" === t) {
      await ctx.database.set('cchess_game_records', {channelId}, {
        winSide: turn === 'w' ? 'b' : 'w',
        loseSide: turn,
        isAnalyzing: false
      });
      return;
    }
    let i = getSideByMoveString(board, t);
    if (i !== turn && isEnginePlayRed || i !== turn && isEnginePlayBlack) {
      await ctx.database.set('cchess_game_records', {channelId}, {
        winSide: turn,
        loseSide: turn === 'w' ? 'b' : 'w',
        isAnalyzing: false
      });
      return;
    }
    ("w" === i && isEnginePlayRed || "b" === i && isEnginePlayBlack) && (await makeMoveByString(channelId, t)
    )

    await ctx.database.set('cchess_game_records', {channelId}, {
      // bestMoveHint,
      isAnalyzing: false
    })
  }

  function getLocalMoveName(t, e) {
    let i = {};
    if ("zh-CN" === e)
      return t;
    if ("en-US" === e)
      i = {
        "进": "+",
        "退": "-",
        "平": "=",
        "前": "+",
        "后": "-",
        "中": "=",
        "将": "k",
        "帅": "K",
        "士": "a",
        "仕": "A",
        "象": "b",
        "相": "B",
        "车": "r",
        "马": "n",
        "炮": "c",
        "卒": "p",
        "兵": "P"
      };
    else {
      if ("vi-VN" !== e)
        return t;
      i = {
        "进": ".",
        "退": "/",
        "平": "-",
        "前": ".",
        "后": "/",
        "中": "-",
        "将": "Tg",
        "帅": "Tg",
        "士": "S",
        "仕": "S",
        "象": "T",
        "相": "T",
        "车": "X",
        "马": "M",
        "炮": "P",
        "卒": "B",
        "兵": "B"
      }
    }
    let n = "一二三四五六七八九"
      , A = "１２３４５６７８９"
      , s = "123456789"
      , a = ""
      , o = -1 !== A.indexOf(t[3]) ? "b" : "w";
    for (let r of t) {
      let t = n.indexOf(r)
        , e = A.indexOf(r);
      a += r in i ? i[r] : -1 !== t ? s[t] : -1 !== e ? s[e] : r
    }
    return a = "w" === o ? a.toUpperCase() : a.toLowerCase(),
      a
  }

  async function getSerialMoveName(channelId, t, e) {
    const gameRecord = await getGameRecord(channelId);
    let i = []
    for (let A = 0; A < e.length; A++) {
      let t = e[A]
        , s = getFigureMoveName(getFen(gameRecord.board, gameRecord.turn), t);
      i.push(getLocalMoveName(s, 'zh-CN')),
        await makeMoveByString(channelId, t)
    }
    return i.join(" ")
  }

// async function onEngineInfo(channelId, t, e) {
//   const gameRecord = await getGameRecord(channelId);
//   let {
//     isFlipBoard,
//     bestMoveHint,
//     ponderHint,
//     thinkingDetail,
//     // multiPvInfoBuffer,
//     thinkingSide
//   } = gameRecord;
//   if ("pv" in e) {
//     let t = e["multipv"]
//       , n = e["pv"].split(" ");
//     bestMoveHint[t] = moveStringToPos(n[0]),
//     n.length > 1 && (ponderHint[t] = moveStringToPos(n[1])),
//       // drawBoard(),
//       thinkingSide = gameRecord.turn,
//       "score" in e && "cp" in e["score"] ? e["score"]["cp"] = e["score"]["cp"] * ("w" == thinkingSide ? 1 : -1) * (isFlipBoard ? -1 : 1) : "score" in e && "mate" in e["score"] && (e["score"]["mate"] = e["score"]["mate"] * ("w" == thinkingSide ? 1 : -1) * (isFlipBoard ? -1 : 1)),
//       e["board_side"] = isFlipBoard ? "b" : "w",
//       e["type"] = "engine";
//     try {
//       engineSettings.MultiPV > 1 ? e["pv"] = getSerialMoveName(channelId, getFen(gameRecord.board, gameRecord.turn), e["pv"].split(" ").slice(0, 4)) : e["pv"] = getSerialMoveName(channelId, getFen(gameRecord.board, gameRecord.turn), e["pv"].split(" "))
//     } catch (i) {
//     }
//     if (engineSettings.MultiPV > 1) {
//       if (multiPvInfoBuffer[t] = e,
//       Object.keys(multiPvInfoBuffer).length === engineSettings.MultiPV) {
//         for (let t = engineSettings.MultiPV; t >= 1; t--)
//           thinkingDetail.unshift(multiPvInfoBuffer[t]),
//           thinkingDetail.length > 50 && thinkingDetail.pop();
//         multiPvInfoBuffer = {}
//       }
//     } else
//       thinkingDetail.unshift(e),
//       thinkingDetail.length > 50 && thinkingDetail.pop()
//   }
//   await ctx.database.set('cchess_game_records', {channelId}, {
//     bestMoveHint,
//     ponderHint,
//     thinkingDetail,
//     multiPvInfoBuffer,
//     thinkingSide
//   })
// }


  // async function stop(channelId) {
  //   // const gameRecord = await getGameRecord(channelId);
  //   // const lastPV = gameRecord.lastPV;
  //   engines[channelId].terminate()
  //   // engines[channelId].terminate(),
  //     // engines[channelId] = null,
  //     // gameRecord.isAnalyzing = false,
  //     // // null != lastPV && (2 == lastPV.length ? await onEngineInfo(channelId, lastPV[0], lastPV[1]) : await onEngineInfo(channelId, lastPV[0], null)),
  //     // await initEngine(channelId)
  // }

  async function go(channelId, t = -1, e = -1, i = -1) {
    // const gameRecord = await getGameRecord(channelId);
    // if (gameRecord.isAnalyzing)
    //   return false;
    {
      let n = "go";
      return t > 0 && (n += " movetime " + t),
      e > 0 && (n += " depth " + e),
      i > 0 && (n += " nodes " + i),
        await sendCommand(channelId, n),
        true
    }

  }

  async function engineAction(channelId) {
    const gameRecord = await getGameRecord(channelId);
    let {
      isEnginePlayRed,
      isEnginePlayBlack,
      turn,
      movesAfterLastEat,
      boardAfterLastEat,
      turnAfterLastEat,
      // multiPvInfoBuffer
    } = gameRecord;
    // if (isEnginePlayRed && "w" === turn || isEnginePlayBlack && "b" === turn) {
    await sendCommand(channelId, "fen " + getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat)),
      // multiPvInfoBuffer = {},
      await go(channelId, 1e3 * thinkingSettings["movetime"], thinkingSettings["depth"], -1)
    // }

    // await ctx.database.set('cchess_game_records', {channelId}, {
    // multiPvInfoBuffer
    // })
  }

  function moveStringToPos(t) {
    let e = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
      g: 6,
      h: 7,
      i: 8
    }
      , i = {
      0: 9,
      1: 8,
      2: 7,
      3: 6,
      4: 5,
      5: 4,
      6: 3,
      7: 2,
      8: 1,
      9: 0
    }
      , n = [e[t[0]], i[t[1]]]
      , A = [e[t[2]], i[t[3]]];
    return [n, A]
  }

  async function makeMoveByString(channelId, t) {
    let e = moveStringToPos(t);
    await makeMove(channelId, e[0], e[1])
  }

  function getSideByMoveString(board, t) {
    let e = moveStringToPos(t)
      , i = e[0];
    return getSide(board[i[1]][i[0]])
  }

  function getFenWithMove(movesAfterLastEat, boardAfterLastEat, turnAfterLastEat) {
    let t = [];
    for (let i of movesAfterLastEat)
      t.push(i.move);
    let e = boardToFen(boardAfterLastEat, "w", turnAfterLastEat);
    return t.length > 0 && (e += " moves " + t.join(" ")),
      e
  }

  async function setOption(channelId, t, e) {
    await sendCommand(channelId, "setoption name " + t + " value " + e)
  }

  async function setOptionList(channelId, t) {
    for (let e in t)
      await setOption(channelId, e, t[e])
  }

// zl*
  async function sendCommand(channelId, t) {
    const gameRecord = await getGameRecord(channelId);

    await checkEngine(channelId);
    if (engines[channelId] && !gameRecord.isEngineReady) {
      await ctx.database.set('cchess_game_records', {channelId}, {
        isEngineReady: true
      })
    }

    if (null !== engines[channelId] || "uci" == t) {
      engines[channelId].send_command(t)
    } else {
      await sendCommand(channelId, t);
    }
  }

// sc*
  async function receiveOutput(channelId, t) {
    try {
      if (!t) return;

      let e = t.split(" ");
      let i = e[0];
      let keywords = "depth seldepth time nodes pv multipv score currmove currmovenumber hashfull nps tbhits cpuload string refutation currline".split(" ");

      if (i === "info") {
        let infoObj = {};
        for (let j = 1; j < e.length; j++) {
          switch (e[j]) {
            case "pv":
            case "string":
              infoObj[e[j]] = e.slice(j + 1).join(" ");
              break;
            case "score":
              if (e[j + 1] === "cp") {
                infoObj[e[j]] = {cp: parseInt(e[j + 2])};
                j += 2;
              } else if (e[j + 1] === "mate") {
                infoObj[e[j]] = {mate: parseInt(e[j + 2])};
                j += 2;
              } else {
                infoObj[e[j]] = {cp: parseInt(e[j + 1])};
                j++;
              }
              break;
            default:
              if (e.length > j + 1 && keywords.includes(e[j])) {
                infoObj[e[j]] = parseInt(e[j + 1]);
                j++;
              } else {
                infoObj[e[j]] = "";
              }
          }
        }

        if ("pv" in infoObj) {
          // lastPV = (infoObj["pv"] as string).split(" ");
        }

        // await onEngineInfo(channelId, i, infoObj);
      } else if (i === "bestmove") {
        // isAnalyzing = false;
        if (e.length === 4 && e[2] === "ponder") {
          await onEngineBestMove(channelId, e[1], e[3]);
        } else {
          await onEngineBestMove(channelId, e[1], null);
        }
      } else if (i === "option" || i === "uciok") {
        // await ctx.database.set('cchess_game_records', {channelId}, {isEngineReady: true})
      }
    } catch (error) {
      logger.error(error);
    }
  }

  async function engineMessageHandler(channelId, message) {
    const {command, wasmType, origin} = message;

    if (!engines[channelId]) {
      engines[channelId] = null
    }

    if (command !== undefined) {
      engines[channelId].send_command(command);
    } else if (wasmType !== undefined) {
      const wasmOrigin = origin;

      const wasmScriptPath = path.join(wasmOrigin, 'assets', 'wasm', 'pikafish.js');

      const Pikafish = require(wasmScriptPath);

      const instance = await Pikafish({
        locateFile: (file) => {
          if (file === "pikafish.data") {
            return path.join(wasmOrigin, 'assets', 'wasm', 'data', file);
          } else {
            return path.join(wasmOrigin, 'assets', 'wasm', file);
          }
        },
        setStatus: (status) => {
        }
      });

      engines[channelId] = instance;
      engines[channelId].read_stdout = async (stdout) => {
        // 处理接收到的输出
        await receiveOutput(channelId, stdout);
      };

      // isReady
      await ctx.database.set('cchess_game_records', {channelId}, {isEngineReady: true})
      await sleep(100)
      // 发送命令 "uci"
      await sendCommand(channelId, "uci");
      await sleep(100)
      // 设置选项
      await setOptionList(channelId, engineSettings);
    }
  }


  async function initEngine(channelId) {
    await engineMessageHandler(channelId, {command: undefined, wasmType: 'single', origin: __dirname});
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
    "将": "k",
    "士": "a",
    "象": "b",
    "车": "r",
    "马": "n",
    "炮": "c",
    "卒": "p",
    "帅": "k",
    "仕": "a",
    "相": "b",
    "兵": "p"
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

    if (move.length !== 4) {
      return false;
    }

    const figureNameMatches = move.match(figureNamesRegex);
    const actionMatches = move.match(actionRegex);
    const positionMatches = move.match(positionRegex);

    return figureNameMatches && figureNameMatches.length === 1 &&
      actionMatches && actionMatches.length === 1 &&
      positionMatches && positionMatches.length >= 1 && positionMatches.length <= 2;
  }

  function convertTurnToString(turn): string {
    if (turn === 'w') {
      return '红方';
    } else if (turn === 'b') {
      return '黑方';
    }
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

    if (str.length !== 4) {
      return false;
    }

    return boardLetters.includes(str[0]) &&
      boardLetters.includes(str[2]) &&
      parseInt(str[1]) >= 0 && parseInt(str[1]) <= 9 &&
      parseInt(str[3]) >= 0 && parseInt(str[3]) <= 9;
  }


  function getType(t) {
    return t.toLowerCase()
  }

  function getValidMoveMapKings(board, t, e) {
    let i, n, A = getEmptyBoard(), s = e[0], a = e[1];
    a <= 2 ? (i = 0,
      n = 2) : a >= 7 ? (i = 7,
      n = 9) : (i = a - 1,
      n = a + 1);
    let o = 3
      , r = 5;
    if (s + 1 <= r) {
      let e = getValidType(board, t, [s + 1, a]);
      "eat" != e && "go" != e || setMoveMap(A, [s + 1, a], e)
    }
    if (s - 1 >= o) {
      let e = getValidType(board, t, [s - 1, a]);
      "eat" != e && "go" != e || setMoveMap(A, [s - 1, a], e)
    }
    if (a + 1 <= n) {
      let e = getValidType(board, t, [s, a + 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s, a + 1], e)
    }
    if (a - 1 >= i) {
      let e = getValidType(board, t, [s, a - 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s, a - 1], e)
    }
    return A
  }

  function getValidMoveMapCannons(board, t, e) {
    let i = getEmptyBoard()
      , n = e[0]
      , A = e[1]
      , s = !1;
    for (let a = n; a < 9; a++) {
      if (a == n)
        continue;
      let e = getValidType(board, t, [a, A]);
      if (s || "block" != e && "eat" != e) {
        if (s && "eat" == e) {
          setMoveMap(i, [a, A], "eat");
          break
        }
        s || "go" != e || setMoveMap(i, [a, A], "go")
      } else
        s = !0
    }
    s = !1;
    for (let a = n; a >= 0; a--) {
      if (a == n)
        continue;
      let e = getValidType(board, t, [a, A]);
      if (s || "block" != e && "eat" != e) {
        if (s && "eat" == e) {
          setMoveMap(i, [a, A], "eat");
          break
        }
        s || "go" != e || setMoveMap(i, [a, A], "go")
      } else
        s = !0
    }
    s = !1;
    for (let a = A; a < 10; a++) {
      if (a == A)
        continue;
      let e = getValidType(board, t, [n, a]);
      if (s || "block" != e && "eat" != e) {
        if (s && "eat" == e) {
          setMoveMap(i, [n, a], "eat");
          break
        }
        s || "go" != e || setMoveMap(i, [n, a], "go")
      } else
        s = !0
    }
    s = !1;
    for (let a = A; a >= 0; a--) {
      if (a == A)
        continue;
      let e = getValidType(board, t, [n, a]);
      if (s || "block" != e && "eat" != e) {
        if (s && "eat" == e) {
          setMoveMap(i, [n, a], "eat");
          break
        }
        s || "go" != e || setMoveMap(i, [n, a], "go")
      } else
        s = !0
    }
    return i
  }

  function getSideByKing(board, t) {
    t[0];
    let e = t[1];
    if (e <= 4)
      for (let i = 3; i <= 5; i++)
        for (let t = 0; t <= 2; t++) {
          let e = getPiece(board, [i, t]);
          if ("K" == e)
            return "w";
          if ("k" == e)
            return "b"
        }
    else
      for (let i = 3; i <= 5; i++)
        for (let t = 7; t <= 9; t++) {
          let e = getPiece(board, [i, t]);
          if ("K" == e)
            return "w";
          if ("k" == e)
            return "b"
        }
    return ""
  }

  function getValidMoveMapPawns(board, t, e) {
    let i = getEmptyBoard()
      , n = e[0]
      , A = e[1]
      , s = getSideByKing(board, e);
    if (t == s)
      if (A <= 4) {
        let e = getValidType(board, t, [n, A + 1]);
        "eat" != e && "go" != e || setMoveMap(i, [n, A + 1], e)
      } else {
        let e = getValidType(board, t, [n, A - 1]);
        "eat" != e && "go" != e || setMoveMap(i, [n, A - 1], e)
      }
    else {
      if (A <= 4) {
        let e = getValidType(board, t, [n, A - 1]);
        "eat" != e && "go" != e || setMoveMap(i, [n, A - 1], e)
      } else {
        let e = getValidType(board, t, [n, A + 1]);
        "eat" != e && "go" != e || setMoveMap(i, [n, A + 1], e)
      }
      let e = getValidType(board, t, [n + 1, A]);
      "eat" != e && "go" != e || setMoveMap(i, [n + 1, A], e),
        e = getValidType(board, t, [n - 1, A]),
      "eat" != e && "go" != e || setMoveMap(i, [n - 1, A], e)
    }
    return i
  }

  function getValidMoveMapBishops(board, t, e) {
    let i, n, A = getEmptyBoard(), s = e[0], a = e[1];
    if (a <= 4 ? (i = 0,
      n = 4) : a >= 5 ? (i = 5,
      n = 9) : (i = a - 1,
      n = a + 1),
    s + 2 <= 9 && a + 2 <= n) {
      let e = getPiece(board, [s + 1, a + 1]);
      if ("" == e) {
        let e = getValidType(board, t, [s + 2, a + 2]);
        "eat" != e && "go" != e || setMoveMap(A, [s + 2, a + 2], e)
      }
    }
    if (s - 2 >= 0 && a + 2 <= n) {
      let e = getPiece(board, [s - 1, a + 1]);
      if ("" == e) {
        let e = getValidType(board, t, [s - 2, a + 2]);
        "eat" != e && "go" != e || setMoveMap(A, [s - 2, a + 2], e)
      }
    }
    if (s + 2 <= 9 && a - 2 >= i) {
      let e = getPiece(board, [s + 1, a - 1]);
      if ("" == e) {
        let e = getValidType(board, t, [s + 2, a - 2]);
        "eat" != e && "go" != e || setMoveMap(A, [s + 2, a - 2], e)
      }
    }
    if (s - 2 >= 0 && a - 2 >= i) {
      let e = getPiece(board, [s - 1, a - 1]);
      if ("" == e) {
        let e = getValidType(board, t, [s - 2, a - 2]);
        "eat" != e && "go" != e || setMoveMap(A, [s - 2, a - 2], e)
      }
    }
    return A
  }

  function getValidMoveMap(board: string[][], type, side, position) {
    switch (type) {
      case "r":
        return getValidMoveMapRooks(board, side, position);
      case "n":
        return getValidMoveMapKnights(board, side, position);
      case "a":
        return getValidMoveMapAdvisors(board, side, position);
      case "b":
        return getValidMoveMapBishops(board, side, position);
      case "k":
        return getValidMoveMapKings(board, side, position);
      case "c":
        return getValidMoveMapCannons(board, side, position);
      case "p":
        return getValidMoveMapPawns(board, side, position);
      default:
        return getEmptyBoard();
    }
  }

  function getValidMoveMapRooks(board, t, e) {
    let i = getEmptyBoard()
      , n = e[0]
      , A = e[1];
    for (let s = n; s < 9; s++) {
      if (s == n)
        continue;
      let e = getValidType(board, t, [s, A]);
      if ("block" == e)
        break;
      if (i[A][s] = e,
      "eat" == e)
        break
    }
    for (let s = n; s >= 0; s--) {
      if (s == n)
        continue;
      let e = getValidType(board, t, [s, A]);
      if ("block" == e)
        break;
      if (i[A][s] = e,
      "eat" == e)
        break
    }
    for (let s = A; s < 10; s++) {
      if (s == A)
        continue;
      let e = getValidType(board, t, [n, s]);
      if ("block" == e)
        break;
      if (i[s][n] = e,
      "eat" == e)
        break
    }
    for (let s = A; s >= 0; s--) {
      if (s == A)
        continue;
      let e = getValidType(board, t, [n, s]);
      if ("block" == e)
        break;
      if (i[s][n] = e,
      "eat" == e)
        break
    }
    return i
  }

  function getValidType(board, t, e) {
    let i = getPiece(board, e);
    return void 0 == i ? "invalid" : "" == i ? "go" : t != getSide(i) ? "eat" : "block"
  }

  function getValidMoveMapAdvisors(board, t, e) {
    let i, n, A = getEmptyBoard(), s = e[0], a = e[1];
    a <= 2 ? (i = 0,
      n = 2) : a >= 7 ? (i = 7,
      n = 9) : (i = a - 1,
      n = a + 1);
    let o = 3
      , r = 5;
    if (s + 1 <= r && a + 1 <= n) {
      let e = getValidType(board, t, [s + 1, a + 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s + 1, a + 1], e)
    }
    if (s - 1 >= o && a + 1 <= n) {
      let e = getValidType(board, t, [s - 1, a + 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s - 1, a + 1], e)
    }
    if (s + 1 <= r && a - 1 >= i) {
      let e = getValidType(board, t, [s + 1, a - 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s + 1, a - 1], e)
    }
    if (s - 1 >= o && a - 1 >= i) {
      let e = getValidType(board, t, [s - 1, a - 1]);
      "eat" != e && "go" != e || setMoveMap(A, [s - 1, a - 1], e)
    }
    return A
  }

  function setMoveMap(t, e, i) {
    e[0] < 0 || e[0] > 8 || e[1] < 0 || e[1] > 9 || (t[e[1]][e[0]] = i)
  }

  function getValidMoveMapKnights(board, t, e) {
    let i = getEmptyBoard()
      , n = e[0]
      , A = e[1];
    return "" == getPiece(board, [n + 1, A]) && (setMoveMap(i, [n + 2, A + 1], getValidType(board, t, [n + 2, A + 1])),
      setMoveMap(i, [n + 2, A - 1], getValidType(board, t, [n + 2, A - 1]))),
    "" == getPiece(board, [n - 1, A]) && (setMoveMap(i, [n - 2, A + 1], getValidType(board, t, [n - 2, A + 1])),
      setMoveMap(i, [n - 2, A - 1], getValidType(board, t, [n - 2, A - 1]))),
    "" == getPiece(board, [n, A + 1]) && (setMoveMap(i, [n + 1, A + 2], getValidType(board, t, [n + 1, A + 2])),
      setMoveMap(i, [n - 1, A + 2], getValidType(board, t, [n - 1, A + 2]))),
    "" == getPiece(board, [n, A - 1]) && (setMoveMap(i, [n + 1, A - 2], getValidType(board, t, [n + 1, A - 2])),
      setMoveMap(i, [n - 1, A - 2], getValidType(board, t, [n - 1, A - 2]))),
      i
  }


  var Et = [];
  Et["w"] = [],
    Et["b"] = [],
    Et["w"][0] = "进",
    Et["w"][1] = "退",
    Et["b"][0] = "退",
    Et["b"][1] = "进",
    Et["p"] = "平";
  var Ht = [];
  Ht["w"] = [],
    Ht["b"] = [],
    Ht["w"][0] = "前",
    Ht["w"][1] = "后",
    Ht["b"][0] = "后",
    Ht["b"][1] = "前",
    Ht["m"] = "中";
  var qt = [];
  qt["k"] = "将",
    qt["a"] = "士",
    qt["b"] = "象",
    qt["r"] = "车",
    qt["n"] = "马",
    qt["c"] = "炮",
    qt["p"] = "卒",
    qt["K"] = "帅",
    qt["A"] = "仕",
    qt["B"] = "相",
    qt["R"] = "车",
    qt["N"] = "马",
    qt["C"] = "炮",
    qt["P"] = "兵";
  var Qt = [];
  Qt["w"] = [],
    Qt["b"] = [],
    Qt["w"][0] = "一",
    Qt["w"][1] = "二",
    Qt["w"][2] = "三",
    Qt["w"][3] = "四",
    Qt["w"][4] = "五",
    Qt["w"][5] = "六",
    Qt["w"][6] = "七",
    Qt["w"][7] = "八",
    Qt["w"][8] = "九",
    // Qt["b"][0] = "９",
    // Qt["b"][1] = "８",
    // Qt["b"][2] = "７",
    // Qt["b"][3] = "６",
    // Qt["b"][4] = "５",
    // Qt["b"][5] = "４",
    // Qt["b"][6] = "３",
    // Qt["b"][7] = "２",
    // Qt["b"][8] = "１";
    Qt["b"][0] = "9",
    Qt["b"][1] = "8",
    Qt["b"][2] = "7",
    Qt["b"][3] = "6",
    Qt["b"][4] = "5",
    Qt["b"][5] = "4",
    Qt["b"][6] = "3",
    Qt["b"][7] = "2",
    Qt["b"][8] = "1";

  function parseChessNotation(fen) {
    let e = [];
    for (let s = 0; s < 9; s++) {
      e[s] = [];
      for (let t = 0; t < 10; t++)
        e[s][t] = 0
    }
    let i = fen.split(" ")[0].split("/")
      , n = ["k", "a", "b", "r", "n", "c", "p", "K", "A", "B", "R", "N", "C", "P"]
      , A = 0;
    for (let s = 0; s < 10; s++) {
      let t = i[s]
        , a = 0;
      for (let i = 0; i < t.length; i++) {
        let o = t[i];
        if (o >= "0" && o <= "9")
          a += parseInt(o);
        else if (-1 != n.indexOf(o)) {
          let t = o >= "a" && o <= "z" ? "b" : "w";
          e[a][s] = t + o + A,
            a++,
            A++
        }
      }
    }
    return e
  }

  function getFigureMoveName(fen, moveString) {
    let i = parseChessNotation(fen);
    var n = moveString.charCodeAt(0) - 97
      , A = 9 - (moveString.charCodeAt(1) - 48)
      , s = moveString.charCodeAt(2) - 97
      , a = 9 - (moveString.charCodeAt(3) - 48)
      , o = 0
      , r = 0
      , l = 0
      , d = '';
    if ("A" != i[n][A].charAt(1) && "B" != i[n][A].charAt(1) && "a" != i[n][A].charAt(1) && "b" != i[n][A].charAt(1)) {
      for (var g = 0; g < 9; g++)
        if (g != n) {
          for (var f = 0; f < 10; f++)
            0 != i[g][f] && i[g][f].substring(0, 2) == i[n][A].substring(0, 2) && l++;
          l < 2 && (l = 0)
        }
      for (f = 0; f < 10; f++)
        0 != i[n][f] && i[n][f].substring(0, 2) == i[n][A].substring(0, 2) && (f < A ? 0 == l ? (d = Ht[i[n][A].charAt(0)][1] + qt[i[n][A].charAt(1)],
          o++) : (d = Ht[i[n][A].charAt(0)][1] + Qt[i[n][A].charAt(0)][9 - n - 1],
          o++) : f == A ? 0 == o ? d = qt[i[n][A].charAt(1)] + Qt[i[n][A].charAt(0)][9 - n - 1] : r = o : 0 == l ? 0 == o ? d = Ht[i[n][A].charAt(0)][0] + qt[i[n][A].charAt(1)] : (d = Ht["m"] + qt[i[n][A].charAt(1)],
          o++) : 0 == o ? d = Ht[i[n][A].charAt(0)][0] + Qt[i[n][A].charAt(0)][9 - n - 1] : (d = Ht["m"] + Qt[i[n][A].charAt(0)][9 - n - 1],
          o++));
      o > 2 && o != r && (d = "w" == i[n][A].charAt(0) ? Qt["w"][r] + qt[i[n][A].charAt(1)] : Qt["w"][o - r] + qt[i[n][A].charAt(1)])
    } else
      d = qt[i[n][A].charAt(1)] + Qt[i[n][A].charAt(0)][9 - n - 1];
    var h = '';
    return h = A > a ? n == s ? "w" == i[n][A].charAt(0) ? Et[i[n][A].charAt(0)][0] + Qt[i[n][A].charAt(0)][A - a - 1] : Et[i[n][A].charAt(0)][0] + Qt[i[n][A].charAt(0)][9 - (A - a - 1) - 1] : Et[i[n][A].charAt(0)][0] + Qt[i[n][A].charAt(0)][9 - s - 1] : A == a ? Et["p"] + Qt[i[n][A].charAt(0)][9 - s - 1] : n == s ? "w" == i[n][A].charAt(0) ? Et[i[n][A].charAt(0)][1] + Qt[i[n][A].charAt(0)][a - A - 1] : Et[i[n][A].charAt(0)][1] + Qt[i[n][A].charAt(0)][9 - (a - A - 1) - 1] : Et[i[n][A].charAt(0)][1] + Qt[i[n][A].charAt(0)][9 - s - 1],
    d + h
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

    for (let i = 0; i < length; i++) {
      id += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return id;
  }

  async function makeMove(channelId: string, fromPos: number[], toPos: number[]) {
    const gameRecord = await getGameRecord(channelId);

    let {
      turn,
      board,
      moveTreePtr,
      moveList,
      isHistoryMode,
      boardAfterLastEat,
      turnAfterLastEat,
      movesAfterLastEat
    } = gameRecord;

    if (isHistoryMode) {
      gameRecord.isHistoryMode = false;
    }

    const lastMove = [fromPos, toPos];

    const moveId = genRandomId(8);
    const pieceAtDestination = board[toPos[1]][toPos[0]] !== "";

    const side = getSide(getPiece(board, fromPos));
    const fen = getFen(board, side);

    if (board[toPos[1]][toPos[0]] === 'K' || board[toPos[1]][toPos[0]] === 'k') {
      await ctx.database.set('cchess_game_records', {channelId}, {
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
      moveId,
      fen: getFen(board, turn),
      side,
      moveCord: [fromPos, toPos],
      move: moveString,
      chnMoveName: figureMoveName,
      next: null
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
      turn,
      board,
      lastMove,
      moveTreePtr,
      moveList,
      isHistoryMode,
      boardAfterLastEat,
      turnAfterLastEat,
      movesAfterLastEat
    };

    Object.assign(gameRecord, updatedGameRecord);

    await ctx.database.set('cchess_game_records', {channelId}, updatedGameRecord);
  }


  function getFen(board: string[][], turn): string {
    return boardToFen(board, 'w', turn);
  }

  function boardToFen(board: string[][], side: string, turn: string = "w"): string {
    if (board === null) {
      return "";
    }

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

      if (emptyCount > 0) {
        fenString += emptyCount;
      }

      fenString += "/";
    }

    fenString = fenString.substring(0, fenString.length - 1) + " " + turn;

    return fenString;
  }

  function getSide(piece: string): string {
    let e = "RNBAKCP";
    return e.includes(piece) ? "w" : "b";
  }

  async function getGameRecord(channelId: string): Promise<GameRecord> {
    let gameRecord = await ctx.database.get('cchess_game_records', {channelId});
    if (gameRecord.length === 0) {
      await ctx.database.create('cchess_game_records', {
        channelId,
      });
      gameRecord = await ctx.database.get('cchess_game_records', {channelId});
    }
    return gameRecord[0];
  }

  async function drawChessBoard(channelId: string): Promise<Buffer> {
    const gameRecord = await getGameRecord(channelId);
    let {board, lastMove, moveList, currentMoveId} = gameRecord;
    const canvas = await ctx.canvas.createCanvas(weight * scale, height * scale);
    const context = canvas.getContext('2d');
    const boardImg = await ctx.canvas.loadImage(boardSkinImg);

    context.drawImage(boardImg, 0, 0, weight * scale, height * scale);

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

        const xPos = ((isFlipBoard ? 8 - col : col) * we + Pe - Be / 2) * scale;
        const yPos = ((isFlipBoard ? 9 - row : row) * we + Pe - Be / 2) * scale;

        const pieceImg = pieceImages[piece];
        context.drawImage(pieceImg, xPos, yPos, Be * scale, Be * scale);
      }
    }

    if (lastMove !== null) {
      let i = lastMove
        , n = i[0]
        , A = i[1]
        , s = n[0]
        , a = n[1]
        , o = A[0]
        , r = A[1];
      // isFlipBoard && (s = 8 - s,
      //   a = 9 - a,
      //   o = 8 - o,
      //   r = 9 - r);
      let l = s * we + pe
        , d = a * we + Pe
        , g = o * we + pe
        , f = r * we + Pe
        , h = Math.sqrt((l - g) * (l - g) + (d - f) * (d - f))
        , b = l + (g - l) * (h - 30) / h
        , c = d + (f - d) * (h - 30) / h;

      await drawLineArrow(context, l * scale, d * scale, b * scale, c * scale, "rgba(128, 171, 69, 0.7)", 15 * scale)
    }

    if (moveList.length > 0) {
      currentMoveId = moveList[moveList.length - 1].moveId;
      await ctx.database.set('cchess_game_records', {channelId}, {currentMoveId});
    }

    if (config.isChessImageWithOutlineEnabled) {
      return await createImage(await canvas.toBuffer('image/png'))
    } else {
      return await canvas.toBuffer('image/png');
    }

  }


  async function drawLineArrow(t, e, i, n, A, s = "black", a = 20) {
    var o = .282 * Math.sqrt((e - n) * (e - n) + (i - A) * (i - A));
    o = a;
    var r, l, d = 45, g = 180 * Math.atan2(i - A, e - n) / Math.PI, f = (g + d) * Math.PI / 180,
      h = (g - d) * Math.PI / 180, b = o * Math.cos(f), c = o * Math.sin(f), u = o * Math.cos(h),
      v = o * Math.sin(h), m = e > n, w = i > A;
    r = n + b,
      l = A + c;
    var I = n + u
      , p = A + v
      , P = w ? r + .25 * Math.abs(I - r) : r - .25 * Math.abs(I - r)
      , B = m ? l - .25 * Math.abs(p - l) : l + .25 * Math.abs(p - l)
      , M = w ? r + .75 * Math.abs(I - r) : r - .75 * Math.abs(I - r)
      , y = m ? l - .75 * Math.abs(p - l) : l + .75 * Math.abs(p - l);
    t.beginPath(),
      t.moveTo(e, i),
      t.lineTo(P, B),
      t.lineTo(r, l),
      t.lineTo(n, A),
      t.lineTo(I, p),
      t.lineTo(M, y),
      t.lineTo(e, i),
      t.closePath(),
      t.strokeStyle = s,
      t.fillStyle = s,
      t.fill(),
      t.stroke()
  }

  interface Resource {
    prefix: string;
    type: string;
  }

  function loadPiecesImageResources(folder, format = "webp") {
    const imgResources: { [key: string]: Buffer } = {};
    const resources: Resource[] = [
      {prefix: 'w', type: 'rnbakcp'},
      {prefix: 'b', type: 'rnbakcp'},
    ];

    for (const {prefix, type} of resources) {
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

  function getPiece(board: string[][], position: number[]): string { // position: [col, row]
    if (position[0] < 0 || position[0] > 8 || position[1] < 0 || position[1] > 9) {
      return "invalid";
    } else {
      const piece = board[position[1]][position[0]];
      return piece ? piece : "";
    }
  }

  let sentMessages = [];

  async function sendMessage(session: any, message: any): Promise<void> {
    const {bot, channelId} = session;
    let messageId;
    if (config.isTextToImageConversionEnabled) {
      const lines = message.split('\n');
      const isOnlyImgTag = lines.length === 1 && lines[0].trim().startsWith('<img');
      if (isOnlyImgTag) {
        await session.send(message);
      } else {
        const modifiedMessage = lines
          .map((line) => {
            if (line.trim() !== '' && !line.includes('<img')) {
              return `# ${line}`;
            } else {
              return line + '\n';
            }
          })
          .join('\n');
        const imageBuffer = await ctx.markdownToImage.convertToImage(modifiedMessage);
        [messageId] = await session.send(h.image(imageBuffer, `image/${config.imageType}`));
      }
    } else {
      [messageId] = await session.send(message);
    }
    if (config.retractDelay === 0) return;
    sentMessages.push(messageId);

    if (sentMessages.length > 1) {
      const oldestMessageId = sentMessages.shift();
      setTimeout(async () => {
        await bot.deleteMessage(channelId, oldestMessageId);
      }, config.retractDelay * 1000);
    }
  }
}
