# 《四十八样》第一至第五阶段图片素材

页面中的图片统一从本文件夹读取。正式替换素材时，优先保留下列文件名，即可避免改动页面结构。

| 文件 | 页面用途 | 原始素材 |
| --- | --- | --- |
| `tianjin-street.jpg` | 天津老街前景、中景、远景场景 | `output/C1_4K.jpg` |
| `yu-liu.jpg` | 俞六人物主图与人物札记 | 用户提供的 `22.jpg` |
| `yu-liu-cutout.png` | 街景中的透明背景俞六前景 | 现有 `web/images/characters/si-shi-ba-yang-cutout.png` |
| `street-storyboard.jpg` | 人物站、挑、取、绕动作参考 | 用户提供的 `2B.png` |
| `traditional-candy-12-grid.png` | 十二样药糖完整图鉴源文件，供后续追溯与重新裁切 | 用户提供的十二格图鉴 |
| `candy-12/*.png` | 十二样药糖的独立卡片与详情图 | 从十二格图鉴按原边框拆分 |
| `candy-gallery.jpg` | 旧版八样药糖图集，仅作为历史素材保留 | 用户提供的旧版糖品图录 |
| `walk8/walk8-ground.png` | 走八字俯视街口石地背景 | 用户提供的 `walk8-ground.png.png` |
| `walk8/bucket-left.png` | 走八字左侧药糖桶柜透明图 | 用户提供的 `bucket-left.png.png` |
| `walk8/bucket-right.png` | 走八字右侧药糖桶柜透明图 | 用户提供的 `bucket-right.png.png` |
| `walk8/yu-liu-idle.png` | 俞六起势与停步姿态 | 用户提供的 `yuliu-top-idle.png.png` |
| `walk8/yu-liu-left.png` | 俞六向左绕行姿态 | 用户提供的 `yuliu-top-left.png.png` |
| `walk8/yu-liu-right.png` | 俞六向右绕行姿态 | 用户提供的 `yuliu-top-right.png.png` |
| `walk8/yu-liu-switch.png` | 俞六中央换手姿态，素材已含铜勺 | 用户提供的 `yuliu-top-switch.png.png` |
| `walk8/yu-liu-carry.png` | 俞六挑完整黑漆双桶担的背面表演图，红绒球和龙头同框 | 从项目已有的 `candy-cabinet.jpg` 构图裁切 |
| `walk8/yu-liu-walk8-portrait.png` | 第一阶段历史人物裁图，保留作回归素材 | 从 `yu-liu-cutout.png` 同画风裁切 |
| `candy-cabinet.jpg` | 二龙戏珠挑担的装配结构与制作图样 | 用户提供的 `3B.png` |
| `crowd.jpg` | 走八字喝彩与第五阶段六句词的围观街坊背景 | 用户提供的 `5B.png` |
| `candy-tools.jpg` | 糖盒、铜勺和纸兜器物图 | 用户提供的 `6B.png` |
| `imitation-market.webp` | 第四阶段“街口被仿”场景，页面主资源 | 用户提供的《俞六药糖街市甘味铺》 |
| `innovation-talk.webp` | 第四阶段“后院问计 / 三项变法”场景，页面主资源 | 用户提供的《老少街谈药糖摊》 |
| `signature-carry.webp` | 第四阶段“三改收束”结果场景，页面主资源 | 用户提供的《水墨糖果桶与庭院人物》 |

图片缺失时，`script.js` 会为对应容器显示纸面占位文字，不会让页面脚本报错。

当前已完成第一至第五阶段。`candy-12/` 用于糖柜十二样试看，
`candy-cabinet.jpg` 用于二龙戏珠装配参考；`street-storyboard.jpg` 与 `crowd.jpg`
用于走八字动作、喝彩反馈和六句词街景。第四阶段新增的三张 PNG 保留为原始素材，
页面实际加载同名的压缩 WebP 文件；替换正式插画时建议保持 WebP 文件名不变。

## 走八字路线引导素材状态

项目当前使用 `web/si-shi-ba-yang/assets/walk8/` 作为专用素材目录：

- 地面：使用完整俯视石地背景图。
- 双桶：左右各一张透明 PNG，保持固定位置。
- 人物：起势、左绕、右绕和换手四张透明 PNG，按 SVG 路径进度切换。
- 取糖：左、右取糖节点用 CSS 铜勺短暂反馈；换手图已含铜勺，不重复叠加。
- 换手：到达路径中央节点后暂停，点击按钮或按空格键完成一次换手。
- 完整表演：路线与换手全部完成后，过渡到天津老街背景；以完整挑担背面图
  作为整体表演主体，不做人物与桶柜的错位拼接。

后续表演阶段仍可补充：

1. 完成八字后的挑担收势姿态。
2. 围观喝酒喝彩阶段的旁观人物姿态。
3. 所有后续素材继续保持透明背景，并沿用当前 1920×1080 场景坐标。
