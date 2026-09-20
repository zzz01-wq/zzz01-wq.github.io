# 素材、依赖与许可记录

## 游戏素材（2026-09-20 更新）

本版本已采用第三方模型，均保存于 `public/models/`，无需运行时联网下载。

| 素材 | 作者和原始页面 | 许可 | 本地用途 |
| --- | --- | --- | --- |
| Zombie Apocalypse Kit | [Quaternius](https://quaternius.com/packs/zombieapocalypsekit.html) | CC0 1.0 | 德国牧羊犬、旧版感染者（源文件保留，当前不加载）、手枪／猎枪／步枪／缠线球棒、皮卡、卡车、油桶、木托盘、垃圾袋、路障、沙发、箱子 |
| Stylized Nature MegaKit · Standard 免费版 | [Quaternius](https://quaternius.com/packs/stylizednaturemegakit.html) | CC0 1.0 | 松树、枯树、灌木、草丛 |
| Thin Zombie · Awake Zombie Asset | [Rosswet Mobile / dogchicken](https://opengameart.org/content/thin-zombie-awake-zombie-asset) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 当前感染者模型、皮肤贴图与待机／行走／奔跑／攻击／受击／死亡动画 |
| WRAD ARMS | [wriks](https://wriks.itch.io/wrad-arms) | CC0 1.0 | 带 50 个骨骼节点的第一人称双臂、手掌、手指与皮肤贴图 |

Quaternius 模型文件取自公开的 [FreeModels 分发仓库](https://github.com/agentkaerf/FreeModels)，同时核对作者原始发布页面与包内许可；手臂从 wriks 的 itch.io 免费下载入口获取。Quaternius 与 wriks 模型保留原始网格和贴图，在运行时调整比例、颜色、朝向、材质及骨骼姿势。狗使用包内动画，手臂使用项目自定义的双骨骼 IK、手指握持及换弹运动。

当前感染者采用 **Thin Zombie by Rosswet Mobile**，依据 **CC BY 3.0** 使用与修改。原始下载为作者在上述页面提供的 `new_thin_zom.zip`。修改：校验旧 Blender 网格、将原贴图连接到 PBR 材质、将六个原始动作烘焙并重命名、导出嵌入贴图的 GLB、调整游戏内比例与朝向。转换脚本为 `scripts/convert-zombie.py`。作者未参与本游戏，也不表示为本游戏背书。署名亦随构建保存在 `public/credits.html`，可从暂停菜单访问。

原始许可文本保存在：

- `public/models/licenses/quaternius-zombie-CC0.txt`
- `public/models/licenses/quaternius-nature-CC0.txt`
- `public/models/licenses/wrad-arms-CC0.txt`
- `public/models/licenses/rosswet-zombie-CC-BY-3.0.txt`

末日模型包的 `License.txt` 标题误写为 “Ultimate Platformer Pack”，其 CC0 正文与作者的 Zombie Apocalypse Kit 官方页面一致；保留原文并在此说明。

建筑主体、道路布局、招牌与部分家具仍由项目代码生成。环境音与射击音仍由 Web Audio 合成。系统字体不随项目分发。

## Three.js

- 来源：https://github.com/mrdoob/three.js
- 官方文档：https://threejs.org/docs/pages/WebGLRenderer.html
- 第一人称鼠标捕获相关参考：https://threejs.org/docs/pages/PointerLockControls.html
- 许可：MIT（已核对所安装包的 `node_modules/three/LICENSE`）
- 用途：WebGL 渲染、网格、光照、射线检测、静态几何合并。

The MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## 开发工具

- Vite：https://github.com/vitejs/vite ，MIT。仅用于开发与构建。
- Playwright：https://github.com/microsoft/playwright ，Apache-2.0。仅用于浏览器验证。

锁定的具体版本见 `package-lock.json`，依赖各自完整许可随其 npm 软件包提供。
