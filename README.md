# 中国象棋

Koishi 中国象棋插件，支持玩家对战、皮卡鱼引擎对战和 FEN 局面导入。

## 安装

```sh
yarn add koishi-plugin-cchess
```

在 Koishi 中启用，并安装 `database` 与 `canvas` 服务。

## 指令

| 指令 | 说明 |
| --- | --- |
| `cchess.开始 [红/黑] [人机]` | 入座开局，或挑战皮卡鱼 |
| `cchess.开始 <FEN>` | 导入局面；随后发送 `cchess.开始` 开局 |
| `cchess.落子 <着法>` | 按棋谱落子，如 `炮二平五` |
| `cchess.悔棋 [同意/拒绝]` | 请求悔棋或表决 |
| `cchess.认输` | 认输 |
| `cchess.结束` | 结束当前对局 |
| `cchess.战绩 [@某人/榜] [胜场/输场] [人数]` | 查询战绩或排行 |
| `cchess.查看云库残局 [DTM/DTC]` | 查询云库残局统计 |

发送 `cchess.开始` 入座，双方就位后自动开局。发送 `cchess.开始 人机` 可直接挑战引擎。落子也可直接发送，如 `炮二平五` 或 `b2e2`。悔棋请求后，对手可直接回复 `同意` 或 `拒绝`。

## 许可证

可按 [Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 使用。
