# 中国象棋

Koishi 插件：中国象棋，支持悔棋、棋谱分享与皮卡鱼引擎对战

[![GitHub](https://img.shields.io/badge/GitHub-araea%2Fkoishi--plugin--cchess-181717?logo=github&logoColor=white)](https://github.com/araea/koishi-plugin-cchess)
[![npm](https://img.shields.io/npm/v/koishi-plugin-cchess?logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/koishi-plugin-cchess)

## 安装

```sh
npm i koishi-plugin-cchess
```

启用插件，并安装 `database` 与 `canvas` 服务。

## 快速使用

发送 `cchess.开始` 入座，双方就位后自动开局；发送 `cchess.开始 人机` 直接挑战皮卡鱼。落子也可直接发送，如 `炮二平五` 或 `b2e2`。悔棋请求送出后，对方直接回复 `同意` 或 `拒绝` 即可表决。

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

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `boardSkin` | string | `象甲2023棋盘` | 棋盘皮肤 |
| `pieceSkin` | string | `象甲棋子` | 棋子皮肤 |
| `allowFreePieceMovementInHumanMachineMode` | boolean | `false` | 人机模式下允许所有人自由移动棋子 |
| `enableDirectInput` | boolean | `true` | 对局中直接发送棋谱或「同意」「拒绝」即可应答 |
| `defaultEngineThinkingDepth` | number | `10` | 引擎思考深度，范围 0–100；越高棋力越强、耗时越长 |
| `defaultMaxLeaderboardEntries` | number | `4` | 排行榜默认显示的人数 |
| `retractDelay` | number | `0` | 自动撤回延迟（秒），0 表示不撤回 |
| `imgScale` | number | `1` | 图片分辨率倍率，最小 1 |
| `imageType` | `png` / `jpeg` / `webp` | `png` | 发送的图片格式 |
| `isChessImageWithOutlineEnabled` | boolean | `true` | 给棋盘图片加坐标外框；关闭后出图更快 |
| `disableImages` | boolean | `false` | 全部改用文本，不发送棋盘图片 |

## 限制 / 风险

必须安装 `database` 与 `canvas` 服务才能运行。

引擎思考深度过高会显著增加响应耗时；Node.js 不支持 SIMD，不建议设置过大。

## 链接

- [设计系统](DESIGN_SYSTEM.md)
- [MIT](LICENSE-MIT) / [Apache-2.0](LICENSE-APACHE)
