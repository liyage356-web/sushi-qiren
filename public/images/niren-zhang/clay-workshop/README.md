# 泥人张自由捏泥工坊素材

本目录使用用户提供的 8 张基础素材，并在不删除原始
`.png.png` 文件的前提下整理出规范文件名。

## 泥团素材

- `clay/clay-lump.png`：右侧初始泥团参考，不承担可编辑几何。
- `clay/clay-texture.png`：可编辑泥团主体的纹理填充。
- `clay/clay-highlight.png`：裁切在路径内的局部高光辅助层。
- `clay/clay-indent.png`：裁切在路径内的局部凹陷辅助层。
- `clay/clay-small.png`：工具栏“加泥”视觉提示。

## 环境与工具

- `environment/wood-table.png`：工坊背景。
- `environment/tool-carving.png`：“刻划”工具图标。
- `environment/tool-smooth.png`：“抹平”工具图标。

## 人物参考

- `reference/haizhangwu-front.png`：来自用户提供的
  `传统水墨人物与山水折扇.png`，用作正面参考。
- `reference/haizhangwu-profile.png`：来自用户提供的
  `传统帽饰下的微笑侧影.png`，用作侧影辅助参考。

两张参考图只用于观察，不会进入可编辑图层，也不会默认加入 PNG 导出。

辅助贴图均不能替代泥团几何。当前泥团由
`web/ni-ren-zhang-clay-workshop.js` 中 64 个轮廓采样点生成。
拖动泥团表面会按位置和力度更新附近采样点；纹理通过同一个
闭合路径裁切。泥块和刻痕分别保存为独立对象。
