# 狗不理制作台素材

制作台从本目录读取四个工序的场景图与主体图。素材存在时自动替换页面中的
CSS 占位图；素材缺失时保留带文件名说明的占位区域，不显示破图图标。

建议使用 16:9 的 WebP 或 PNG 场景图，主体图使用透明背景 PNG 或 WebP。

| 工序 | 场景图 | 主体图 |
| --- | --- | --- |
| 调馅 | `scene-mixing.webp` | `bowl-mixing.webp` |
| 包制 | `scene-wrapping.webp` | `dough-wrapping.webp` |
| 十八褶 | `scene-pleating.webp` | `baozi-pleating.webp` |
| 揭笼 | `scene-steaming.webp` | `steamer-steaming.webp` |

制作页的四张流程概览图分别使用：

- 调馅：`overview-mixing.webp`
- 包制：`overview-wrapping.webp`
- 十八褶：`overview-pleating.webp`
- 揭笼：`overview-steaming.webp`

当前正式素材由提供的原图转换得到；包制、十八褶与揭笼分别选用了
裹馅、捏褶和开笼出汽的画面，避免跨工序复用调馅静物。

调馅互动层使用按透明边界裁切后的正式素材：

- 猪肉馅：`ingredient-meat-position.webp`
- 葱花：`ingredient-scallion-position.webp`
- 排骨汤：`ingredient-soup-position-v2.webp`
- 排骨汤倾倒动画：`ingredient-soup-pouring.webp`
- 猪油：`ingredient-fat-position.webp`
- 筷子：`chopsticks-click-v2.webp`

这些物件的坐标以《水彩木桌上的空花纹陶碗》为基准。后续重新裁切时运行
`scripts/prepare_mixing_alignment_assets.py`；筷子直接从参考图提取，避免使用
程序绘制的近似图形。

四个物件按参考图中的透明边界逐像素校准：猪肉、葱花、小汤碗、猪油分别落在
`408 × 199`、`307 × 159`、`320 × 210`、`350 × 206` 的参考坐标框内。小汤碗
框略大于底图旧碗，用于把旧碗边缘完全盖住；CSS 中的百分比保持这些像素边界，
因此在桌面端和移动端等比缩放时仍与底图吻合。

调馅过程的碗内画面使用六阶段素材：

| 画面状态 | 素材 |
| --- | --- |
| 猪肉馅入碗 | `mixing-after-meat.webp` |
| 葱花入碗 | `mixing-after-scallion.webp` |
| 排骨汤倒完 | `mixing-after-soup.webp` |
| 食材齐备 | `mixing-ingredients-ready.webp` |
| 筷子入碗 | `mixing-chopsticks-in-bowl.webp` |
| 肉馅调匀 | `mixing-complete.webp` |

前两张直接使用本轮提供的 `mix-01` 与 `mix-02` 全场景图。
`mixing-after-soup.webp` 使用 `mix-03` 作为倒完排骨汤后的碗内画面。
点击上方汤碗时，`ingredient-soup-pouring.webp` 会从原位置移到中央大碗上方
并倾出汤汁，动画结束后才进入猪油步骤。倒汤、筷子入碗和完成状态使用整幅
场景，此时隐藏交互层里重复绘制的筷子；只有需要用户点击、拖入碗中的步骤才
显示独立筷子物件。

倾倒期间使用 `scene-soup-pour-background-v2.webp` 作为临时全屏背景，动画
结束后恢复原有场景层；汤碗、界面控件和其他步骤状态不随之改变。

调馅主场景用 `mixing-soup-occlusion-mask-v2.png` 按青花大碗的实际轮廓遮住
后方小汤碗的底部。大碗状态层位于小汤碗上方，遮挡边缘沿碗沿曲线变化，不显示
矩形接缝；汤碗上部仍保留足够大的可点击区域。

排骨汤碗覆盖层按底图中空汤碗的外轮廓放大，完整遮住原碗后再由前景大碗
沿曲线截住下半部，因此底图中的旧碗边缘不会从新碗四周露出。

如需更换扩展名，只修改 `web/gou-bu-li-craft.js` 顶部的 `ASSETS` 配置。
