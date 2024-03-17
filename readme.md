# koishi-plugin-cchess-pikafish

[![npm](https://img.shields.io/npm/v/koishi-plugin-cchess-pikafish?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-cchess-pikafish)

## 🎐 简介

欢迎来到《中国象棋》游戏！支持人人对战和人机对战（皮卡鱼轻量版引擎），提供纵线和坐标方式操作，支持编辑棋盘、导入/导出FEN等功能。此外，还有丰富的棋盘和棋子皮肤可供选择，并配备排行榜系统。🎪

## 🎉 安装

您可通过 Koishi 插件市场搜索并安装该插件。

## 🌈 使用

- 建议自行添加别名，如 `cc` 等更方便的指令。
- 请安装并启用所需服务，`canvas` 服务可使用 `puppeteer` 提供。
- 支持使用中国象棋纵线和字母坐标进行移动。[了解详情 - 中国象棋着法表示](https://www.xqbase.com/protocol/cchess_move.htm)

## ⚙️ 配置项

- `boardSkin`: 棋盘皮肤，可选值有：木制棋盘、玉石太极棋盘等数十种精美皮肤。
- `pieceSkin`: 棋子皮肤，可选值有：红黑棋子、隶书棋子等数十种不同风格。
- `defaultEngineThinkingDepth`: 默认 AI 思考深度，数值越大棋力越强，但耗费资源也更多。
- `retractDelay`: 自动撤回等待时间（秒），设为0则不自动撤回。
- `imageType`: 发送图片类型，可选 `png/jpeg/webp`。
- `isTextToImageConversionEnabled`: 是否开启文字转图片功能（可选）。
- `isChessImageWithOutlineEnabled`：是否为象棋图片添加辅助外框，关闭后可以显著提升图片速度，但无辅助外框，玩起来可能会比较累。

## 🌼 指令

- `cchess.退出`: 退出当前游戏。
- `cchess.结束`: 强制结束本局游戏。
- `cchess.认输`: 认输结束本局游戏。
- `cchess.排行榜.总胜/输场`: 请求悔棋操作。
- `cchess.开始.人人对战`: 开始人人对战模式。
- `cchess.开始.人机对战`: 开始人机对战模式。
- `cchess.悔棋.请求/同意/拒绝`: 请求悔棋操作。
- `cchess.加入 [红/黑]`: 加入游戏，可选红/黑方。
- `cchess.查看云库残局.DTM统计/DTC统计`: 查看云库残局统计。
- `cchess.查询玩家记录 [@某人 或 不填则查自己]`: 查询玩家记录。
- `cchess.编辑棋盘.导入/导出/使用方法`: 导入/导出棋盘状态与fen使用方法。

## 🍧 致谢

- [Koishi](https://koishi.chat/) - 出色的机器人框架 🤖
- [风满楼]() - 提供棋盘与棋子素材 🎨
- [皮卡鱼网页版](https://xiangqiai.com/#/) - 强大的象棋引擎 🐟
- [中国象棋电脑应用规范](https://www.xqbase.com/protocol/cchess_intro.htm) - 遵循标准规范 📜
- [中国象棋云库查询](https://www.chessdb.cn/query/) - 囊括海量棋谱 📖

## ✨ License

MIT License © 2024 💫

希望您喜欢这款插件！

如有任何问题或建议，欢迎联系我哈~ 🎈
