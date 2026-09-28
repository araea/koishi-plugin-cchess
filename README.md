# 中国象棋

在 Koishi 群里和朋友下中国象棋，支持悔棋、棋谱分享与皮卡鱼引擎对战。

[![GitHub](https://img.shields.io/badge/GitHub-仓库-181717)](https://github.com/araea/koishi-plugin-cchess)
[![npm](https://img.shields.io/badge/npm-包-cc3534)](https://www.npmjs.com/package/koishi-plugin-cchess)

## 安装

```sh
yarn add koishi-plugin-cchess
```

启用插件，并安装 `database` 与 `canvas` 服务。

## 快速使用

发送 `cchess.开始` 入座，双方就位后自动开局。发送 `cchess.开始 人机` 直接挑战皮卡鱼引擎。发送 `cchess.开始 <FEN>` 导入局面，随后再发 `cchess.开始` 开局。

| 指令 | 说明 |
| --- | --- |
| `cchess.开始 [红/黑] [人机]` | 入座开局，或挑战皮卡鱼 |
| `cchess.开始 <FEN>` | 导入局面；随后发送 `cchess.开始` 开局 |
| `cchess.落子 <着法>` | 按棋谱落子，如 `炮二平五` 或 `b2e2` |
| `cchess.悔棋 [同意/拒绝]` | 请求悔棋或表决 |
| `cchess.认输` | 认输 |
| `cchess.结束` | 结束当前对局 |
| `cchess.战绩 [@某人/榜] [胜场/输场] [人数]` | 查询战绩或排行 |
| `cchess.查看云库残局 [DTM/DTC]` | 查询云库残局统计 |

落子也可直接发送棋谱，如 `炮二平五` 或 `b2e2`。悔棋请求后，对手直接回复 `同意` 或 `拒绝` 即可表决。

## 配置

| 配置项 | 默认值 | 类型 | 说明 |
| --- | --- | --- | --- |
| `boardSkin` | `'象甲2023棋盘'` | string | 棋盘皮肤 |
| `pieceSkin` | `'象甲棋子'` | string | 棋子皮肤 |
| `allowFreePieceMovementInHumanMachineMode` | `false` | boolean | 人机模式下允许所有人自由移动棋子，开启后无需入座即可开始人机对局 |
| `enableDirectInput` | `true` | boolean | 对局中直接发送棋谱或「同意」「拒绝」即可落子与应答，无需指令前缀 |
| `defaultEngineThinkingDepth` | `10` | number | 默认引擎思考深度，范围 0–100；越高棋力越强、耗时越长 |
| `defaultMaxLeaderboardEntries` | `4` | number | 排行榜默认显示的人数 |
| `retractDelay` | `0` | number | 自动撤回延迟（秒），0 表示不撤回 |
| `imgScale` | `1` | number | 图片分辨率倍率，范围 1+ |
| `imageType` | `'png'` | `'png'` / `'jpeg'` / `'webp'` | 发送的图片格式 |
| `isChessImageWithOutlineEnabled` | `true` | boolean | 给棋盘图片加坐标外框；关闭后出图更快但没有外框 |
| `disableImages` | `false` | boolean | 全部改用文本，不发送棋盘图片 |

## 限制 / 风险

必须安装 `database` 与 `canvas` 服务才能运行。引擎思考深度过高会显著增加响应耗时；Node.js 不支持 SIMD，不建议设置过大。

## 必要链接

- 仓库：https://github.com/araea/koishi-plugin-cchess
- 设计系统：DESIGN_SYSTEM.md
