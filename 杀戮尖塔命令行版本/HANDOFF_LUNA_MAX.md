# 杀戮尖塔 2 网页命令版：继续开发交接

交接日期：2026-09-21（本轮进展已更新）。本文记录当前代码与验证状态；不是功能完成报告。

## 1. 新对话可直接使用的任务提示

> 继续开发 Steam Build 23811903 目标的《杀戮尖塔 2》战士命令终端。先看 `docs/engine-coverage.md` 和本交接中的最新状态，已通过的构建、战斗、选择、房间、存档和 HTTP 测试不要沿用旧结论或重复声称未完成。玩法依据仍只能来自提供的原版文件；目标版本来源尚未独立证明；不可宣称完整规则 1:1。沿用“网页 → Python HTTP 桥 → Godot Mono → 原版 sts2.dll”架构。后续优先做真实浏览器/移动端验收、TestMode 分支全面盘点、未覆盖房间与内容、服务生命周期/安全边界以及安装和 README。每项记录原版依据、修改文件、真实验证和剩余限制。

模型由用户在新对话界面选择；上面的文字本身不能切换模型。如果当前环境不支持指定的 subagent 模型，应明确说明，不要谎报模型。

## 2. 用户已经确定的要求

1. 版本以 **Steam Build ID 23811903** 为准。
2. 首个职业是战士 / Ironclad。
3. 最终产品必须是网页可玩的游戏；不是只有系统终端程序。
4. 网页内部提供自己的命令输入框、命令语法、状态和日志；不是 F12 控制台。
5. 出牌、结束回合、选路、事件、奖励、商店、药水等游戏操作全部用命令完成。
6. 玩法与设定要求遵循原版，不能自行编造卡牌数值、敌人 AI、地图、事件效果、奖励概率或进阶规则。
7. Wiki 可以辅助查证，但不能覆盖本版本原版文件的实际行为。
8. 用户已经提供原版文件；目前可以继续开发，不要再次泛泛要求用户提供整套游戏。
9. 先做战士不意味着已经授权把其他影响战士流程的无色牌、诅咒、事件、遗物、药水和敌人删掉。

当前工程偏向单人战士流程。多人模式尚未实现；不要把这个范围说成完整游戏所有模式均已还原。

## 3. 当前状态：务必区分代码与验证

下表由 2026-09-21 本轮执行结果更新。细节、原版依据和边界以 `docs/engine-coverage.md` 为准。

| 模块 | 已落地 | 本轮验证与剩余缺口 |
| --- | --- | --- |
| 原版资料 | DLL、PCK、依赖；提取文本；哈希清单；暂存 DLL 的选择桥补丁器 | 引擎 smoke 比对清单哈希；Build 归属仍未独立核验 |
| Godot 托管宿主 | `runtime/Main.cs`、Godot 场景与 `runtime/ChoiceAdapters.cs` | 最新重编译通过，0 warning、0 error；headless/TestMode 行为仍有差异 |
| 战士战斗 | 原版 ActionQueue、出牌、回合、战斗奖励 | `engine_smoke` 通过；固定首战和少量卡牌，不代表全卡池 |
| 选择交互 | 单选/多选/可跳过/嵌套、原版卡牌组合和遗物桥 | 隔离的 choice adapter smoke 通过；真实遭遇仍需扩大 |
| 房间流程 | 地图、事件、商店、休息、宝箱和奖励命令 | 固定种子 room-flow smoke 通过所列路径；精英、Boss、全部事件分支未覆盖 |
| TestMode | 快照标记 `TestMode/headless`；关键章节/教程与选择差异已核对并记录 | 还没有逐项审计所有 `TestMode` 分支，也没有普通图形模式对照 |
| 存档 | 原版自动写入 `SerializableRun`；`continue`、`abandon` | 独立 Godot 进程之间恢复奖励检查点通过；生产默认 `user://terminal-save`，测试使用仓库内隔离路径 |
| Python HTTP 桥 | Cookie 会话、HTTP 命令、静态网页 | `tests/http_smoke.py` 经真实 loopback HTTP 验证 help/new/move/play/end/abandon；并发、错误边界和崩溃恢复未覆盖 |
| 网页 | 自有命令框、日志与状态视图、`/api/command` 绑定 | 页面静态资源 + HTTP 命令已验证；实际浏览器操作、IME/移动端和视觉验收未做 |
| 自动化测试 | `tests/engine_smoke.py`、`choice_adapters_smoke.py`、`room_flow_smoke.py`、`save_smoke.py`、`http_smoke.py` | 五项本轮均通过；报告在 `.cache/*-smoke.json` |
| README / 准备工具 | 原版提取脚本与运行依赖暂存 | README 和一键准备/构建入口仍待补 |

最新构建日志：`.cache/build-20260921-persistent-smoke.log`。本轮没有保留常驻网页服务；`http_smoke.py` 自行启动并关闭测试服务。

## 4. 目录与资料索引

项目根目录：`/Users/kamesan/Documents/AI游戏项目/杀戮尖塔命令行版本`

| 路径 | 用途 |
| --- | --- |
| `reference/` | 用户提供的原版输入，保持不改动 |
| `docs/sources.md` | 官方来源与版本资料说明 |
| `docs/reference-manifest.json` | 输入文件哈希和 Build 核验状态 |
| `docs/interface.md` | 网页交互和视觉方向 |
| `tools/extract_reference.py` | 校验 PCK 条目并提取文本、生成清单 |
| `.cache/source/` | 可读性较好的 DLL 反编译源码，优先使用 |
| `.cache/decompiled/` | 早期低质量反编译，异步代码可读性差 |
| `.cache/extracted/` | 先前解包结果，包含空的 .cs 条目 |
| `.tools/ilspycmd` | 已安装的 ILSpy 命令工具 |
| `.tools/godot/Godot_mono.app/` | 官方 Godot Mono 4.5.1 |
| `runtime/Main.cs` | 命令解析、原版调用、状态快照与选择等待 |
| `runtime/SpireCli.csproj` | Godot.NET.Sdk 4.5.1 / net10.0 |
| `runtime/NuGet.Config` | 使用本机 Godot 附带 nupkg |
| `runtime/lib/` | 运行依赖的暂存副本；`sts2.dll` 为命令选择桥接过的运行副本，原版输入不改 |
| `runtime/ChoiceAdapters.cs` | 原版卡牌组合、遗物与卡牌奖励替代项的窄范围命令桥 |
| `tools/sts2-bridge-patcher/` | 校验 manifest 哈希/MVID 后仅补丁运行副本的 Mono.Cecil 工具 |
| `runtime/localization/` | 从原版 PCK 提取的中英文本 |
| `runtime/.godot/` | 生成文件和构建输出 |
| `server.py` | 本机 HTTP、会话管理、Godot 子进程桥 |
| `web/` | 网页静态资源 |
| `.cache/smoke.out`、`.cache/smoke.err` | 旧代码的冒烟证据，不适用于最新版 |
| `.cache/build.log` | 旧构建日志 |
| `.cache/service-logs/` | 服务启动的 Godot 日志 |
| `tests/` | 五项自动化 smoke；不覆盖完整规则或图形模式 |
| `docs/engine-coverage.md` | 当前覆盖表、原版依据、验证证据和差异 |

交接时没有发现项目级 AGENTS.md，也没有初始化 Git 仓库。新对话仍应检查是否新增了约束文件。

`.gitignore` 已忽略 reference、.cache、.tools、运行依赖、提取文本、构建缓存及 saves。不要把原版 DLL/PCK、完整反编译源码或用户存档打包进公开仓库。

## 5. 版本与来源边界

用户指定 Build 23811903；公开版本索引将其映射到 v0.107.1 / public 主分支，2026-06-19。索引是辅助证据，不能证明当前本机文件一定属于该 Build。

交接时没有找到 `release_info.json` 或 `appmanifest_2868840.acf`。清单的 `build_verified` 因此是 **false**，不得仅凭用户指定的数字或某篇 Wiki 把它改成 true。

原版输入 SHA-256：

```text
SlayTheSpire2.pck
42520eb8b0911c6c0f0bd102d92b33f41abd4d26b83489817d0a6dbd7dd48587

sts2.dll
a1f9e653f1e28e4076558fee1e60d218619cb7e057b887c6417f62c62c6d7a52
```

PCK 最终大小 1901378340 字节；格式 v3，Godot 4.5.1，15658 条目；提取校验了 93 个本地化文件。最早读取时 PCK 仍在复制，旧临时哈希不能使用，以清单为准。

DLL 目标 net9.0，程序集版本 0.1.0，InformationalVersion：
`0.1.0+59260271157f76a2896f0eab5bc6ea1245d8b314`。

规则证据优先顺序：本机该版本原版代码和文本 → 对应官方更新与说明 → 社区索引/Wiki 辅助。发生冲突记录差异，不自行挑一个“看起来合理”的规则。

如用户后续补齐版本文件，再对照发布信息和 Steam 安装清单，保留核验方法。缺少版本证明不阻止目前基于现有文件继续适配，但最终交付必须说明这一限制。

## 6. 架构与协议，不要推倒重写

```text
网页内置命令框
  → POST /api/command {"command":"play 1 2"}
  → Python 会话锁与输入校验
  → 对应会话的 Godot Mono 无窗口子进程 stdin
  → Main.cs 调用原版 sts2.dll
  → stdout 中 @@SPIRE@@ 开头的单行 JSON
  → HTTP 返回快照，网页更新日志、手牌、敌人、选项和角色状态
```

每个会话独立启动 Godot 进程，以隔离原版单例。Godot stdout 还包含其他日志，服务必须只解析协议前缀，不应把所有输出当 JSON。

`Main` 是 Godot Node。规则调用留在 Godot 主线程；后台线程仅用于读取 stdin。原版异步动作需要引擎帧循环推进，不能随意改成普通 dotnet console 或在任意 HTTP 工作线程直接调用规则。

快照以当前 `Publish` 实现为准，主要字段有：

```text
prompt, messages[], phase, seed, act, floor, location,
player{name,hp,maxHp,block,gold,energy,maxEnergy,turn,deck,draw,discard,
       exhaust,powers[],relics[],potions[]},
hand[], enemies[], options[], eventText, routes[], canLeave, busy
```

编号属于当前快照；手牌消耗、敌人死亡、奖励领取后必须重新读取。不要让前端缓存过期编号后继续操作。

## 7. 当前环境的构建和启动步骤

以下命令均从项目根目录运行。先确认工具路径存在，不必重新下载已有工具。

### 7.1 本机工具

- macOS ARM64；Python 3、Node 22 已安装。
- .NET SDK 10.0.102、运行时 10.0.2。
- dotnet：`/opt/homebrew/bin/dotnet`。
- DOTNET_ROOT：`/opt/homebrew/opt/dotnet/libexec`。
- Godot：`.tools/godot/Godot_mono.app/Contents/MacOS/Godot`。

### 7.2 提取原版文本（只有文件变化或准备重建时才需重复）

```sh
python3 tools/extract_reference.py
```

脚本校验路径、文件边界、选中条目的 MD5 和 JSON，并生成清单。PCK 中 .cs 文件是零字节，不能把它们当规则源码。

已有 `.cache/source/` 时不需要重反编译。如确实需要，当前环境可用：

```sh
DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec \
DOTNET_ROLL_FORWARD=Major \
.tools/ilspycmd -p \
-r /opt/homebrew/opt/dotnet/libexec/shared/Microsoft.NETCore.App/10.0.2 \
-o .cache/source reference/sts2.dll
```

### 7.3 优先编译最新源码

```sh
DOTNET_CLI_HOME="$PWD/.cache/dotnet" \
NUGET_PACKAGES="$PWD/.cache/nuget" \
dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers
```

已完成 restore 且依赖未变时，可把 `--configfile ...` 换成 `--no-restore`。先检查 NuGet.Config 内的本地源能正确解析；若找不到源修复实际路径，不要无端切到不明第三方源。

保存新的构建日志，记录警告；旧编译的 3 个 CS8602 警告和成功结论不能替代新编译。多人协作时只允许一个构建负责人，避免各代理同时写 `.godot`。

### 7.4 直接运行规则宿主排查

```sh
SPIRECLI_SAVE_DIR=res://.cache/spirecli-manual-test \
DOTNET_ROOT=/opt/homebrew/opt/dotnet/libexec \
.tools/godot/Godot_mono.app/Contents/MacOS/Godot \
--headless --path runtime --log-file ../.cache/godot.log
```

启动后 stdin 输入一行命令，等待对应 `@@SPIRE@@` 快照。测试工具必须在收到响应后再发下一条，不能盲目批量发送后假设异步结算已完成。

### 7.5 启动网页服务

```sh
python3 server.py --host 127.0.0.1 --port 8765
```

浏览器打开 `http://127.0.0.1:8765/`。无需 npm 安装或前端打包。

重编译后新建规则进程/会话再测试；旧 Cookie 对应的旧进程可能仍加载旧程序集。不要用旧网页会话证明新 DLL 正确。

服务参数还包括 `--godot`、`--dotnet-root`、`--max-sessions`、`--idle-timeout`、`--startup-timeout`、`--command-timeout`，具体默认值查看 `python3 server.py --help`。

### 7.6 HTTP 基础排查示例

```sh
curl -sS -c .cache/handoff.cookies http://127.0.0.1:8765/api/state
curl -sS -b .cache/handoff.cookies -c .cache/handoff.cookies \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://127.0.0.1:8765' \
  --data '{"command":"help"}' \
  http://127.0.0.1:8765/api/command
```

以实际返回结构检查结果，不要只看 HTTP 200。原版命令错误可以体现在快照 messages 中；服务故障另有 HTTP 错误结构。

### 7.7 已遇到的环境陷阱

- 原始 x64 PE 托管 DLL 在 ARM64 曾报误导性的 FileNotFound。现有 `runtime/lib` 的托管副本做过 PE Machine 标记适配，原版文件未改动。
- 仅对确认是兼容托管 IL 的暂存副本处理 PE 头；不能批量修改原版、原生二进制或复制整套 Windows System DLL。
- 当前暂存依赖含 sts2、Sentry、Steamworks.NET、0Harmony、SmartFormat、SmartFormat.ZString、ZString、System.IO.Hashing、Vortice、SharpGen、MonoMod、Mono.Cecil、Iced 等，以 lib 现状和加载结果为准。
- 使用 Godot SDK 自带 GodotSharp；不要拿用户提供的绑定随意覆盖。
- Godot 默认用户目录在受限环境可能不能写，曾导致默认日志初始化崩溃。显式 `--log-file` 到项目缓存可绕过日志问题；本轮 `save_smoke` / `http_smoke` 也把 `SPIRECLI_SAVE_DIR` 指到项目内 `res://.cache/spirecli-*`。正式 Host 默认仍写隔离的 `user://terminal-save`。
- 不要把绝对路径写进 `custom_user_dir_name`；Godot 会按用户目录规则拼接，并非任意路径重定向。当前值为 `spire-command-game`。
- 不要改写 HOME 或 CODEX_HOME。只设置项目专用缓存环境变量。
- 本机沙箱曾拒绝监听回环端口；之前通过工具的正规提升权限流程启动成功。这不是业务代码失败，不要为绕过它改成对外网监听。
- 不需要反复运行 Godot editor import；会引入额外编辑器缓存权限问题。

## 8. 最新代码基线：本轮已完成

最新 `runtime/Main.cs` 已重新编译，日志 `.cache/build-20260921-persistent-smoke.log`：0 warning、0 error。Godot Mono 为 `4.5.1.stable.mono.official.f62fdbde1`，.NET 为 `10.0.102`。

`python3 tests/engine_smoke.py` 已在新进程检查原版输入哈希并通过，固定种子 `WEBTEST` 共 23 条命令；包含无局查询、战士开局、按可见路线进入战斗、防御和攻击出牌、缺目标/能量不足拒绝、结束回合、首战奖励、选卡、继续路线以及放弃后重开。最新完整命令与快照在 `.cache/engine-smoke.json`，Godot 日志在 `.cache/engine-smoke-godot.log`。不要引用旧 `smoke.out` 作为新代码证据。

## 9. 第二优先级：命令、异步与选择机制

本轮已通过的命令与选择边界见 `docs/engine-coverage.md`。以下清单是后续范围，不应把已验证的嵌套选择误记为未实现。

### 9.1 命令契约

现有命令分支：

```text
help / status / look / clear
new ironclad [种子] [进阶]
cards [查询] / inspect / hand / deck / draw / discard / exhaust
relics / potions / map
play 卡牌编号 [目标编号] / end
choose 编号... / take 编号 / skip / back
move 路线编号 / proceed
shop / buy 编号 / potion 槽位 [目标编号] / discard-potion 槽位
abandon
```

`inspect` 等细节读取当前 Help 与解析代码，不从上面简表猜参数。当前提供原版自动存档的 `continue` 和 `abandon`；没有手动 `save` 命令。

- [ ] 为每条命令明确参数数量、合法阶段、目标类型、失败行为；多余参数不应静默忽略。
- [ ] `Main.cs` 已拒绝非法进阶字符串，且会按原版进度上限截断合法请求；尚未加入对应独立命令回归用例。
- [ ] 覆盖 AnyEnemy / Self / 无目标 / 群体目标 / 玩家目标；不要用一个 Target 函数处理所有卡牌与药水。
- [ ] 抽牌堆目前按名称排序，不暴露抽牌顺序。另 `cards` 目录命令枚举 Ironclad 全部 CardPool 候选，未按玩家发现/解锁进度过滤；需决定并如实标注其目录范围，不把它说成原版当前卡牌图鉴。
- [ ] busy、Choosing、EngineBusy 三者统一；结算未完成不能再次执行同一动作。
- [ ] 超时提示只引导读取状态，不能自动重发变更命令。
- [x] `abandon`/重开会清理挂起选择、奖励 Task、宝箱事件回调及旧 run；engine、choice、save smoke 均实测了放弃/重开路径。更复杂并发生命周期仍需压力测试。
- [ ] 统一 Won/Dead/gameWon 的使用，避免终局显示胜利但 new/命令守卫仍按别的变量判断。

### 9.2 奖励与普通选牌

当前 `ICardSelector` + TaskCompletionSource 等待用户选牌，嵌套选择排队；奖励用栈等待。当前验证边界：

- [x] 测试专用回归验证 1–3 张、0–3 张、连续嵌套、bundle 和 relic；普通战卡牌奖励单选也已验证。
- [ ] `GetSelectedCardReward` 当前按终端编号映射原版候选卡或 `CardRewardAlternative`；替代奖励包装只处理特定 `AfterSelected` 分支，需用真实奖励验证替代、重抽/skip 与后续选择组合。
- [ ] 药水槽满时，奖励分支与 `discard-potion` 的原版整理流程尚未验证。
- [ ] 验证奖励等待/多段替代效果各只继续一次，并覆盖同一选择队列中更多真实嵌套来源。
- [ ] 队列支持串行嵌套；真正并行到达的多个原版选择上下文尚未压力测试。

选择适配已拆到 `runtime/ChoiceAdapters.cs`，并用 `tools/sts2-bridge-patcher/` 对 `runtime/lib/sts2.dll` 作窄范围 IL 重定向；正式命令中测试钩子默认关闭。原版未知选择仍应明确报错，不能默认第一项或自动跳过来“解决”卡死。

## 10. 第三优先级：特殊事件和直接依赖图形 UI 的流程

卡牌组合选择和遗物选择已完成窄范围命令适配，且通过隔离测试。以下表中前两项不再是待实现项；水晶球、建筑师和尚未扫描的图形依赖仍未覆盖。源码根目录均为 `.cache/source/`。优先搜索方法名，行号会随反编译变化。

| 源文件 / 方法 | 问题 | 需要完成 |
| --- | --- | --- |
| `MegaCrit.Sts2.Core.Commands/CardSelectCmd.cs` / `FromChooseABundleScreen` | TestMode 原版分支固定 `bundles[0]` | 已由 `ChoiceAdapters.SelectBundle` 接命令选择；隔离 bundle smoke 通过；非单人/TestMode 未接管 |
| `MegaCrit.Sts2.Core.Commands/RelicSelectCmd.cs` / `FromChooseARelicScreen` | 原版创建 NChooseARelicSelection 图形界面 | 已由 `ChoiceAdapters.SelectRelic` 接命令选择并回写原版同步器；隔离 relic smoke 通过；非本地单人/TestMode 未接管 |
| `MegaCrit.Sts2.Core.Models.Events/CrystalSphere.cs` | 支付后启动图形小游戏 | 保留原版费用、随机流和结算 |
| `MegaCrit.Sts2.Core.Events.Custom.CrystalSphereEvent/CrystalSphereMinigame.cs` / `PlayMinigame` | 等待屏幕与完成 TCS | 把工具、格子操作变成命令，适配完成等待 |
| `MegaCrit.Sts2.Core.Models.Events/TheArchitect.cs` | 对话依赖图形回调，选项可能暂时清空 | 推进原版对白、选项与最终胜利同步 |

水晶球具体已有模型接口：cells、GridSize、DivinationCount、IsFinished、PlacedAllItems、Items、SetTool、CellClicked、SetHoveredCell、UnsetHoveredCell。先读原版显示层判断哪些字段当时可见；不能把埋藏内容全部输出给用户。工具和坐标命令语法可以自己设计，但效果、次数、掉落与胜负必须交还原版模型。不要调用强制结束直接绕过玩法。

建筑师需要核对 Dialogue、CurrentLineIndex、CreateOptionForCurrentLine、AdvanceDialogue、WinRun 的调用链；原版最终流程涉及 ActChangeSynchronizer、TriggerVictory、OnEnded 和 GuaranteeKillAllPlayers。因此角色 Dead 不一定意味着普通失败，不能自己宣布最终胜利或只改 gameWon。

选择桥使用构建时 `Mono.Cecil` 修改 `runtime/lib/sts2.dll` 暂存副本；补丁器先校验原版 DLL 哈希和 MVID，`reference/sts2.dll` 保持不动。当前只接上述两个选择入口和一处卡牌奖励替代项包装，不意味着其余图形回调可用，也不修改玩法公式。

- [ ] 系统搜索全部战士可达事件、古老之民、遗物、卡牌与奖励中的 `ShowScreen`、`N*Screen`、`TestMode`、等待用户 TCS、随机默认选择。
- [x] 建立 `docs/engine-coverage.md`；持续按真实验证更新功能、原版文件/方法、适配方式、测试案例和剩余差异。
- [ ] 遇到尚未支持的选择，明确报出适配缺口并保留可诊断状态；不能偷偷自动选第一项。

## 11. 第四优先级：TestMode 与原版正常游戏的差异审计

目前启用了 `TestMode.IsOn = true`。这样可以省略部分图形依赖，但 **调用原版 DLL + TestMode 不等于正常游戏 1:1**。

已通过反编译代码核对并写入 `docs/engine-coverage.md`：

1. `RunManager.ShouldApplyTutorialModifications` 在 TestMode 返回 `false`（除非 `ForceDiscoveryOrderModifications`）。
2. `ActModel.GetRandomList` 只有 `TestMode.IsOff` 才优先选择已解锁未发现的章节，因此测试模式的章节序列可能不同。
3. 原版默认 `SaveManager.ConstructDefault` 在 TestMode 使用内存 `MockGodotFileIo`；Host 显式注入隔离 `GodotFileIo` 才能持久化 `SerializableRun`。
4. `CardSelectCmd` 原 TestMode 固定选第一组；`RelicSelectCmd` 仍要求图形节点。两处选择入口已被窄范围命令桥覆盖并单独测试。
5. 其他 `TestMode.IsOn` 条件尚未逐项分类；仍需评估哪些影响玩法、可见信息或流程。

执行方式：

```sh
rg -n 'TestMode|ForceDiscoveryOrderModifications' .cache/source
rg -n 'ShowScreen|RelicsSelected|FromChooseABundleScreen' .cache/source
```

只读反编译结果，不批量改写原版文件。对尚未审计的分支继续标记为“仅显示 / 需适配 / 已适配并验证 / 尚未确认”。对于影响规则的分支优先调用正常路径；无法直接调用时，以原版正常逻辑做最小桥接并记录依据。不要把当前 headless Host 外推为普通 GUI 或多人行为。

## 12. 第五优先级：房间与完整旅程

- 路线：已使用 `MapTravel` 的原版可达点和 `VoteForMapCoordAction`，首层路线通过；飞行等特殊可达规则未验证。
- 战斗：固定种子普通战胜利与奖励、继续地图已验证；精英、首领和不同 reward mix 未验证。
- 商店：原版库存中一次真实购买、金币扣减和售罄状态通过 smoke；买牌/遗物/药水/移除、金币不足、价格影响尚未全测。
- 休息点：测试选择一个原版可用选项并成功离开；额外行动和全部选项未测。
- 宝箱：调用 `DoNormalRewards`、`DoExtraRewardsIfNeeded` 的开启及一次金币和遗物选择通过固定路径；无遗物及其他后续奖励组合未测。
- 药水：命令校验沿用原版 Usage、时机、可用性和目标检查；本轮没有药水行动 smoke。
- 事件：通过原版事件同步器完成两个事件的嵌套单选/多选；其他事件、禁用项、退出与代价分支未测。
- 章节/结局/解锁：Boss 后转换、最终事件、胜负记录、解锁进度仍未闭环验证。
- 图形对照：没有同种子、同进度与同决策的普通 GUI 对照；TestMode 差异先按第 11 节继续审计。

所有战士可触达的原版内容应进入覆盖表；不能只测初始三种牌。完整一局通过是必要条件，但不是“所有机制 1:1”的充分证据。

## 13. 第六优先级：真实存档与恢复

原版自动存档和跨进程继续已实现并通过 `tests/save_smoke.py`。命令为 `continue` 与 `abandon`；没有手动 `save` 命令，网页会话恢复与原版运行存档仍是两个概念。

阅读原版：

- `MegaCrit.Sts2.Core.Saves/SaveManager.cs`
- `MegaCrit.Sts2.Core.Saves.Managers/RunSaveManager.cs`
- `MegaCrit.Sts2.Core.Saves.Test/MockGodotFileIo.cs`
- `MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 ToSave、SetUpSavedSingleplayer、LoadIntoLatestMapCoord
- `RunState.FromSerializable` 及对应序列化结构。

当前实现和剩余限制：

1. Host 用 `SaveManager.MockInstanceForTesting(new SaveManager(new GodotFileIo(saveDir)))`，默认 `saveDir=user://terminal-save`，不读写游戏本体的 Steam 存档目录。
2. 原版自动检查点序列化 `SerializableRun`；`continue` 走 `LoadRunSave → RunState.FromSerializable → SetUpSavedSingleplayer → GenerateMap/LoadIntoLatestMapCoord`。
3. `save_smoke` 两次独立 Godot 进程间验证战斗结束、奖励待领的 `PreFinishedRoom` 存档恢复与 `abandon` 删除。
4. 受当前文件系统沙箱限制，烟测把 `SPIRECLI_SAVE_DIR` 指到项目内独立 `res://.cache/spirecli-save-smoke-*`；默认 `user://terminal-save` 尚未在本轮环境写入验证。
5. 单机终端使用一个项目级运行存档，多个活跃浏览器会话可能同时打开该存档；会话隔离与并发写入仍需处理/验证。Steam Cloud、进度/解锁持久化和 HTTP 服务重启恢复也未测。
6. 不添加原版不存在的任意战斗回滚能力。若需手动保存，只能依据原版合法检查点能力评估。

## 14. 网页剩余工作与验收

前端现有 app.js 已接入 GET/POST、状态面板、命令历史、Tab 补全、IME、busy 和连接重试。`tests/http_smoke.py` 已检查服务返回的命令表单与 `/api/command` 请求绑定，并通过 HTTP 真实送出战斗命令；这还不是实际浏览器操作验收。历史现存 sessionStorage；重连只应 GET，不应重发上条 POST。

编辑前阅读技能：`/Users/kamesan/.codex/skills/frontend-skill/SKILL.md`，并参考 `docs/interface.md`。

- [ ] 用真实浏览器打开服务，确认加载、创建会话、执行 help/new 和战斗，保存实际截图及尺寸；当前仅通过页面资源和 HTTP 集成测试。
- [ ] 阶段枚举、路线类型来自真实快照，不能只测试手写模拟 JSON。当前已加入 Shop/Monster 等映射，仍需检查 MapRoom、古老之民与特殊阶段。
- [ ] 中文卡牌、状态、遗物、事件优先使用原版 zhs；未知名称可显示原版标识，不自行编造译名或职业背景。
- [ ] 卡牌与选项描述不能把原版格式标记直接漏给用户；动态值显示准确。
- [ ] 所有推进游戏状态的动作来自命令提交；面板可以展示信息，不能引入必须鼠标点击的选牌/事件操作。
- [ ] 输入过程中中文 IME Enter 不误提交；Tab、上下历史、草稿恢复正常。
- [ ] 请求中防重复提交；错误后焦点恢复；断线重试不重发动作。
- [ ] 用户阅读旧日志时，不应每次更新都强制滚到底部（现 addEntry 有直接滚动，需改善）。
- [ ] 桌面与 390px 左右手机宽度检查：输入框可见、键盘可用、无横向溢出、手牌长描述可读。
- [ ] 屏幕阅读器连接状态、输入标签、焦点可见、减少动态效果设置。
- [ ] clear 只清展示日志，不修改游戏状态；刷新不能静默开启另一局。
- [ ] 帮助、补全与真实命令契约同步，未实现命令不展示为可用。

## 15. HTTP 服务与工具剩余工作

`server.py` 已有静态文件白名单、会话 Cookie、每会话进程和锁、超时终止、会话上限/回收、回环绑定和 Origin/Host 校验。`tests/http_smoke.py` 已在 loopback 实际验证静态页面、脚本、`GET /api/state`、同源 Cookie `POST /api/command` 和游戏命令。服务使用 `fcntl`，当前只验证 macOS；不能声称支持 Windows。

- [x] 已实际测试 GET /api/state、POST /api/command 和静态文件，见 `.cache/http-smoke.json`。
- [ ] 测试同一会话并发请求、不同会话隔离、无效 Cookie、达到会话上限和空闲回收。
- [ ] 测试错误 JSON、过长命令、路径穿越、非法 Origin/Host；确保原版文件与日志不能通过静态路由下载。
- [ ] 模拟规则进程崩溃/超时，确认进程组清理、错误返回和后续新会话恢复；不能让迟到快照串到下一命令。
- [ ] 核对服务 GET 在 busy 时取状态的实际方式，确保读取不意外造成重复执行。
- [ ] HTTP smoke 通过 SIGINT 关闭服务父进程；Godot 子进程/进程组彻底回收仍需专门断言与重复压测。
- [ ] 补 `tools/prepare_runtime.py` 或等效脚本：检测工具、校验原版、只复制需要的托管依赖、按架构安全暂存、提取文本。
- [ ] 补统一构建入口与 `.cache/runtime-build.lock` 的协作约定；当前服务已有该锁路径，构建脚本尚未实现，不要做不兼容锁。
- [ ] 工具不能改原版输入；脚本重复执行应保持结果稳定，失败指出缺少的具体文件。
- [ ] 补 README：支持环境、安装、启动网页、命令示例、版本核验状态、已知缺口、测试入口。

## 16. 测试计划与完成标准

本轮已跑完以下真实构建和集成 smoke。通过只表示对应场景运行成功，不表示完整规则正确或 1:1。

| 层次 | 必须覆盖 | 证据 |
| --- | --- | --- |
| 构建/引擎 | 最新源码、Host 初始化、战士开局、出牌、回合、奖励、重开 | `.cache/build-20260921-persistent-smoke.log`；`.cache/engine-smoke.json` |
| 选择 | 多选、可跳过、嵌套、bundle、relic、普通战卡牌奖励 | `.cache/choice-adapters-smoke.json`；`.cache/engine-smoke.json` |
| 房间 | 固定路径的普通战、商店、事件、休息、宝箱 | `.cache/room-flow-smoke.json` |
| 存档 | 原版奖励检查点、两个 Godot 进程间继续、放弃删除 | `.cache/save-smoke.json` |
| HTTP | 页面、脚本、会话 Cookie、`help/new/move/play/end/abandon` | `.cache/http-smoke.json` |
| 尚未覆盖 | 所有房间/章节、特殊 UI、全部 TestMode 分支、Steam Cloud、并发/崩溃/边界、真实浏览器和手机 | 详见 `docs/engine-coverage.md` 和第 10–15 节 |

测试用调试入口如有需要，应与正式命令隔离，不能给正式玩家加金钱/改牌来掩盖未完成流程。避免为了凑整局演示手工改血量或跳过事件。

报告包含源码/程序集哈希、种子、命令轨迹或恢复前后状态。引擎 smoke 会校验原版输入哈希；manifest 的 Build 归属仍为未核验。仅“没报错”不能作为规则一致结论。

## 17. 建议的后续执行顺序

1. 真实浏览器中走 `new → move → play → end`，检查命令框、中文输入法、键盘焦点、桌面与窄屏布局并保留截图。
2. 全量盘点战士可触达的 `TestMode` / 图形等待分支，继续更新 `docs/engine-coverage.md`；不要声称普通 GUI 等价。
3. 扩展真实房间、替代奖励、药水满槽、精英/Boss、章节过渡和终局验证。
4. 处理共享运行存档下的多 HTTP 会话隔离/并发冲突，测 HTTP 服务重启恢复和 Godot 子进程清理。
5. 补错输入/Origin、会话上限、超时、崩溃等服务边界用例。
6. 补安装/构建入口与 README；确保准备脚本不会修改 `reference/` 原版文件。
7. 每轮改动后只由一个构建负责人编译，并新启 Host / HTTP 会话验证；更新对应报告和覆盖文档。

## 18. 交付时必须如实说明

- 网页入口与实际启动方式。
- 已经通过验证的完整流程，而不仅是新增的代码列表。
- 使用的原版输入与 Build 核验状态。
- 仍存在的 TestMode 差异、事件或模式缺口。
- 测试命令与结果，以及是否真的完成原版对照。
- 不能在只跑通开局或普通战后写“已经 1:1 还原”。

本轮最新构建、引擎、选择、房间、存档和 HTTP smoke 均已执行；真实浏览器 UI、完整玩法覆盖、普通图形模式对照以及 Build 归属证明仍未完成。不得把本阶段命令终端说成完整 1:1 还原。
