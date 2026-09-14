# koishi-plugin-cchess

中国象棋，支持人人对战与皮卡鱼人机对战

## 安装

```sh
yarn add koishi-plugin-cchess
```

在 Koishi 配置中启用，并提供 database 与 canvas 服务。

## 指令

| 指令 | 说明 |
| --- | --- |
| `cchess.开始 [红/黑] [人人/人机]` | 入座并开局，双方就位后自动开战 |
| `cchess.开始 <FEN>` | 摆谱，导入局面后再 `cchess.开始` 即可 |
| `cchess.悔棋 [同意/拒绝]` | 请求悔棋，也可直接回复同意或拒绝表决 |
| `cchess.认输` | 认输 |
| `cchess.结束` | 强制结束棋局 |
| `cchess.棋绩 [@某人/榜] [胜场/输场] [人数]` | 查询战绩与排行榜 |
| `cchess.查看云库残局 [DTM/DTC]` | 云库残局统计 |

发送 `cchess.开始` 即入座，双方就位后自动开局，无需单独的加入与退出指令。

着法可直接发送，例如 `炮二平五` 或 `b2e2`。

悔棋请求送出后，对方直接回复 `同意` 或 `拒绝` 即可表决，不必带指令前缀。

## 许可证

可按 [Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 使用。
