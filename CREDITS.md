# 素材与玩法来源

本合集是奶蛙非官方同人作品。角色外观参考来自用户提供的图片，游戏角色图由内置 imagegen 为本项目生成；原角色及参考资料的相关权益仍归各自权利人。本说明记录来源，不另行授予代码或素材许可。

## 角色素材

下列路径相对于合集网站根目录。人物使用生成图，场景、物件、按钮与文字分别由 Canvas、HTML、CSS 或 SVG 实现。

| 使用位置 | 实际素材路径 | 制作方式 |
| --- | --- | --- |
| 合集首页 | `assets/奶蛙_街机入口.png` | 用户角色参考＋内置 imagegen，透明入口插画。 |
| 托盘 | `games/tray/assets/naiwa-steady.png`、`games/tray/assets/naiwa-laugh.png` | 用户角色参考＋内置 imagegen，支撑托盘姿态及狂笑表情编辑。 |
| 倒放 | `games/rewind/assets/naiwa-idle.png`、`games/rewind/assets/naiwa-laugh.png` | 用户角色参考＋内置 imagegen，站立与狂笑两张图。 |
| 图书馆 | `games/library/assets/naiwa-poses.png` | 用户角色参考＋内置 imagegen，行走、憋笑、放声三姿态透明图。 |
| 接力 | `games/relay/assets/naiwa-states.png` | 用户角色参考＋内置 imagegen，憋笑、爆笑、喘气三态图。 |
| 弹珠 | `games/pegs/assets/naiwa-expressions.png` | 用户角色参考＋内置 imagegen，持球、大笑、沮丧三表情图。 |
| 滑行 | `games/slide/assets/naiwa-slide.webp`、`games/slide/assets/naiwa-laugh.webp` | 用户角色参考＋内置 imagegen，坐滑与抱肚大笑；生成 PNG 经缩小、编码为透明 WebP。 |
| 叠塔 | `games/stack/assets/naiwa-seated.png`、`games/stack/assets/naiwa-sheet.png` | 用户角色参考＋内置 imagegen，四帧坐姿；切帧、底部对齐后组成透明图集与菜单图。 |
| 圈地 | `games/territory/assets/naiwa-atlas.png` | 用户角色参考＋内置 imagegen，呆脸、狂笑及边角装饰。 |

## 玩法参考

经典小游戏提供了交互方向。以下链接用于说明参考出处，没有从参考网站下载现成图片、GIF、音频、关卡或游戏代码。

| 游戏方向 | 参考 | 借鉴的交互思路 |
| --- | --- | --- |
| 弹珠 | [Peggle — EA](https://www.ea.com/games/peggle/peggle) | 瞄准发射、弹跳清钉、有限球数与接球回收。 |
| 滑行 | [Icy Purple Head — Coolmath Games](https://www.coolmathgames.com/0-icy-purple-head) | 滑行与停下的路线选择；本作独立实现网格、点心、薄冰与有限急刹。 |
| 叠塔 | [Stack — App Store](https://apps.apple.com/us/app/stack/id1080487957) | 一键落块、对齐与重叠裁切；本作加入三连稳固、笑晃及固定终点。 |
| 圈地 | [Arcade Archives QIX — Nintendo](https://www.nintendo.com/en-ca/store/products/arcade-archives-qix-switch/) | 离开安全区域画线、闭合占地与保护未闭合线路。 |

前四款分别围绕托盘支点、人物倒放但环境保留、憋笑潜行与延迟传声设计。[Milkyfrog 游戏目录](https://milkyfrog.com/)与[BigNaiWa 公开仓库](https://github.com/YHSome/BigNaiWa)用于了解已有同人作品，没有作为本合集代码或素材的下载来源。[naiwa.world](https://www.naiwa.world/)未取得完整正文，不将未读内容作为角色设定依据。

## 字体与声音

页面使用设备字体和浏览器原生能力，不分发字体文件，不依赖 CDN 或在线字体。全程静音，不使用参考网站原声，不请求麦克风。素材处理与浏览器测试工具仅用于制作，不是网页运行依赖。
