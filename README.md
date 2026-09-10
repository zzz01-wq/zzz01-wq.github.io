# AI 游戏项目

这是一个用于 GitHub Pages 的静态游戏作品集，首页会持续收录后续开发的网页游戏与实验作品。

当前仓库只有两个基础文件：

```text
.
├── index.html   # 作品集首页
└── README.md    # 项目说明
```

## 添加一个游戏

建议每个游戏使用一个独立目录，并把它自己的入口文件命名为 `index.html`：

```text
.
├── index.html
├── README.md
└── my-game/
    ├── index.html
    ├── assets/
    └── ...
```

然后打开根目录的 `index.html`，找到底部的 `const games = [];`，填入一条记录：

```js
const games = [
  {
    title: "我的第一个游戏",
    subtitle: "横版冒险 / 开发中",
    description: "一句话介绍这个游戏的玩法或灵感。",
    path: "./my-game/",
    tags: ["HTML5", "实验"],
  },
];
```

推荐使用小写英文和短横线命名游戏目录，例如 `space-runner/`，这样可以减少 URL 编码和路径问题。

## 发布到 GitHub Pages

1. 将本项目推送到 GitHub 仓库。
2. 打开仓库的 `Settings` → `Pages`。
3. 在 `Build and deployment` 中选择 `Deploy from a branch`。
4. 选择默认分支（通常是 `main`）和根目录 `/ (root)`，保存即可。

这个项目不需要安装依赖或执行构建命令，GitHub Pages 会直接托管根目录中的静态文件。

## 注意事项

- 每个游戏目录都应包含可直接打开的 `index.html`。
- 游戏内部引用图片、脚本和样式时，尽量使用相对路径，例如 `./assets/main.js`。
- 如果游戏使用了构建工具，请先把构建后的静态产物放入对应的游戏目录，再登记入口。
