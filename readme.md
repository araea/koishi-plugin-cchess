koishi-plugin-cchess
====================

[<img alt="github" src="https://img.shields.io/badge/github-araea/koishi__plugin__cchess-8da0cb?style=for-the-badge&labelColor=555555&logo=github" height="20">](https://github.com/araea/koishi-plugin-cchess)
[<img alt="npm" src="https://img.shields.io/npm/v/koishi-plugin-cchess.svg?style=for-the-badge&color=fc8d62&logo=npm" height="20">](https://www.npmjs.com/package/koishi-plugin-cchess)

Koishi 的中国象棋插件。

## 使用

`cchess.加入` 入座，`cchess.开始.人人对战` 或 `cchess.开始.人机对战` 开局。着法可直接发送，如炮二平五或 `b2e2`。

## 指令

| 指令 | 说明 |
| --- | --- |
| `cchess.加入 [红/黑]` | 入座 |
| `cchess.退出` | 开局前离席 |
| `cchess.开始.人人对战` | 人人对战 |
| `cchess.开始.人机对战` | 人机对战（皮卡鱼） |
| `cchess.移动 <着法>` | 落子 |
| `cchess.悔棋.请求` | 悔棋 |
| `cchess.认输` | 认输 |
| `cchess.结束` | 强制清盘 |
| `cchess.编辑棋盘.导入 <FEN>` | 导入局面 |
| `cchess.编辑棋盘.导出` | 导出局面 |
| `cchess.排行榜.总胜场 [人数]` | 胜场榜 |
| `cchess.查询玩家记录 [@某人]` | 查看战绩 |

## QQ 群

956758505

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
