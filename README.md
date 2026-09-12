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
| `cchess.加入 [红/黑]` | 入座 |
| `cchess.退出` | 开局前离席 |
| `cchess.开始 [人人/人机]` | 开局，默认人人对战 |
| `cchess.移动 <着法>` | 落子 |
| `cchess.悔棋` | 请求悔棋 |
| `cchess.悔棋 <同意/拒绝>` | 表决悔棋 |
| `cchess.认输` | 认输 |
| `cchess.结束` | 强制结束棋局 |
| `cchess.编辑棋盘 <FEN>` | 导入局面 |
| `cchess.编辑棋盘.导出` | 导出局面 |
| `cchess.查看云库残局 [DTM/DTC]` | 云库残局统计 |
| `cchess.排行榜 [胜场/输场] [人数]` | 排行榜 |
| `cchess.查询玩家记录 [@某人]` | 战绩 |

着法可直接发送，例如 `炮二平五` 或 `b2e2`。

悔棋请求送出后，对方直接回复 `同意` 或 `拒绝` 即可表决，不必带指令前缀。

## 许可证

可按 [Apache-2.0](LICENSE-APACHE) 或 [MIT](LICENSE-MIT) 使用。
