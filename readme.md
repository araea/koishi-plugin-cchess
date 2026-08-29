koishi-plugin-cchess
====================

[<img alt="github" src="https://img.shields.io/badge/github-araea/cchess-8da0cb?style=for-the-badge&labelColor=555555&logo=github" height="20">](https://github.com/araea/koishi-plugin-cchess)
[<img alt="npm" src="https://img.shields.io/npm/v/koishi-plugin-cchess.svg?style=for-the-badge&color=fc8d62&logo=npm" height="20">](https://www.npmjs.com/package/koishi-plugin-cchess)

Koishi 的中国象棋插件。支持人人/人机对战。

## 使用

1. 安装 `puppeteer` 服务。
2. 为常用指令设置别名（如「加入」「认输」「悔棋」）。

## 指令

| 指令 | 说明 |
| --- | --- |
| `cchess.加入 [红/黑]` | 入座并选择阵营，省略则随机 |
| `cchess.退出` | 开局前离席 |
| `cchess.开始.人人对战` | 与好友手谈（至少 2 人） |
| `cchess.开始.人机对战` | 挑战皮卡鱼（至少 1 人） |
| `cchess.移动 <着法>` | 落子，亦可直接发送着法 |
| `cchess.悔棋.请求` | 请求悔棋，人机模式下立即生效 |
| `cchess.认输` | 推枰认负 |
| `cchess.结束` | 强制清盘 |
| `cchess.编辑棋盘.导入 <FEN>` | 由指定局面开局 |
| `cchess.编辑棋盘.导出` | 导出当前局面 |
| `cchess.排行榜.总胜场 [人数]` | 查看胜场榜 |
| `cchess.查询玩家记录 [@某人]` | 查看棋士战绩 |

## 注意事项

着法用纵线（炮二平五 / 炮8平5）或字母坐标（b2e2）。详见 [中国象棋着法表示](https://www.xqbase.com/protocol/cchess_move.htm)。

人机强弱看配置里的「引擎思考深度」：越高棋力越强，耗时也越长。

## 致谢

- [Koishi](https://koishi.chat/)
- 风满楼 — 棋盘与棋子素材
- [皮卡鱼](https://xiangqiai.com/#/)
- [中国象棋云库](https://www.chessdb.cn/query/)
- [中国象棋应用规范](https://www.xqbase.com/protocol/cchess_intro.htm)

## QQ 群

- 956758505

<br>

#### License

<sup>
Licensed under either of <a href="LICENSE-APACHE">Apache License, Version
2.0</a> or <a href="LICENSE-MIT">MIT license</a> at your option.
</sup>

<br>

<sub>
Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in this crate by you, as defined in the Apache-2.0 license, shall
be dual licensed as above, without any additional terms or conditions.
</sub>
