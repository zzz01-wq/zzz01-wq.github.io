# 杀戮尖塔 2 网页命令版：继续开发交接

交接日期：2026-09-28（本轮进展已更新）。本文记录当前代码与验证状态；不是功能完成报告。

## 1. 新对话可直接使用的任务提示

> 继续开发 Steam Build 23811903 目标的《杀戮尖塔 2》网页终端；当前已接入铁甲战士与静默猎手、点击式开局/角色选择和原版存档。先看 `docs/engine-coverage.md` 与本交接第 37 节，按最新代码重新验证，不要沿用更早报告中的旧哈希/旧测试状态。玩法依据仍只能来自提供的原版文件；目标版本来源尚未独立证明；不可宣称完整规则 1:1。沿用“网页 → Python HTTP 桥 → Godot Mono → 原版 sts2.dll”架构。后续优先做真实浏览器/移动端验收、TestMode 分支全面盘点、未覆盖房间与内容、服务生命周期/安全边界以及安装和 README。每项记录原版依据、修改文件、真实验证和剩余限制。

模型由用户在新对话界面选择；上面的文字本身不能切换模型。如果当前环境不支持指定的 subagent 模型，应明确说明，不要谎报模型。

## 2. 用户已经确定的要求

1. 版本以 **Steam Build ID 23811903** 为准。
2. 首先实现战士 / Ironclad；后续添加角色时继续复用本机原版模型和进度。
3. 最终产品必须是网页可玩的游戏；不是只有系统终端程序。
4. 网页内部提供自己的命令输入框、命令语法、状态和临时反馈；不是 F12 控制台。
5. 出牌、结束回合、选路、事件、奖励、商店、药水等动作沿用内置命令处理；网页尽量提供点击快捷入口，命令输入框保留为可选操作方式。
6. 玩法与设定要求遵循原版，不能自行编造卡牌数值、敌人 AI、地图、事件效果、奖励概率或进阶规则。
7. Wiki 可以辅助查证，但不能覆盖本版本原版文件的实际行为。
8. 用户已经提供原版文件；目前可以继续开发，不要再次泛泛要求用户提供整套游戏。
9. 先做战士不意味着已经授权把其他影响战士流程的无色牌、诅咒、事件、遗物、药水和敌人删掉。

当前工程偏向单人流程，现支持战士与静默猎手开局；多人模式尚未实现。不要把这个范围说成完整游戏所有模式均已还原。

## 3. 当前状态：务必区分代码与验证

下表由 2026-09-22 本轮执行结果更新。细节、原版依据和边界以 `docs/engine-coverage.md` 为准。

| 模块 | 已落地 | 本轮验证与剩余缺口 |
| --- | --- | --- |
| 原版资料 | DLL、PCK、依赖；提取文本；哈希清单；暂存 DLL 的选择桥补丁器 | 引擎 smoke 比对清单哈希；Build 归属仍未独立核验 |
| Godot 托管宿主 | `runtime/Main.cs`、Godot 场景与 `runtime/ChoiceAdapters.cs` | 最新重编译通过，0 warning、0 error；headless/TestMode 行为仍有差异 |
| 战士战斗 | 原版 ActionQueue、出牌、回合、战斗奖励 | `engine_smoke` 通过；固定首战和少量卡牌，不代表全卡池 |
| 选择交互 | 单选/多选/可跳过/嵌套、原版卡牌组合和遗物桥 | 隔离的 choice adapter smoke 通过；真实遭遇仍需扩大 |
| 房间流程 | 地图、各幕 Ancient/Neow、事件、商店、休息、宝箱和奖励命令 | 最新 room-flow 实测商店移除取消、铁匠取消后继续休息、事件多选、宝箱选择；`boss_transition_smoke` 验证第一幕 Boss 结算后进入第二幕；固定幕首验证仍见 `.cache/act-opening-smoke.json`；精英、全部 Boss、全部事件分支和终局仍未覆盖 |
| TestMode | 快照标记 `TestMode/headless`；关键章节/教程与选择差异已核对并记录 | 还没有逐项审计所有 `TestMode` 分支，也没有普通图形模式对照 |
| 存档 | 原版自动写入 `SerializableRun`；`continue`、`abandon` | 独立 Godot 进程之间恢复奖励检查点通过；生产默认 `user://terminal-save`，测试使用仓库内隔离路径 |
| Python HTTP 桥 | Cookie 会话、HTTP 命令、静态网页 | 本轮 HTTP smoke 经本机回环通过，验证 Neow 开局、进入战斗、出牌、回合和放弃；并发、错误边界和崩溃恢复未覆盖 |
| 网页 | 自有命令框、状态与选项视图、全屏路线图和本地手绘层、`/api/command` 绑定 | HTTP 命令已验证；Chrome 临时内存会话中目视检查过地图路线和编号。战斗布局未在战斗快照下目视验收，IME/移动端仍待检查 |
| 自动化测试 | `tests/engine_smoke.py`、`choice_adapters_smoke.py`、`room_flow_smoke.py`、`save_smoke.py`、`act_opening_smoke.py`、`boss_transition_smoke.py`、`http_smoke.py` | 本轮重跑 engine、choice、room-flow、save、act-opening 和 Boss 转幕 smoke 均通过；覆盖范围仍有限，不能据此声称 1:1 |
| README / 准备工具 | 原版提取脚本与运行依赖暂存 | README 和一键准备/构建入口仍待补 |

本轮重编译命令 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error。HTTP smoke 使用本机临时回环端口并在结束时关闭服务，没有保留常驻网页服务。

在上述六项 smoke 之后，地图快照加入原版节点连接和有序已走路线，随后重新编译通过（0 warning、0 error）。此阶段源码/程序集哈希为 `a3ad3e2fce80f5ffd088c4eb949fa11719dc1a5227eb43f7fce24b7d7a112535` / `eeaf29a83971295c47f96d77fabdc4d061c418cbe8e52ccae2078f09c5785c01`；没有重跑 smoke。浏览器预览使用临时 8876 回环服务与 TestMode 内存会话，手动通过网页命令打开地图后已关闭服务；没有以此声称战斗 UI 或完整玩法验证。

随后修复了网页敌人意图的空标签显示：桥接快照加入原版意图类型及可用的 `GetHoverTip()` 标题/说明，网页保留原版标签为空时的可见提示，并遵循 `HasIntentTip`。最新 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error；`runtime/Main.cs` / Godot Mono assembly SHA-256 为 `71bfaa7c44df958d4d50fdbed232d8f51622fb2c4164d5a80b72830654dbf2ae` / `7320e6e5875ad6d427f007fd3ceb26b35826ce4f431bb38bc36411f7cd961d87`。本次只做构建、JS 语法及补丁格式检查，尚未对毛绒伏地虫的 `INHALE` 状态进行战斗回归或网页目视检查。

本轮更新：命令回显从主规则消息区移入独立滚动历史栏；点击历史项只填入命令框，不会自动执行，小屏幕默认折叠。怪物 Power 状态现在通过原版 PowerModel.HoverTips 格式化标题、增益/减益类别与动态描述，因此易伤显示原版回合说明，力量显示原版数值效果。最新 dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers 通过，0 warning、0 error；node --check web/app.js 与 git diff --check 通过。桌面 Chrome 预览中经网页内置命令框提交只读 help，截图确认命令显示于独立历史栏、help 回答显示在主消息区。runtime/Main.cs / Godot Mono assembly SHA-256 为 85b743274bfe7094676a66b3e58c60ccb69bd2a75db3278f3c8249becaccd622 / 54a7cf410ce3d30d25be85f59a66f9286d0ff552c0e83835b1551045066536b5。未跑测试；未验证历史项点击回填、真实战斗 Power 快照或窄屏布局。

本轮新增仅测试钩子可用的 `__test_kill [敌人编号|all]`，无参数默认击杀全部存活敌人。它在玩家出牌阶段调用原版 `CreatureCmd.Kill(force: true)` 并继续调用 `CombatManager.CheckWinCondition()`，以便测试敌人死亡后的房间、奖励流程；它跳过伤害、格挡和 `ShouldDie`，不覆盖战斗伤害规则。设置 `SPIRECLI_ENABLE_TEST_HOOKS=1` 启动 `server.py` 后，网页终端 `help` 会列出此命令。之后固定种子 `BOSSFLOW` 已用它完成第一幕 Boss 结算并验证下一幕入口，记录见 `.cache/boss-transition-smoke.json`；这仍不等于真实出牌战斗回归。

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
| `tests/` | 六项自动化 smoke；不覆盖完整规则或图形模式 |
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
env -u STS2_DEV_SKIP python3 server.py --host 127.0.0.1 --port 8765
```

浏览器打开 `http://127.0.0.1:8765/`。无需 npm 安装或前端打包。
`STS2_DEV_SKIP` 只要存在就会启用原版 `DebugSettings.DevSkip`，值写成 `0` 或空字符串也算启用。网页服务启动时会清除该变量；直接运行 Godot 时也应使用 `env -u STS2_DEV_SKIP`。

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
- Godot 默认用户目录在受限环境可能不能写，曾导致默认日志初始化崩溃。显式 `--log-file` 到项目缓存可绕过日志问题；本轮 `save_smoke` 用项目内 `res://.cache/spirecli-*` 测跨进程存档，HTTP smoke 用 TestMode 内存存档验证桥接，避免 Neow 挂载 PCK 后从 `res://` 删除存档。正式 Host 默认写隔离的 `user://terminal-save`。
- 不要把绝对路径写进 `custom_user_dir_name`；Godot 会按用户目录规则拼接，并非任意路径重定向。当前值为 `spire-command-game`。
- 不要改写 HOME 或 CODEX_HOME。只设置项目专用缓存环境变量。
- 本机沙箱曾拒绝监听回环端口；之前通过工具的正规提升权限流程启动成功。这不是业务代码失败，不要为绕过它改成对外网监听。
- 不需要反复运行 Godot editor import；会引入额外编辑器缓存权限问题。

## 8. 最新代码基线：本轮已完成

最新 `runtime/Main.cs` 已重新编译，日志 `.cache/build-20260921-event-description.log`：0 warning、0 error。Godot Mono 为 `4.5.1.stable.mono.official.f62fdbde1`，.NET 为 `10.0.102`。

`python3 tests/engine_smoke.py` 已在新进程检查原版输入哈希并通过，固定种子 `WEBTEST` 共 24 条命令；包含无局查询、`new` 自动触发涅奥、选择开局选项、按可见路线进入战斗、防御和攻击出牌、缺目标/能量不足拒绝、结束回合、首战奖励、选卡、继续路线以及放弃后重开。最新完整命令与快照在 `.cache/engine-smoke.json`，Godot 日志在 `.cache/engine-smoke-godot.log`。不要引用旧 `smoke.out` 作为新代码证据。

`python3 tests/act_opening_smoke.py --seed XHPB63HK` 已通过，16 条命令：普通 `new ironclad` 直接进入固定 Neow，没有调用解锁测试钩子；再用受测试环境变量保护的入口调用原版 `EnterAct` 检查第二、三幕 Ancient 起点、原版 `ActModel.Ancient` 对应的事件选择和后续路线。它未模拟击败 Boss 的完整幕间流程。证据见 `.cache/act-opening-smoke.json`。

涅奥说明占位符处理：`NEOW.pages.INITIAL.description` 在提供的 `zhs/ancients.json`、`eng/ancients.json` 中均不存在。原版 `NEventRoom.SetDescription()` 只在 `LocString.Exists()` 时渲染，终端现复刻此行为，缺失时 `eventText` 留空、选择项仍保留。新增幕首断言已随本轮构建通过。

终端宿主跳过原版 Timeline UI，并使用独立进度目录。为满足标准新局应出现 Neow 的命令交互，`Main.NewRun` 在构造 `UnlockState` 前通过原版 `SaveManager` 将终端自己的 `NeowEpoch` 标为已揭示并写入进度；Neow 事件模型、选项和自动进入仍由原版引擎执行。原版全新空白档的首次进度并不一定揭示 Neow，本项目不因此声称首次进度或 Steam 存档 1:1。

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

卡牌组合选择和遗物选择已完成窄范围命令适配，且通过隔离测试；水晶球本轮接入网页交互并使用原版小游戏模型。建筑师对白已接入网页，但终局逐句和胜利结算尚未实际回归；其他未扫描的图形依赖仍未覆盖。源码根目录均为 `.cache/source/`。优先搜索方法名，行号会随反编译变化。

| 源文件 / 方法 | 问题 | 需要完成 |
| --- | --- | --- |
| `MegaCrit.Sts2.Core.Commands/CardSelectCmd.cs` / `FromChooseABundleScreen` | TestMode 原版分支固定 `bundles[0]` | 已由 `ChoiceAdapters.SelectBundle` 接命令选择；隔离 bundle smoke 通过；非单人/TestMode 未接管 |
| `MegaCrit.Sts2.Core.Commands/RelicSelectCmd.cs` / `FromChooseARelicScreen` | 原版创建 NChooseARelicSelection 图形界面 | 已由 `ChoiceAdapters.SelectRelic` 接命令选择并回写原版同步器；隔离 relic smoke 通过；非本地单人/TestMode 未接管 |
| `MegaCrit.Sts2.Core.Models.Events/CrystalSphere.cs` | 支付后启动图形小游戏 | 本轮网页已呈现原版选项启动的占卜；价格、Debt、RNG、完成事件仍由原版方法处理 |
| `MegaCrit.Sts2.Core.Events.Custom.CrystalSphereEvent/CrystalSphereMinigame.cs` / `PlayMinigame` | 原版等待屏幕与完成 TCS；TestMode 下格子节点不创建 | 本轮网页以原版 `SetTool`、`CellClicked` 操作同一模型，等待完成信号并由原版生成奖励；尚未做实际房间流程回归 |
| `MegaCrit.Sts2.Core.Models.Events/TheArchitect.cs` | 对话依赖图形回调，首句选项可能暂时清空 | 已接入原版当前对白和逐句 `EventOption`；TestMode 空首句时通过反射恢复原版首个选项；终局通关流程仍需实际回归 |

水晶球网页界面使用原版格子尺寸、说明和按钮本地化；只显示原版已揭示的完整物品，不暴露隐藏格子的物品归属。点击格子或切换工具仍经网页内命令交给原版小游戏模型。不要调用 `ForceMinigameEnd()` 绕过次数或奖励结算，也不要把此 UI 桥接称为完整 1:1。

建筑师终局对白已按 `TheArchitect` 的 Dialogue、CurrentLineIndex、CreateOptionForCurrentLine、AdvanceDialogue、WinRun 接入网页；原版最终流程仍涉及 ActChangeSynchronizer、TriggerVictory、OnEnded 和 GuaranteeKillAllPlayers。因此角色 Dead 不一定意味着普通失败，不能自己宣布最终胜利或只改 gameWon。终局完整流程尚未实际回归。

选择桥使用构建时 `Mono.Cecil` 修改 `runtime/lib/sts2.dll` 暂存副本；补丁器先校验原版 DLL 哈希和 MVID，`reference/sts2.dll` 保持不动。当前接两个选择入口、一处卡牌奖励替代项包装，以及水晶球的 `ShowScreen` 显示入口；这不意味着其余图形回调可用，也不修改玩法公式。

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
- 章节/结局/解锁：第一幕 Boss → 第二幕地图转场已验证；第二幕 Boss → 第三幕、最终事件、胜负记录、解锁进度仍未闭环验证。
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

前端现有 app.js 已接入 GET/POST、状态面板、命令历史、Tab 补全、IME、busy 和连接重试。本轮 `tests/http_smoke.py` 检查服务返回的命令表单与 `/api/command` 请求绑定，并经 HTTP 完成 Neow 选择、首战出牌和结束回合。这还不是实际浏览器操作验收。历史现存 sessionStorage；重连只应 GET，不应重发上条 POST。

编辑前阅读技能：`/Users/kamesan/.codex/skills/frontend-skill/SKILL.md`，并参考 `docs/interface.md`。

- [ ] 用真实浏览器打开服务，确认加载、创建会话、执行 help/new 和战斗，保存实际截图及尺寸；当前仅通过页面资源和 HTTP 集成测试。
- [ ] 阶段枚举、路线类型来自真实快照，不能只测试手写模拟 JSON。当前已加入 Shop/Monster 等映射，仍需检查 MapRoom、古老之民与特殊阶段。
- [ ] 中文卡牌、状态、遗物、事件优先使用原版 zhs；未知名称可显示原版标识，不自行编造译名或职业背景。
- [ ] 卡牌与选项描述不能把原版格式标记直接漏给用户；动态值显示准确。
- [ ] 所有推进游戏状态的动作来自命令提交；面板可以展示信息，不能引入必须鼠标点击的选牌/事件操作。
- [ ] 输入过程中中文 IME Enter 不误提交；Tab、上下历史、草稿恢复正常。
- [ ] 请求中防重复提交；错误后焦点恢复；断线重试不重发动作。
- [ ] 命令回显历史目前隐藏；若恢复展示，不应每次状态更新都强制滚到底部。
- [ ] 桌面与 390px 左右手机宽度检查：输入框可见、键盘可用、无横向溢出、手牌长描述可读。
- [ ] 屏幕阅读器连接状态、输入标签、焦点可见、减少动态效果设置。
- [ ] clear 只清临时反馈提示，不修改游戏状态；刷新不能静默开启另一局。
- [ ] 帮助、补全与真实命令契约同步，未实现命令不展示为可用。

## 15. HTTP 服务与工具剩余工作

`server.py` 已有静态文件白名单、会话 Cookie、每会话进程和锁、超时终止、会话上限/回收、回环绑定和 Origin/Host 校验。本轮 `tests/http_smoke.py` 在 loopback 验证静态页面、脚本、`GET /api/state`、同源 Cookie `POST /api/command` 和游戏命令。服务使用 `fcntl`，当前只验证 macOS；不能声称支持 Windows。

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

本轮重新构建并运行六项集成 smoke，均通过。通过只表示对应场景运行成功，不表示完整规则正确或 1:1。

| 层次 | 必须覆盖 | 证据 |
| --- | --- | --- |
| 构建/引擎 | 最新源码、Host 初始化、战士开局、出牌、回合、奖励、重开 | `.cache/build-20260921-event-description.log`；`.cache/engine-smoke.json` |
| 选择 | 多选、可跳过、嵌套、bundle、relic、普通战卡牌奖励 | `.cache/choice-adapters-smoke.json`；`.cache/engine-smoke.json` |
| 房间与幕首事件 | 固定路径的普通战、商店、事件、休息、宝箱；Neow 与后两幕 Ancient | `.cache/room-flow-smoke.json`；`.cache/act-opening-smoke.json` |
| 存档 | 原版奖励检查点、两个 Godot 进程间继续、放弃删除 | `.cache/save-smoke.json` |
| HTTP | 页面、脚本、会话 Cookie、`help/new/choose/move/play/end/abandon` | 当前报告 `.cache/http-smoke.json`；TestMode 内存存档 |
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

上一轮的存档与幕首测试结果见上；最近房间交互补丁后重跑了构建、引擎、选择、房间和 HTTP 检查。真实浏览器中的新选项点击、多选勾选、IME/窄屏、完整玩法覆盖、普通图形模式对照以及 Build 归属证明仍未完成。不得把本阶段命令终端说成完整 1:1 还原。

## 19. 最新补充：房间选项与多选交互（2026-09-21）

检查并修复休息处、事件、商店、普通奖励、卡牌/遗物选择、宝箱和路线的命令提示及网页输入。

- 铁匠和烹饪、商店移除、卡牌移除奖励中，仅当原版 `CardSelectorPrefs.Cancelable` 为 true 时才允许 `back`；取消通过空选择返回原版调用方。商店移除选牌取消后不扣金币。
- 固定 `WEBTEST` 房间流程实测：商店移除前后金币均为 116，项目继续可买；铁匠选牌 `back` 后 Smith 仍在列表且不可离开，随后 Heal 成功并开放路线。
- 多选快照提供原版 `min/max` 范围；网页点选卡牌可累积/取消待选项，再点击“确认选择”提交 `choose 1 2`。
- 单选事件、房间候选项、跳过/返回按钮、商店商品和可达路线点击后直接调用对应内置命令；命令框保留为手动操作方式。命令历史项点击仍只填入命令框。此次前端改动后 `node --check web/app.js` 与 `git diff --check` 通过；未做浏览器点测。上方运行流程测试结果来自之前的交互补丁，不覆盖此次点击直执行行为。
- 修复全屏路线页可能遮住休息处选择的问题：手动输入 `move` 会先收起路线页；进入休息处后优先显示原版营火行动，选项清空且可离开后再允许自动打开地图。营火选项使用“营火行动”标题。`node --check web/app.js` 和 `git diff --check` 通过；未在浏览器中重走休息处流程。
- 排查地图节点间歇性无法进入的问题，发现最上层手绘笔迹默认响应鼠标，覆盖节点时会挡住路线点击。笔迹保持视觉上层，普通模式改为鼠标穿透，仅擦除模式接收笔迹点击。隔离的 Chrome/TestMode 内存会话中，在可达战斗节点上画线、关闭手绘工具再点该节点，实际进入战斗；临时服务已关闭，未触碰用户当前游戏会话。
- 修复房间入口自动被地图覆盖：运行时 `CanLeave()` 对未额外限制的房间（含商店）返回 true，网页此前把可离店条件误作自动开图条件；现在休息处仍有原版营火选项或商店仍有商品选项时，都抑制自动全屏地图，先显示房间交互，手动 `map` 仍能打开地图，并兼容 `RestSiteRoom` 阶段名。隔离 Chrome/TestMode 内存会话按固定种子从地图点击进入商店和休息处，分别确认商品、营火行动/休息/锻造可见且没有全屏地图覆盖；临时服务和标签页已关闭，未触碰用户当前会话。`node --check web/app.js` 与 `git diff --check` 通过。
- 宝箱房间进入时，快照现在提供原版 `open` 对应的“开启宝箱”网页按钮；开启后继续显示原版遗物候选和跳过选项。命令历史面板暂时从布局隐藏，当前标签页记录仍保留在 `sessionStorage`，命令框继续可用。
- 修复地图与问号事件的前端状态切换：`Event/EventRoom` 在有原版选项、或仍未完成结算时强制收起自动地图和已打开的地图覆盖层，避免问号事件选项被地图盖住而看起来像被跳过；事件完成后先保留事件结果和路线清单，点击“查看地图”或路线按钮后再导航。路线清单新增“查看地图”按钮，命令框仍可输入 `map`；显式打开地图时保留覆盖层，关闭后仍能看到房间文本和选项。
- 检查事件动态文本：原版 `.cache/source/MegaCrit.Sts2.Core.Models.Events/Wellspring.cs` 的 `CanonicalVars` 明确定义 `BatheCurses=1`，`Bathe()` 用该变量添加 1 张愧疚；此前适配层只调用 `Text(o.Description)`，没有注入 `eventModel.DynamicVars`，所以网页显示了字面量 `[BatheCurses]`。`runtime/Main.cs` 现保留 `EventOption` 构造时的角色详情/多人变量，并按原版 `NEventOptionButton._Ready` 在显示标题/说明前注入事件动态变量；固定 `WEBTEST` 房间流程确认“仔细翻找”显示“失去14点生命，获得天选芝士。”，不含 `{Damage}` 占位符。
- 动态文本修复后，最新 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`、`python3 tests/room_flow_smoke.py --seed WEBTEST`、`node --check web/app.js`、`git diff --check` 均通过；其它 smoke 使用前一轮交互补丁的结果，存档与幕首 smoke 未在本轮最新补丁后重跑。
- 最新 `runtime/Main.cs` / Godot Mono assembly SHA-256：`38aa34ea28e0cd733b56577a305fc95cfdaf6de46d7d7ba73a10a96e7700cd93` / `12dfc790f98e9e10386a5b268ca453d64d5d751c19e83000cafa09b412188dfd`。原版来源边界、TestMode 差异、Build 归属及完整性限制仍按 `docs/engine-coverage.md` 和 `docs/sources.md`。

## 20. Boss 战敌方信息修正（2026-09-22）

用户反馈 Boss 战没有显示 Boss 信息。检查发现快照只从玩家 Creature 的 CombatState 读取敌人，且意图悬浮提示、Power 说明任一原版资源异常都可能中断整个敌方视图生成。现在战斗期间优先读取原版 `CombatManager.DebugOnlyGetState().Enemies`，并将每个敌人的名称、意图、Power 分开保护；缺少意图贴图时仍保留敌人名称、当前/最大生命和可生成的原版文字。快照新增当前 CombatRoom 的原版遭遇标题与是否 Boss 标记，网页在 Boss 战面板显示该标题。

隔离 TestMode 固定路线 `BOSSFLOW` 已通过原版路线进入 Boss 战，报告 `.cache/boss-display-smoke.json` 确认：`combat.type=Boss`、Boss“仪式兽”、`252/252` HP 以及原版“强化”意图说明。最新构建 0 warning、0 error；`engine_smoke`、`room_flow_smoke`、`node --check web/app.js` 和 `git diff --check` 通过。该验证只覆盖一个 Boss 和首回合快照；全部 Boss、多阶段 Boss、普通图形模式和浏览器视觉仍未覆盖，不能据此宣称完整 1:1。

## 21. Boss 结算进入下一幕（2026-09-22）

用户反馈第一幕 Boss 打完后无法进入下一轮。原版 `.cache/source/MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 `EnterNextAct()` 已规定：当前幕不是最后一幕时调用 `EnterAct(CurrentActIndex + 1)`，最后一幕进入 `TheArchitect` 终局事件；标准 `ActModel.GetRandomList()` 在本构建生成 3 幕。问题在终端入口：Boss 地图点没有 `Children`，结算后 `routes=[]`，网页只显示路线列表，因此没有可点击动作。

现在 `runtime/Main.cs` 在 Boss 奖励、战斗和原版结算全部完成后提供 `proceed`；快照 `actions` 暴露“进入下一幕”，第三幕暴露“进入终局事件”。该命令仍直接调用原版 `RunManager.EnterNextAct()`，没有由网页重造地图或房间。快照新增 `actCount`，网页阶段显示“第 X/3 幕”。

`python3 tests/boss_transition_smoke.py --seed BOSSFLOW` 已通过：使用测试专用原版死亡入口完成第一幕 Boss，确认结算前有 `proceed` 动作，执行后状态为第 2 幕 `Map`，并出现唯一 `Ancient` 开局路线；报告 `.cache/boss-transition-smoke.json`。该 smoke 只验证 Boss 后续流程和入口，不将测试击杀当作战斗伤害规则验证。最新构建 0 warning、0 error，`node --check web/app.js`、`python3 -m py_compile tests/boss_transition_smoke.py`、`git diff --check` 通过。

## 22. 问号事件初始化时序（2026-09-22）

用户再次反馈点击问号后直接回到地图。固定种子 `BOSSFLOW` 的 Godot Host 重复验证显示，原版 Unknown 点实际进入 `EventRoom`，并产生 2 个原版事件选项；HTTP 桥没有把事件规则替换成空流程。

根因是原版 `.cache/source/MegaCrit.Sts2.Core.Rooms/EventRoom.cs` 在 `EnterInternal()` 中调用 `EventSynchronizer.BeginEvent()`，而 `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/EventSynchronizer.cs` 对 `EventModel.BeginEvent()` 使用 `TaskHelper.RunSafely()` 异步启动。此前 `Settle()` 可能在选项填充前发布空快照，网页仅凭 `options/canLeave` 判断时会出现地图覆盖或“事件被跳过”的表象。

另需区分原版随机规则：`.cache/source/MegaCrit.Sts2.Core.Odds/UnknownMapPointOdds.cs` 规定全新 `NumberOfRuns == 0` 时前两个 Unknown 固定为事件、第三个固定为普通战；之后 `?` 可按原版概率变成事件、战斗、宝箱或商店。只有快照 `phase=Event/EventRoom` 时才是事件入口。

现已修复：

- `runtime/Main.cs` 在返回命令快照前等待未完成且选项为空的原版事件初始化；`CanLeave()` 和事件提示也拒绝把该状态当成已完成。
- 快照增加 `eventState.initialized/finished/optionCount`；`web/app.js` 在初始化状态或路线点击刚进入事件时强制收起地图并清除残留手动地图标记。
- 新增 `tests/unknown_event_smoke.py`，固定 `BOSSFLOW` 进入 Unknown 点，确认事件先显示原版选项、`canLeave=false`；报告为 `.cache/unknown-event-smoke.json`。

本轮 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`、`engine_smoke`、`room_flow_smoke`、`unknown_event_smoke`、`node --check web/app.js`、Python 编译检查及 `git diff --check` 均通过。仍未完成普通图形版同种子对照和全部随机事件覆盖。

本轮最终 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `db1273350972dffc085eb59fe29b27ae612dc5d0032cd9703714854ee497febe` / `93bae58c1c400ecc3175611c1c14f66fefccf7a4c6835584738de1fe43b27f56`；同一构建下 `boss_transition_smoke`、`act_opening_smoke`、`choice_adapters_smoke` 和 `save_smoke` 也通过。

## 23. 休息处被地图覆盖（2026-09-22）

用户反馈进入休息处后又直接显示地图。固定 `WEBTEST` 进入休息处的原版快照实际包含“休息”和“锻造”两个选项，`canLeave=false`；因此原版 `RestSiteSynchronizer` 和房间入口没有跳过。问题在网页地图同步：休息处此前只用 `options.length > 0` 抑制地图，空选项的过渡快照没有使用 `canLeave=false`，旧的路线覆盖层可能继续保留。

现已修复：

- `web/app.js` 将休息处和所有尚未完成的非地图房间统一按 `canLeave=false` 收起旧地图；休息处即使选项列表暂时为空，也不会把地图当成交互结果。
- `runtime/Main.cs` 快照新增 `restState.initialized/actionCompleted/optionCount/enabledCount`，用于区分原版行动是否已生成、是否成功完成。
- `tests/room_flow_smoke.py` 现在断言进入休息处时行动已初始化但尚未完成，取消锻造后仍不可离开，成功休息后才开放路线。

本轮重新构建并通过 `room_flow_smoke`、`unknown_event_smoke`、`node --check web/app.js`、Python 编译检查和 `git diff --check`。普通浏览器点击回归仍受当前环境没有浏览器控制面的限制。

本轮最终 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `5a1fedf53d5ea44ccb17b47f8d6829cbd3d515a6f196c586c68b64728850866a` / `01b6a43e99f139b127eb8611d25bb26328f249f211cdb35db26f828eaab114f7`。

## 24. 地图点击后的房间过渡屏障（2026-09-22）

用户实测问号和休息处仍有“点击后不显示文本，直接回到地图”的情况。检查原版调用链后确认两类房间共用一个入口时序问题：`VoteForMapCoordAction` 只登记地图投票，原版同步器再排队 `MoveToMapCoordAction`；后者通过 `TaskHelper.RunSafely` 启动 `RunManager.EnterMapCoord()`，自己的 `GameAction` 会先结束。若桥接层立即发布快照，网页可能收到目标坐标已变化但目标房间尚未进入的中间状态，旧路线图就会继续显示。

现已修复：

- `runtime/Main.cs` 的 `move` 记录目标 `MapCoord` 和源房间；`Settle()` 等待目标坐标切换、源房间退出、目标房间进入后才发布快照。动作失败时清除等待状态，避免污染后续旅程。
- `Settle()` 同时等待休息处在原版选项生成前的空选项过渡帧；`restState` 继续用于网页显示初始化和行动完成状态。
- 原版规则和入口未在网页层重造，仍由 `MapSelectionSynchronizer`、`MoveToMapCoordAction`、`RunManager.EnterMapCoord` 和房间自身负责。

本轮重新构建：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`，0 warning、0 error。以下检查均通过：

- `python3 tests/engine_smoke.py --seed WEBTEST`
- `python3 tests/room_flow_smoke.py --seed WEBTEST`
- `python3 tests/unknown_event_smoke.py --seed BOSSFLOW`
- `node --check web/app.js`
- Python 编译检查与 `git diff --check`

本轮最终 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `0190b793e23036996ddf048cb072f31eccf462b5a5cafd86065342caf3b8f593` / `89992d0417f8136d5d384f3019be7eb3894088622b36fff083026cfd02615701`。当前环境没有浏览器控制面，因此未声称完成真实网页点击目视回归；后续若仍出现问题，应保留点击后的第一份快照和命令响应，区分服务端过渡屏障与浏览器覆盖层状态。

## 25. 商店离店动作（2026-09-22）

原版 `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NMerchantRoom.cs` 的 Proceed 按钮调用 `HideScreen()`，由 `NMapScreen.Instance.Open()` 打开地图。终端现在在商店快照的 `actions` 中提供“离开商店”（底层命令 `proceed`）；该命令继续调用原版 `RunManager.ProceedFromTerminalRewardsScreen()`，网页收到商店快照后将路线图作为显式地图请求打开，商品仍保留在当前房间状态中。

`room_flow_smoke` 新增了商店离店动作和 `proceed` 路线回归；最新构建 0 warning、0 error，`room_flow_smoke`、`engine_smoke`、`unknown_event_smoke`、`node --check web/app.js` 和 `git diff --check` 均通过。最新 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `cf139407ecf700bda62da84fa8d2a040b3d59af7ead5a81eb3eb54d7d98aa578` / `24e1f7ee81717cb9bea5976f93427ab3512a6fe47eed1ef5c22d9ebc0787f22d`。当前环境没有浏览器控制面，未做真实网页点按目视回归。

## 26. 战斗手牌点击入口（2026-09-22）

网页战斗手牌现在可以直接点击：无目标卡牌提交 `play 手牌编号`；`AnyEnemy` 卡牌点击后高亮原版快照中的敌方单位，选择敌人后提交 `play 手牌编号 敌人编号`；`AnyAlly` 卡牌点击后高亮角色状态，选择战士后提交 `play 手牌编号 1`。这些只是内置命令的快捷入口，实际目标合法性、能量和卡牌效果仍由 `runtime/Main.cs` 的原版 `CardModel.CanPlay/IsValidTarget` 路径处理，命令框继续可用。

本轮只改网页层，没有重新编译 DLL；`node --check web/app.js` 与 `git diff --check` 通过。当前环境没有浏览器控制面，未做真实鼠标点按目视验收；待有浏览器控制面时应在固定首战中分别点击无目标攻击/防御、敌方目标卡和角色目标卡，并检查失败命令不会绕过原版校验。

## 27. 启动提示与手牌间距（2026-09-22）

网页初始连接时不再把“终端已就绪 / 规则来源 / 验证阶段”说明写入主规则日志；未开始旅程时仍保留欢迎页和输入提示，`help` 与 `new ironclad` 的实际命令提示不变。`continue` 成功后的“已恢复战士旅程”属于存档状态反馈，继续保留。

战斗手牌仍为双列，但提高卡牌最小高度、上下内边距、列距和行距，并增大中文卡名与说明行距；标题和说明现在共用同一内容列，且覆盖全局 `button span` 的提交按钮左边距，避免可点击卡牌标题相对描述发生横向偏移。桌面手牌区域上限同步放宽，窄屏使用较小但仍有间距的版本，避免四张起始牌挤在一块。网页样式链接增加版本参数，确保旧 CSS 缓存不会继续覆盖修正。

本轮重新构建：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`，0 warning、0 error。以下检查通过：

- `python3 tests/engine_smoke.py --seed WEBTEST`
- `python3 tests/room_flow_smoke.py --seed WEBTEST`
- `python3 tests/unknown_event_smoke.py --seed BOSSFLOW`
- `node --check web/app.js`
- `git diff --check`

本轮最终 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `0e7b8c916a5fd10c58aa78bfbd3bf90bdbfe6aeb0256a0abb29e8ca675c0b594` / `bbe5c59ff6c4841befd8f9ef6a36c1dba06433079ea9a5f5d62151a9b23ebae6`。当前环境没有浏览器控制面，未做本轮真实网页视觉回归。

## 28. 地图缩放和当前节点定位（2026-09-22）

地图覆盖层增加缩小、重置、放大控件，缩放范围为 75%–250%，步进 25%；地图打开时也可使用键盘 `+`、`-` 和 `0`。缩放仅改变网页地图 SVG 的显示尺寸，原版节点坐标、连接和路线选择仍来自快照，手绘笔迹继续使用原始地图坐标保存。

地图打开、换幕、进入新节点或改变缩放后，网页会自动把快照中的 `map.current` 节点滚动到视区中央，只调整视角，不触发节点点击或夺取节点焦点。地图内容在可用空间内保持居中；地图保留滚轮、触屏滚动和缩放后的原生滚动条，不再提供自定义拖拽平移。地图画布及 SVG 元素禁止文本选择和原生拖拽，轻点仍可点击可达节点执行 `move`。

本轮只改网页层；`node --check web/app.js`、HTML ID 完整性检查和 `git diff --check` 通过。当前环境没有浏览器控制面，未声称完成真实浏览器视觉回归。

## 29. 事件卡牌变化结果（2026-09-22）

用户反馈问号事件选择变牌后没有看到实际结果，网页很快切到地图。检查原版调用链后确认，`EventSynchronizer.ChooseOptionForEvent()` 会把 `EventOption.Chosen()` 加入待处理任务；原版 `CardCmd.TransformTo*()` 在当前地图点历史的 `PlayerMapPointHistoryEntry.CardsTransformed` 中记录 `CardTransformationHistoryEntry.OriginalCard/FinalCard`。此前终端只发布事件描述，没有把这份原版历史呈现出来。

现已修复：

- `runtime/Main.cs` 在原版事件任务结算后读取当前地图点的 `CardsTransformed` 增量，使用原版 `ModelDb` 卡牌标题和升级等级显示“原版变化结果：原卡 → 新卡”；按历史对象游标去重，不重造随机结果。
- `web/app.js` 识别 `eventState.finished=true` 的已完成事件，保留事件结果与路线清单，不自动打开地图覆盖结果；点击“查看地图”、路线或手动输入 `map` 后才打开/导航。
- 更新 `docs/interface.md`、`docs/engine-coverage.md` 和本交接记录，明确事件完成后的导航行为和原版历史依据。

本轮 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error；`node --check web/app.js` 与 `git diff --check` 通过。当前 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `1fbe8097807f3c7144b7fef8deab2e9a5437c6d4899be31e613f863cf8d52ffd` / `33f30ce35a19c9e6d30091dd16849433aeba03b8cec921f6ded66d095e6fc300`。当前环境没有浏览器控制面，未做真实网页点击目视回归；未据此宣称全部事件或完整玩法 1:1。

## 30. 移除主消息日志区域（2026-09-27）

用户需要更多主界面空间，已从 `web/index.html` 移除 `#journal`，并清理其样式和前端 DOM 引用。命令响应与错误现在通过自动收起的浮层反馈显示，不在中间内容区累积，占用的页面布局空间为零；`clear` 清除此临时提示。变牌事件的原卡/新卡结果会留在当前事件区域，直到离开该事件。静态资源版本号已更新，浏览器会加载新脚本和样式。本轮未运行测试；没有做浏览器视觉验收。

## 31. 敌方意图说明浮窗（2026-09-27）

每条可见敌方意图旁增加“？”按钮，说明取自状态快照中的原版意图标题、标签和描述；原有鼠标悬停提示保留。点击后使用原生 `dialog` 显示完整内容，可用关闭按钮、Esc 或点击浮窗外部关闭。隐藏提示的意图仍按快照标记隐藏。本轮未运行测试或浏览器视觉验收。

## 32. 命令反馈浮层位置与关闭按钮（2026-09-27）

命令反馈浮层移到主内容顶部，并新增“×”按钮供用户提前关闭；12 秒自动收起仍保留。消息本体与按钮分开渲染，关闭会清空当前提示，不影响游戏状态。静态资源版本已更新。本轮未运行测试或浏览器视觉验收。该命令消息浮层于 2026-09-28 按用户要求整体移除，最终状态见第 35 节。

## 34. 选牌列表不重复显示消息浮层（2026-09-27）

卡牌奖励进入选择时，原版终端适配器会同时将编号卡牌描述写入 `messages`，网页也会在 `options` 中显示同一批卡牌。网页现在比对当前可见卡牌选项与编号消息，只抑制重复的卡牌/替代选项行；其余反馈和命令错误继续显示。本轮未运行测试或浏览器视觉验收。此后不再用消息浮层；选项直接显示，错误使用底部状态行。

## 33. 卡牌类型中文与标题装饰清理（2026-09-27）

选牌选项将卡牌类型移至卡名同一行，名称、类型和费用各自对齐；类型取自原版 `CardType.ToLocString()` 的简体中文词条（攻击、技能、能力、状态、诅咒、任务、无），供手牌和选牌列表显示。页眉移除 `COMMAND EDITION`，主位置标题上方移除 `THE ASCENT`，版本号标识改用中文“版本”。本轮未运行测试或浏览器视觉验收。


## 35. 移除反馈浮层并修正选牌排版与原版词条提示（2026-09-28）

按用户要求移除命令消息浮层；原版消息不再重复覆盖选项列表，事件变牌结果仍留在事件区域。命令错误在命令栏上方状态行显示。选项错位原因是全局 `button span` 左边距影响了卡名、序号等内容；现限定该装饰样式只作用于命令提交按钮，并明确卡名和描述的对齐样式。卡牌类型快照改为直接读取原版 `CardType.ToLocString()` 中文文本，攻击、技能、能力等在选项名称行显示。卡牌特殊词条的标题和说明由原版 `CardModel.HoverTips` 传入快照；网页在描述中对应词条上悬停显示，例如“重放”。静态资源版本号已更新。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误）；`node --check web/app.js` 与 `git diff --check` 通过。本轮没有运行玩法测试，也没有浏览器视觉验收。最新 `runtime/Main.cs` / 生成程序集 SHA-256 为 `4d47cb87c1f041b254c964a2f1a2f98eb2424870d53522d1d262ce968e0c6d5d` / `9acbd12eab47d13216d147910beb322a98666ed13758817135f70480fe63c8e0`。

## 36. 静默猎手与点击式角色菜单（2026-09-28）

用户要求不依赖命令输入开局，加入原版猎手角色并自行测试，不在开发途中要求决策。已将原版类型 `Silent`（本机中文名“静默猎手”）加入角色菜单：菜单从 `CharacterModel` 读取原版描述、生命、金币、起始牌数和初始遗物；选定后 `new silent` 使用原版 `Player.CreateForNewRun(CharacterModel, UnlockState, ulong)`，并依据原版 `UnlockState.Characters` 校验。已有战士 `new ironclad` 兼容保留。网页新增“开始新旅程 → 角色选择”按钮流程，失败/胜利后也能打开菜单；继续存档由“继续旅程”按钮执行。命令框仍可用，但不再是开始游戏的必经入口。

解锁提示来自 `.cache/extracted/localization/zhs/epochs.json` 的 `SILENT1_EPOCH.unlockInfo`（以铁甲战士完成一局游戏后揭示）；解锁资格取原版标准单人进度中的 `TotalWins + TotalLosses`。原版 `NeowEpoch.QueueUnlocks()` 与 `Silent1Epoch.QueueUnlocks()` 的非视觉存档效果由 `SaveManager` 适配，Timeline 画面和动画未复刻。原版 `CreatureCmd` 在 TestMode 下跳过失败局的 `RunManager.OnEnded(false)`；宿主现于死亡结算时调用这个原版结算方法，使 `ProgressSaveManager` 记录完成局计数。菜单的“揭示并开始”在满足条件后揭示 Silent Epoch、写入 pending character unlock 和时间线扩展，再进入原版角色开局。该适配只覆盖当前网页需要的单人流程，不宣称原版 Timeline 或整个游戏完整 1:1。

新增 `tests/silent_character_smoke.py`：隔离进度验证新档下 Silent 锁定、锁定时拒绝开局、Ironclad 原版失败局记录、满足条件后揭示，以及 Silent 的 70 HP / 99 金币 / 12 张起始牌 / 原版蛇之戒指和 Neow 开局。最新构建成功，0 warning、0 error；本轮 `silent_character_smoke.py`、`engine_smoke.py`、`save_smoke.py` 通过；`node --check web/app.js` 与 `git diff --check` 通过。尝试启动本地网页服务做可视化检查时，沙箱返回 `Operation not permitted`，Chrome 控制面也未提供可用浏览器页；因此本轮没有真实浏览器点击/视觉验收。Steam Build `23811903` 归属仍按 manifest 记为未独立验证。

## 37. 原版主菜单层级与新旅程点击修正（2026-09-28）

用户指出主菜单下的小字说明未经原版支持，并询问“放弃当前游戏”是否原版入口。源码核查结论：根菜单 `NMainMenuTextButton` 只显示本地化按钮名，没有副标题；“放弃当前游戏”确为原版按钮，只在有 run 存档时出现。子菜单 `NSubmenuButton` 确实有说明文字，且未解锁时会显示 `*.LOCKED.description`。

当前网页主菜单已改为原版本地化按钮名，不再附加自拟短说明；run 存档存在时隐藏单人模式，显示“继续游戏”和“放弃当前游戏”。放弃确认使用原版标题、正文和按钮文案。原版 `NMainMenu.AbandonRun()` 会把该局记为失败并写 run history；`runtime/Main.cs` 现从活动 RunManager 或 `SaveManager.LoadRunSave()` 取序列化旅程，调用原版 `UpdateProgressWithRunData(..., false)` 和 `RunHistoryUtilities.CreateRunHistoryEntry(..., isAbandoned:true, ...)` 后删存档。无存档时，单人模式根据原版 `Progress.NumberOfRuns` 决定首次直接角色选择、后续进入模式子菜单。标准/每日/自定名称和说明取本机原版本地化；Daily/Custom 锁定状态取原版 Epoch 解锁状态。

网页仅实现标准单人模式。多人、百科、时间线、设置、退出及每日/自定模式目前不能启动；仍以原版名称和可获得的原版显示条件呈现，未添加“网页终端暂未接入”等副标题。源码细节见 `docs/sources.md` 的“本机原版主菜单与单人模式层级依据”。本轮修改 `runtime/Main.cs`、`web/app.js`、`web/style.css`、`web/index.html`、`docs/interface.md`、`docs/sources.md` 和本交接记录；网页静态资源参数已更新为 `20260928-main-menu-4`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误），`node --check web/app.js` 与 `git diff --check` 通过；未运行玩法 smoke。当前环境没有浏览器可执行文件，且此前本机服务启动受沙箱端口权限限制，尚无真实页面点击/视觉验收。

## 38. 侧栏路线预览与命令速查移除（2026-09-28）

用户要求移除右侧“命令速查”，把路线预览及“查看地图”入口放到右侧。已从 `web/index.html` 删除命令速查区，在角色状态下方新增路线侧栏面板；`web/app.js` 将路线清单从中间选项区迁至此面板，可达路线仍调用 `move`，地图按钮调用 `map`。地图覆盖层打开时隐藏侧栏路线面板，收起后重新显示。`web/style.css` 为侧栏中的路线列表和地图按钮补充紧凑样式，`docs/interface.md` 同步布局说明，静态资源缓存版本更新为 `20260928-sidebar-routes-1`。

`node --check web/app.js` 与 `git diff --check` 通过。刷新了当前 Chrome 中运行的本地游戏页，AX 树确认命令速查已消失且路线预览/地图按钮位于右侧；截图也确认布局正常。未运行玩法测试。

## 39. 右侧路线入口精简（2026-09-28）

用户要求路线侧栏只保留“查看地图”，并提高按钮默认态亮度。已删去路线节点文字清单和辅助标题，只在存在后续路线且地图覆盖层收起时显示“查看地图”按钮；具体路线仍在原版节点地图中查看与点击。按钮默认背景、文字和边框改用更亮的暖铜色，悬停态继续增强对比。网页资源缓存版本更新为 `20260928-sidebar-routes-2`，`docs/interface.md` 已同步。

`node --check web/app.js`、`git diff --check` 通过。刷新 Chrome 当前页后，确认侧栏只显示“查看地图”按钮，默认态对比度已提高；未运行玩法测试。

## 40. 事件结束后的原版继续选项（2026-09-28）

用户报告部分事件结束后没有离开入口。对照 `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NEventRoom.cs` 后发现：原版 `SetOptions()` 在 `EventModel.IsFinished` 时，即使 `CurrentOptions` 为空，也会注入标题来自 `events.PROCEED.title` 的“继续”选项；点击会打开地图。网页此前只枚举 `CurrentOptions`，因此结束页没有选项。

现于 `runtime/Main.cs` 的事件快照在 `IsFinished` 时提供原版本地化“继续”选项，点击走网页 `map` 命令打开路线图。是否能前往具体路线仍由 `CanLeave()` 控制。`docs/sources.md` 和 `docs/interface.md` 已补充依据。最终 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；未运行玩法 smoke，也未在活跃旅程上点击推进。

## 41. 战斗结束回合按钮与自动出牌文本（2026-09-28）

战斗手牌区顶部增加“结束回合”按钮，玩家回合可用且结算空闲时启用；即使手牌为空也显示。网页按钮提交现有 `end` 命令，继续由运行时验证玩家回合状态并创建原版 `EndPlayerTurnAction`。原版依据为 `.cache/source/MegaCrit.Sts2.Core.Nodes.Combat/NEndTurnButton.cs` 与 `.cache/source/MegaCrit.Sts2.Core.GameActions/EndPlayerTurnAction.cs`。

运行时订阅原版 `CombatManager.History.Changed`，读取新增的 `CardPlayFinishedEntry`，只记录 `CardPlay.IsAutoPlay` 为真的当前玩家出牌，并使用原版本地化卡名。卡牌列表显示在战斗文本区的敌人信息下方；原版会清空历史，因此在清理前已收集的列表会保留到离开该地图节点，并在新战斗/新旅程时重置。`docs/sources.md` 补充了 `CardCmd.AutoPlay()`、`CardPlay.IsAutoPlay` 和 `CombatHistory` 的原版证据。此处只展示被原版历史明确标记为自动打出的卡牌，不声称覆盖全部自动效果或完整复刻战斗日志。

验证：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。当前源文件 SHA-256：`runtime/Main.cs` `03ba069366a27862a372b9c2ee72035eff0a7eff399068026864719320b7d638`；最新构建 `runtime/.godot/mono/temp/bin/Debug/SpireCli.dll` `35e36fd7a7df3fd1ccd2f7c7f68f973dc2b0e6ad711b8f7de8adc277e7f1fd75`。未启动/重启 Godot 桥，也未在当前存档中推进战斗；没有做实际游戏内点击验证。运行时变更需重启桥接进程后载入。

## 42. 偷窃草蜢显示被偷卡牌（2026-09-28）

原版 `.cache/source/MegaCrit.Sts2.Core.Models.Monsters/ThievingHopper.cs` 的 `ThieveryMove()` 将实际偷到的牌交给 `SwipePower.Steal(CardModel)`；`.cache/source/MegaCrit.Sts2.Core.Models.Powers/SwipePower.cs` 将牌的实例保存在 `StolenCard`。运行时现在从敌人身上的 `SwipePower` 读取卡名并随敌人快照提供 `stolenCards`，网页在敌人资料下显示“偷走的牌：牌名”。没有成功偷牌时不显示。资料依据已记录在 `docs/sources.md`，不按意图描述猜牌名。

验证：最新 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` SHA-256 `dabdac0809e21c729a62746db03a4dd00e006104303771de08720d506bf8c638`；`runtime/.godot/mono/temp/bin/Debug/SpireCli.dll` SHA-256 `c2434bc6a983b140f1c2e12b21979b9d9f9ab5d4fc73c59d08be8b24fdb7dc69`。未重启桥接进程或推进当前旅程，尚未在实战中视觉验收。

## 43. 偷窃草蜢被偷卡牌预览与可选取回（2026-09-28）

原版证据：`ThievingHopper.ThieveryMove()` 把牌交给 `SwipePower`；其死亡结算将 `SpecialCardReward` 加到原版战斗奖励中。`SpecialCardReward.HoverTips` 提供被偷卡牌的 `CardHoverTip`，`OnSelect()` 才将卡牌加入牌组。原版奖励屏聚焦时显示该卡牌提示，点击领取；继续离开时同步器会对未领取项调用 `OnSkipped()`。

网页中，战斗里的被偷卡名可点开查看牌面；战斗奖励为这张牌显示“查看牌面”和“取回”按钮。预览提供“返回奖励列表”，返回不会改变奖励状态；如决定不取回，可在奖励列表使用原有的“跳过剩余奖励”操作。领取调用原版 `take`/`SelectLocalReward()`，跳过由原版奖励同步器处理未领取项。常规特殊卡牌奖励仍显示“领取”，不会误标为“取回”。静态资源参数更新为 `20260928-hopper-reward-2`。源码依据同步到 `docs/sources.md` 与 `docs/interface.md`。

验证：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。移除预览中的跳过按钮后重新编译，`runtime/Main.cs` SHA-256 `5893c69562d215c410369f945ae566604cfdd9fa58e5b8b15411beeab1ec8cc7`；`runtime/.godot/mono/temp/bin/Debug/SpireCli.dll` SHA-256 `5d342385f763e6d6e92324fee08fc4cc8b3577320e2170ea9c5904c6483dc3a0`。未在当前旅程推进战斗或实测奖励点击；运行时更新需重启桥接进程后加载。

## 44. 可点击按钮的默认强调样式（2026-09-28）

独立操作按钮默认采用暖铜色强调，包含牌面预览、地图工具、菜单次级操作和奖励操作；禁用态仍弱化，被偷卡名字保留行内文字链接样式。奖励、事件等整行选择维持紧凑分隔列表，不铺整块底色。只有用户明确提出时才把可用按钮设为低调样式。CSS 缓存版本更新为 `20260928-button-emphasis-2`；规则记录在 `docs/interface.md`。

## 45. 水晶球占卜事件交互（2026-09-28）

修复占卜事件选择服务方案后无法继续的问题。原版 `CrystalSphere.UncoverFuture()` 扣除当次动态金币费用、创建 3 次占卜；`PaymentPlan()` 添加原版 Debt、创建 6 次占卜。两条路径均等待 `CrystalSphereMinigame.PlayMinigame()` 完成后再结束事件。

根因有两处：TestMode 下 `NCrystalSphereCell.Create()` 和 `NCrystalSphereItem.Create()` 不创建图形节点，但 `PlayMinigame()` 仍等待屏幕输入；网页快照同时把活动小游戏视作未完成事件初始化，`Settle()` 因空事件选项持续等待。当前补丁将原版 `NCrystalSphereScreen.ShowScreen()` 在 TestMode 下窄范围重定向至桥接器登记同一个原版模型；网页呈现原版本地化说明、大小工具和棋盘，按钮提交 `scry` 内置命令，Godot 主线程调用原版 `SetTool()` / `CellClicked()`。活动期间快照保留 Event 阶段，事件初始化等待跳过该已注册小游戏。

格子点击次数、Big/Small 清格、物品揭示条件、揭示时的诅咒副作用、最终奖励生成及事件完成继续由原版模型与同步器执行。快照只有在物品所占格子全揭开后才显示该物品；隐藏物品不下发网页。悬停格子依原版 `SetHoveredCell()` 预览清格区域。原版会逐格揭开物品纹理，网页目前只显示完整揭示后的类型标签，不复刻纹理碎片与动画。原版 TestMode 不会创建的水晶球场景控件没有伪称已复刻；实际水晶球房间流程尚未运行回归，Build `23811903` 的文件归属仍未经独立验证。具体源码依据见 `docs/sources.md` 的水晶球小节。

验证范围：`tools/sts2-bridge-patcher` 与 `runtime` 均重新构建成功（0 warning、0 error），补丁器确认原版参考 DLL 哈希/MVID 后仅修改暂存 `runtime/lib/sts2.dll` 中的 `ShowScreen` 入口；原版 `reference/sts2.dll` 未修改。`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / `ChoiceAdapters.cs` / Godot Mono assembly / patched staged DLL SHA-256：`bb299728d9023be7c3e7c16b5675eecd8ecc212077b2bfc72d289308640e410a` / `dd95c63f5073958172bd2f3ccf9f18c48e909ca9289197cc6546db3655f90d9d` / `66e82670b98bf61fa9fb3163bd5dca2cb4045e274a19b19a97f2523a577b734a` / `a9d1b98403596e313fae0f6948800c7d8920573ec7dbc8bfa2ab6454b1d1f863`。本轮未运行玩法 smoke、未启动浏览器或推进存档；需要重启网页规则会话并进入水晶球事件做实际回归。

## 46. 水晶球奖励列表可见性（2026-09-28）

原版 `CrystalSphereCurse.RevealItem()` 在格子揭示诅咒时直接把 `Doubt` 加入牌组；该物品默认 `ToReward()` 返回 `null`，所以诅咒不会进入末尾奖励列表。其余已揭示金币、药水、卡牌奖励、遗物由原版 `OneOffSynchronizer.OfferCrystalSphereRewards()` 转为标准奖励并调用 `RewardsCmd.OfferCustom()`；非空时在正常模式显示 `NRewardsScreen`，TestMode 交给已接入的 `RewardsSet.testSelector`。原版奖励集为空时不会显示奖励界面。

网页此前在占卜次数用完、奖励列表出现时仍保留 11×11 棋盘，并把奖励选项渲染在棋盘之前；滚动位置若留在棋盘下半部，视觉上会只剩底部跳过按钮。本次在原版奖励集活动时收起已结束棋盘，并在棋盘消失的快照将中心滚动区归顶。奖励和诅咒都继续走原版对象与 API。网页静态资源版本更新为 `20260928-crystal-sphere-2`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误），`node --check web/app.js` 与 `git diff --check` 通过；当前 `runtime/Main.cs` / `runtime/.godot/mono/temp/bin/Debug/SpireCli.dll` SHA-256 为 `92d5e4090025b7a089ac68b3f4ffb3fd9ec0b83676930a9f1440ccaf973d83cc` / `42737b787651776a51007eec4f7520fbc20f715d19096043903047ba9bc4268f`。尚未运行真实事件流程或浏览器交互回归，不能据此声称端到端已验证。

## 47. 最后一幕 Boss 空奖励集（2026-09-28）

用户报告最终 Boss 通关后仍只看到“跳过剩余奖励”。本机原版 `RewardsSet.WithRewardsFromRoom()` 在最后一幕 Boss 明确返回空奖励集；`RewardsSetSynchronizer.BeginRewardsSet()` 随后根据 `AllRewardsSuccessfullySelected` 将空集立即标记完成。问题在 `runtime/Main.cs` 的 TestMode `OfferRewards()`：即使 Rewards 为空也压入网页奖励栈，并等待一个永远不会有选择可完成的 TCS，因此 `ChoiceActions()` 错误地显示 skip，且 `CanLeave()` 因 `Choosing` 被挡住。

现在 `OfferRewards()` 遇到空奖励集直接返回完成任务，让原版同步器的完成状态继续向下传播；网页仅在集合中确有未领取奖励时显示“跳过剩余奖励”。空奖励集不再伪造可领取 UI，离开首领房的下一步继续由原版进度条件决定。已更新 `docs/sources.md` 与 `docs/engine-coverage.md`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误），`node --check web/app.js` 与 `git diff --check` 通过；当前 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `4501f37ca048f55bfcdd2b6338c2040b01a787a271598174831f614bc93e7853` / `573a1184666fc63f8cf4eb0472cb841d2ea22b5968934fc7c261e7df2985964f`。没有运行最终 Boss 实际流程或浏览器交互测试，不能据此宣称端到端已验证。

## 48. 建筑师终局对白接入（2026-09-28）

终局事件不再只显示一个“继续”按钮。网页快照读取原版 `TheArchitect` 当前 `AncientDialogueLine` 的本地化文本与说话人，网页按对白块显示；原版当前选项中的 `.next` 文案继续作为点击操作，例如“威胁”“回答”“继续”。这些分支和台词由 `TheArchitect.LoadDialogue()` 按原版角色胜场/总胜场与事件 RNG 选择，不由网页硬编码。点击后仍执行原版 `EventOption` 的 `AdvanceDialogue()`；末句由原版 `WinRun()` 和 `ActChangeSynchronizer` 结束旅程。

TestMode/headless 的首句在原版 `OnRoomEnter()` 中会先清空当前选项，等待 `PlayCurrentLine()` 从战斗场景找到说话 Creature。网页 Host 没有这套对白场景，建筑师首句因无法取得说话 Creature 而没有恢复按钮。现在只在终局事件、TestMode、首行且原版选项为空时，通过反射调用原版 `CreateOptionForCurrentLine()` 并交回原版 `EventModel.SetEventState()`；不合成或改写台词。来源和边界已写入 `docs/sources.md`、`docs/engine-coverage.md`、`docs/interface.md`。

`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。当前 `runtime/Main.cs` / Godot Mono assembly SHA-256：`5a508f4a83ecdd78bab8c285882f8445d0036bdb75f1c21fb3ac6e45285f75fd` / `36a249f5972809f013414f73cde282d274c6cb46be99aeba602aea5362fc00f6`。本轮未运行游戏/玩法测试，也未启动浏览器；终局对白逐句点击、末句胜利结算及视觉布局仍待实际回归，不能据此宣称完整终局或 1:1。运行时变更需重启网页规则服务后载入。

## 49. 终局后主菜单入口恢复（2026-09-28）

用户报告建筑师对白结束、回到开始菜单后所有入口都不可点击。原版 `NMainMenu.UpdateTimelineButtonBehavior()` 在无 run 存档且存在待揭示 Epoch 时要求先进入 Timeline，并禁用单人/多人/百科入口；网页尚未实现 Timeline 页面，而原前端也把 Timeline 项设为禁用，因此单人模式成为唯一应有的继续入口，却被原版门槛一起锁死。

`runtime/Main.cs` 现让无进行中存档时的单人模式入口保持可用。已结束一局时点击该入口仍按原版 `Progress.NumberOfRuns` 进入模式选择，再通过标准模式到角色选择。此适配不会调用 `RevealEpoch()`、自动揭示任何进度或清除待处理节点；网页 Timeline 页面和原版揭示交互仍未实现。依据与限制已同步到 `docs/sources.md`、`docs/engine-coverage.md` 和 `docs/interface.md`。

验证：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`git diff --check` 通过。最新 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `bfc93e8f99747516723d107d2510c45a4aa8b1e567882395107f81950f9a7631` / `e7e8ec5872dec511937a5b669680a305716a5508fe8a4865cc8510bf21a19cc0`。没有运行游戏流程或推进存档，因此这次确认的是构建与代码路径，不是建筑师结算到菜单的端到端回归；需要重启规则服务以加载新程序集。

## 50. 静默猎手未解锁时的原版角色选择显示（2026-09-28）

用户指出角色选择页显示“已满足揭示条件：以铁甲战士完成一局游戏来揭示这个历史节点”不是原版角色详情。核对 `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect/NCharacterSelectButton.cs` 与 `NCharacterSelectScreen.cs`：原版锁定角色按钮使用锁定图标；选中资料名为“锁定”，简介来自 `CharacterModel.GetUnlockText()`（静默猎手原文本“进行一局游戏来解锁这个角色。”），HP/金币显示 `??/??` / `???`，遗物名与描述使用“未知遗物”文本，启程按钮禁用。Epoch 的完成条件属于时间线节点提示，不显示在角色详情中。

网页快照现在在角色未解锁时只暴露并显示原版锁定分支数据；前端不再泄露角色实际名称、描述、开局属性、遗物或 Epoch 条件，也不再提供非原版的“揭示并开始”角色选择按钮。已解锁状态仍显示原版角色资料和可用开局按钮。原版 Timeline UI 尚未实现，`unlock silent` 命令保留为原版 `SaveManager` 解锁流程的宿主入口；角色页本身不代替时间线揭示。

网页静态资源版本更新为 `20260928-character-lock-1`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误）；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256 为 `2af20674340a0c1c746849d8d8556c32edd23ed518e4be851c1c6f4381c4d5b4` / `9219828b7f830c965141a2b8f998d9c1efed3ff58f363b31c9938f1dd16cf6fa`。未进行游戏流程测试或视觉验收，需刷新网页并重启规则服务载入新程序集。Timeline 页面未实现时，解锁仍需运行 `unlock silent`。

## 51. 旅程中右侧栏放弃入口（2026-09-28）

用户澄清需要的是进入旅程后的右侧放弃入口，不是改变开始菜单布局。原版 `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu/NPauseMenu.cs` 在暂停菜单显示本地化“放弃”，并按 `RunManager.IsInProgress` / `IRunState.IsGameOver` 控制可用性；点击会打开原版确认框，确认后调用 `RunManager.Abandon()`。简体中文按钮文案为 `gameplay_ui.PAUSE_MENU.GIVE_UP`。

网页在右侧栏加入“放弃”按钮，仅旅程进行中显示；状态快照沿用原版运行中/结束判定，确认框使用现有原版本地化文本，确认后提交已有 `abandon` 命令，由 headless 桥的原版存档进度和历史 API 记录失败并结束旅程。网页没有原版暂停菜单，因此入口位置属于网页适配，不代表暂停页面完整复刻。撤销了上一轮对开始菜单继续/放弃按钮的并排改动。静态资源版本为 `20260928-run-abandon-sidebar-1`。`node --check web/app.js` 与 `git diff --check` 通过；未运行游戏端到端流程。

## 52. 放弃结算与静默猎手时间线解锁（2026-09-28）

用户指出通过原版“放弃”快速结束对局后应能解锁后续角色。源码核对确认：游戏内确认走 `RunManager.Abandon()`，将 `IsAbandoned` 设为真并通过 `CreatureCmd.Kill(..., force:true)` 结束角色；`CreatureCmd` 在非 TestMode 才自动调用 `RunManager.OnEnded(false)`。本项目固定运行无窗口 TestMode，旧命令则绕过了原版 abandon 及 end 流程，直接写统计和历史。

`runtime/Main.cs` 的活动旅程 `abandon` 现在调用原版 `RunManager.Abandon()`；死亡动作结算后 `RecordHeadlessDefeatIfNeeded()` 调用原版 `RunManager.OnEnded(false)`，由 `ProgressSaveManager` 记录失败局和 `RunHistoryUtilities` 写历史。没有内存 Run 时的已存档菜单放弃路径保留原版进度更新/历史调用。对局结束后，若原版 `GetRevealableEpochs()` 与铁甲战士标准对局记录均满足，菜单自动进入仅支持静默猎手的可点击时间线节点；显示原版 `SILENT1_EPOCH.title`、`unlockInfo` 和“解锁”本地化。点击通过 `SaveManager.RevealEpoch()` 并写入 `Silent1Epoch.QueueUnlocks()` 对应的 pending character 与 timeline expansion 存档状态。旧 `unlock silent` 命令保留为兼容入口。

网页没有复刻完整 Timeline 场景、其它节点、人物揭示演出或动画；实现范围不代表完整 1:1。源码依据记在 `docs/sources.md`，覆盖边界记在 `docs/engine-coverage.md`。网页静态资源版本为 `20260928-abandon-unlock-1`。

验证：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256：`3c71794a942e78a532e2721ac94be3142fb6668bab996540b6851f1f6dbb1f86` / `d508f872892218a9966ab416f405d32d11cd4e0f6cf2b54f2ef7ad57d0d79e7b`。本轮未运行玩法测试、未点击实际浏览器界面或推进存档；放弃到失败计数、时间线显示、静默猎手解锁仍须在网页中实测。本轮修改不是 1:1 流程通过的证据；运行时变更需重启规则服务并刷新网页载入。

## 53. 放弃后清理残留运行存档备份（2026-09-28）

用户反馈在旅程中点击放弃后仍无法解锁静默猎手。检查最新服务日志 `.cache/service-logs/godot-MPQznrzV3-j-.log`：`RunManager.OnEnded(false)` 已写入 `progress.save`，并由 `RunHistoryUtilities` 写入失败历史；但 `SaveManager.DeleteCurrentRun()` 删除 `profile1/saves/current_run.save.backup` 报错。原版 `RunSaveManager.HasRunSave` 会把该备份继续视作可继续旅程，网页因此没有进入待揭示角色节点。日志同时有 `RunManager.AbandonInternal()` 的 headless UI 空引用；异常被原版捕获，随后仍完成失败结算及进度/历史写入，和阻塞解锁入口的残留备份是两个独立现象。

`runtime/Main.cs` 的 `RecordHeadlessDefeatIfNeeded()` 现在在原版 `RunManager.OnEnded(false)` 结束后调用 `DeleteCurrentRunSaveFiles()`；菜单已有存档的放弃路径也复用此清理。它先调用原版 `SaveManager.DeleteCurrentRun()`，再使用 `GetProfileScopedPath()` + `ProjectSettings.GlobalizePath()` 删除当前 profile 的主存档及 `.backup`，跨帧最多重试 5 次，并以原版 `HasRunSave` 验证已清空；若仍有文件则报告错误，不静默进入角色揭示流程。菜单清除路径按 `SerializableRun.StartTime` 检查原版 `${StartTime}.run` 历史，已结算的旧存档只清理文件、不重复增加失败次数或历史。此处只修复 headless 删除失败，不更改原版完成局数或揭示规则。

重新构建 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256：`4d248b6fc0df5cd3028f8f5604c3d2500433b8bc9011fe0ff49bdb23d0f456d0` / `b402bba2e19675daec309558d47008c5d470155ebbb202f1025ec3599ac91bf5`。本轮未重放实际网页操作或运行玩法测试。当前 shell 因系统权限限制，不能用 `ps` 检查或重启已运行的规则服务；需重启规则服务载入新程序集。若重启后主菜单仍显示旧存档的“继续/放弃当前游戏”，点主菜单放弃可安全清除它（按原版历史 `StartTime` 去重，不重复计数）；随后应显示待揭示节点，点“揭示”后静默猎手才可选。若仍不出现，再核对该服务使用的 profile 与进度文件，而非手动改解锁条件。

## 54. 按原版过期存档判定解锁时间线（2026-09-28）

用户再次反馈放弃后仍未看到静默猎手。最新两份服务日志 `.cache/service-logs/godot-5EKHY43Pl8jF.log`、`.cache/service-logs/godot-EJ7PXFNsSPTk.log` 证实此前编译确实被加载：`RunManager.OnEnded(false)` 各自写入失败进度和历史，但原版 `GodotFileIo.DeleteFile` 删除 `current_run.save` / `.backup` 持续报错。因此第 53 节的直接文件删除修补不足；`Publish()` 仍直接使用原版 `HasRunSave`，把已完成的旧存档当成进行中的旅程，继续隐藏时间线节点。

源码 `.cache/source/MegaCrit.Sts2.Core.Saves/SaveManager.cs` 的 `CleanupStaleCurrentRunSaveForProfile()` 明确按存档 `start_time` 查找 `${StartTime}.run`，有对应历史就判定为过期并尝试清除。因此 `runtime/Main.cs` 新增 `HasPendingRunSave()`：对主存档（不存在时才检查备份）读取 `start_time`，确认同名原版历史存在后，将其从继续/放弃/单人模式的 UI 存档门槛中排除；同时比对历史和存档中的 seed，避免只因时间戳重合就隐藏有效旅程。当前进程刚调用过原版 `RunManager.OnEnded(false)` 时，也会把残留存档视为已结算。底层清理仍继续尝试，但删除错误不会再挡住揭示入口。`Prompt()`、新旅程/继续命令和菜单快照统一走这一有效存档判定。放弃菜单清理仍通过历史名去重，不会重复累计失败。

重新构建 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 和 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256：`324a7a2dd15828b139d6a9193d5b491d5ca4c1199bf5d406b1e1aa946f7536b1` / `07a19747acd65ade5faf92c0e9c2667e1f2d3d4b6d00af31a15ce9a1a3afbcca`。尚未重放实际网页操作；需要重启规则服务加载程序集后复查。如果揭示节点仍不出现，应在该次服务日志中核对存档 seed、`StartTime` 历史匹配和静默猎手 Epoch 状态，不再反复放弃开局。

## 55. 修正放弃后的时间线菜单跳转并复测（2026-09-28）

用户再次反馈放弃后仍不能解锁猎手。最新日志 `.cache/service-logs/godot-_rOCgya0l3ub.log` 显示 `RunManager.AbandonInternal()` 在关闭 headless UI 节点时抛出 `NullReferenceException`，但原版方法捕获该异常后仍将旅程标为放弃并击杀玩家；之后桥接调用 `RunManager.OnEnded(false)`，失败进度和 `.run` 历史均写入。物理删除 current run 文件仍可能报错，当前存档判定已通过“同 StartTime 历史存在”将其视为已结束。隔离运行态复现中，放弃后局数增加、时间线强制打开且包含猎手 Epoch，说明这次空引用没有阻止败局结算。

隔离存档复现确认：`abandon` 后 `Progress.NumberOfRuns` 为 1、静默猎手仍按原版规则保持锁定，但 `mainMenu.timelineForced=true` 且存在 `SILENT1_EPOCH` 揭示项；点击揭示后角色解锁，并能以原版 70 HP、99 金币、12 张起始牌和“蛇之戒指”开始。注意放弃本身不会直接让猎手变为可选：原版先显示“迷雾压境”时间线节点，玩家还要点击“解锁”揭示 `SILENT1_EPOCH`。另外修正网页从主菜单放弃“已恢复的存档旅程”时的视图顺序：若命令返回状态要求强制打开时间线，确认回调必须保留时间线视图，不能再重置到开始菜单。资源版本更新为 `20260928-abandon-unlock-2`。

修正了 `tests/silent_character_smoke.py`：之前复用默认持久化测试存档，并断言旧快照中已经移除的 `unlockAvailable` 字段，失败并不能说明解锁功能；现在每次使用独立 `res://.cache/spirecli-silent-character-smoke-*` 存档，覆盖铁甲战士开局、活动旅程放弃、重启后从主菜单放弃已存档旅程、时间线揭示与静默猎手开局。`python3 tests/silent_character_smoke.py --timeout 90` 通过；两个放弃路径均记录 1 局败局并打开 Epoch 揭示项，揭示后静默猎手可以开局。`node --check web/app.js`、`git diff --check` 通过。此轮没有改动 C#，无需重编译或重启 Godot 规则服务；刷新网页载入新版静态资源。隔离烟测验证了原版引擎结算与角色揭示路径，没有做真实浏览器点击验收，也未把 headless UI 空引用说成完整正常原版调用。

之后核查启动命令时确认另一项会挡住揭示入口的环境差异：`.cache/source/MegaCrit.Sts2.Core.Debug/DebugSettings.cs` 将 `DevSkip` 定义为 `Environment.GetEnvironmentVariable("STS2_DEV_SKIP") != null`，不解析变量值；`server.py` 原先复制服务端环境启动 Godot，因此 `STS2_DEV_SKIP=0 python3 server.py` 也会让原版 `NMainMenu.UpdateTimelineButtonBehavior()` 跳过强制时间线。当前 `_godot_host_environment()` 在启动每个 Godot Host 前移除此变量。隔离 smoke 对传入值 `0` 的环境构造做了断言；`tests/http_smoke.py` 也加入带该变量启动服务并验证放弃/揭示的回归，但本轮执行在 `free_port()` 绑定 `127.0.0.1` 时被沙箱以 `PermissionError` 拒绝，未到 HTTP 服务启动阶段。当前交互 shell 未设置该变量，且没有运行中的默认 8765 服务可检查旧服务环境，因此不能认定用户此前那次一定由启动环境触发；现在网页服务会对此作防护。此次服务端与测试 Python 文件通过 `py_compile`，前端通过 `node --check`，补丁通过 `git diff --check`。

## 56. 放弃异步流程兜底与重启存档回归（2026-09-28）

用户澄清：游戏中点击放弃返回菜单后，菜单仍把旅程当作待处理存档，只能放弃而无法继续/揭示。隔离持久存档回放中，原版 `RunManager.Abandon()` 在 headless UI 节点关闭时会记录空引用；测试环境的大部分路径随后仍能正常死亡、结算与清理。为覆盖可能没有完成 `GuaranteeKillAllPlayers()` 的延迟/异常分支，`Settle()` 现在最多等待 120 帧；若放弃仍待处理、玩家存活且无正在结算的动作，则以原版 `CreatureCmd.Kill(player.Creature, force:true)` 补完死亡，再调用已有 `RunManager.OnEnded(false)` 与 current-run 清理。若原版 `IsAbandoned` 标记或玩家状态缺失，会保留存档并明确报错，不伪造完成局数。

将 `tests/silent_character_smoke.py` 扩展为活动旅程放弃后关闭并重启 Godot，再检查 `hasRunSave=false`、菜单不显示“继续/放弃当前游戏”、猎手 Epoch 仍待揭示。`python3 tests/silent_character_smoke.py --timeout 90` 通过，含重启检查；同时覆盖揭示后以静默猎手开局。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。隔离流程中原版击杀及时完成，超时兜底分支没有被触发；当前沙箱也不能连接用户正在运行的本机 127.0.0.1 服务，所以尚未验证用户旧服务/旧页面的实时状态。必须重启 `server.py` 让已加载的 Godot Host 使用新程序集；之后若菜单仍显示旧旅程的放弃项，再用菜单“放弃当前游戏”清除过期存档，正常结束的旅程应进入时间线揭示页，而不会提供继续该局。

## 57. 迁移旧档中未获得的静默猎手时间线节点（2026-09-28）

用户再次说明放弃后仍未解锁角色。检查当前真实 `progress.save` 发现铁甲战士已有对局记录，但 `SILENT1_EPOCH` 条目已存在、状态仍为 `not_obtained`。断点在 `EnsureTerminalTimelineProgress()`：它此前只在 epoch 条目完全缺失时复现 Neow 的 `QueueUnlocks()`，而真实档案已由 Neow 时间线扩展创建了 `NotObtained` 占位，所以每次启动都跳过 `ObtainEpochOverride(..., ObtainedNoSlot)`；扩展循环也只会把 `ObtainedNoSlot` 变为 `Obtained`。因此原版失败局记录正确写入，却没有可揭示的猎手 Epoch。

现在启动时会把 Silent epoch 缺失、`None`、`NoSlot` 或 `NotObtained` 状态迁移到 `ObtainedNoSlot`，随后照原版 `EpochModel.QueueTimelineExpansion()` 规则开放 `Obtained` 槽位；已获得或揭示的状态不会回退。`tests/silent_character_smoke.py` 新增旧档迁移夹具。最新构建 0 警告、0 错误；烟测通过迁移旧 `not_obtained` 节点、活动放弃、重启后时间线强制显示、揭示 Epoch 以及猎手开局。另将真实 `progress.save` 只读复制到隔离 `res://.cache/spirecli-*` 路径回放，确认启动迁移后会显示 `SILENT1_EPOCH`；角色在揭示前仍锁定，执行原版 Epoch 揭示后可选。未改动真实存档。

修复已编译到 `runtime/.godot/mono/temp/bin/Debug/SpireCli.dll`。当前运行中的 `server.py`/Godot Host 不会热加载 DLL，需用原命令重启服务；用户现有档案将在下次 Host 初始化时自动迁移，无需再放弃一局。原版解锁仍包含 Timeline 节点“解锁”交互；放弃计为完成/失败对局并使节点出现，不会跳过原版揭示步骤。网页实时状态无法在沙箱中连接本机 127.0.0.1 验证。

## 58. 接入储君（2026-09-28）

按原版储君模型接入第三个网页可选角色。`Regent.cs` 给出 75 HP、99 金币、10 张起始牌（4 张 Regent 打击、4 张 Regent 防御、陨星、崇拜）与初始遗物「天赋君权」；角色选择资料、开局和遗物效果都取自原版模型，不在宿主重写卡牌或规则。`DivineRight.AfterRoomEntered()` 原版在进入战斗时增加 3 辉星；快照按 `NStarCounter.RefreshVisibility()` 条件暴露辉星数，界面说明取自原版 `STAR_COUNT` 本地化。

解锁沿用原版时间线链：铁甲战士完成一局后揭示 `SILENT1_EPOCH` 并解锁静默猎手；静默猎手完成一局后原版 `ProgressSaveManager.PostRunUnlockCharacterEpochCheck()` 获得 `REGENT1_EPOCH`；揭示它之后 `UnlockState.Characters` 才包含储君。`new regent` 与开始菜单均遵循此门槛，未解锁时拒绝开局并使用原版锁定角色表现。网页只适配猎手与储君这两个角色节点，不等于完整 Timeline UI。

新增 `tests/regent_character_smoke.py` 在隔离存档验证新档锁定、两段角色解锁、Epoch 原文、储君的原版开局属性/牌组/遗物和首战辉星。`python3 tests/regent_character_smoke.py --timeout 90`、`python3 tests/silent_character_smoke.py --timeout 90` 与 `python3 tests/engine_smoke.py --timeout 90` 均通过。Engine smoke 原有 abandon 断言同步为当前行为：结束后快照保留败局角色状态，网页显示开始菜单，run save 清除。最新 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 0 warning、0 error；`node --check web/app.js`、Python 编译与 `git diff --check` 通过。

当前 `runtime/Main.cs` / Godot Mono assembly SHA-256：`7f5d75b8da3c9341a182494c340c261dcce1113648f9af718aca6083ac8a4ae1` / `d10fcb9ef3ffda35a0b3594867364d27863b9d8f0e111ce8fc8e3f030361cd52`。

没有覆盖储君全部卡牌、辉星消费卡、全部事件/敌人、普通图形版与视觉流程，不能宣称完整 1:1。新的 C# 程序集已经生成；运行中的网页服务不会热加载，需要重启 `server.py`，刷新页面后进入角色选择。manifest 仍将 Build `23811903` 归属标记为未独立核验。

## 59. 接入时间线和百科大全文字页（2026-09-28）

主菜单的“时间线”和“百科大全”现在可点击。时间线从原版 `Progress.Epochs` 取全部已建槽位，按 `EpochEra` 与 `EraPosition` 分组，并依据 `GetTimelineExpansion()` 画出原版节点连接；节点标题、故事章节、解锁条件、描述和奖励文字来自原版 `EpochModel` / 本地化。待揭示节点调用 `SaveManager.RevealEpoch()`，随后写入该 Epoch `QueueUnlocks()` 对应的角色待解锁标记、Neow 的 Silent 槽位和 timeline expansion；已揭示节点展开原版描述。未获得节点显示锁定态且点击不改变进度。强制揭示页仍按终端已有 Neow 预置存档策略处理，避免新档在首局前提前显示猎手解锁。

百科按原版 `SaveManager.IsCompendiumAvailable()` 控制主入口，提供卡牌、遗物、药水、怪物、统计和历史页面。卡牌的顺序/解锁/发现、遗物与药水的详情及分类、Bestiary 的发现范围和行动、总体/角色数据与本机 RunHistory 均读取原版模型、进度与本地化；网页增加文本检索、分类筛选和列表详情浏览。

原版依据与图形差异补记在 `docs/sources.md`、`docs/engine-coverage.md` 和 `docs/interface.md`。本轮 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 warnings、0 errors）；`node --check web/app.js` 与 `git diff --check` 通过。未运行测试脚本或完整网页点按验收；Timeline 原版肖像/动画、百科图像和场景布局没有复刻；Run History 目前只显示对局摘要，没有原版逐层地图、牌组/遗物互动，不能宣称完整 1:1。运行中的 Host 不会热载入新 C# 程序集，需重启 `server.py` 并刷新网页查看。

第59节最初记录了网页绘制 Epoch expansion 连线的实现；该表现已在第61节移除，当前按原版界面截图显示底部时间轴，不显示节点间连线。

## 60. 修复时间线节点错位并允许返回（2026-09-28）

用户反馈时间线连线杂乱、没有返回入口。根因是网页原来把各时代节点按 `EraPosition` 排序后用紧凑 flex 堆叠；原版将 `EraPosition` 作为时代内实际位置，缺少编号必须留空。现在每个时代栏使用相同网格行，节点按原版位置占行，连线仍取原版 `GetTimelineExpansion()` 并从已布局节点中心绘制。顶部“返回”始终可见；待揭示时也可以执行 `timeline close` 回到菜单，进度状态保留，仍可从菜单再次打开。原版 `NTimelineScreen.RefreshBackButton()` 在已有发现节点时会禁用返回；网页这里按用户要求放宽。

更新依据说明：`docs/sources.md`、`docs/engine-coverage.md`、`docs/interface.md`。网页资源版本号已更新，浏览器会请求新版 JS/CSS。`node --check web/app.js` 与 `git diff --check` 通过；本轮未运行玩法测试。当前 8765 服务在监听，但 CUA 没有可连接的浏览器页，因此没有网页目视回归。此修改不涉及 C#，无需重编译/重启规则 Host；刷新网页即可载入前端变更。

本节已由下一节修订：节点间连线已移除，时间线展开关系不再绘图。

## 61. 时间线默认回到开始菜单并移除 Epoch 连线（2026-09-28）

用户指出有待揭示 Epoch 时网页不该自动切入时间线，并提供原版界面截图，说明原版 Epoch 节点间没有扩展关系连线，底部只有横向时间轴。`applySnapshot()` 现只记录待揭示节点以供用户进入时间线，不自动改菜单视图；首次载入也不把上一页面残留的 `timelineOpen` 当作用户当前打开操作。放弃确认完成后也固定回到开始菜单。用户从菜单点击时间线或在已连接页面显式输入 `timeline open` 才进入。`GetTimelineExpansion()` 仍供原版可达性与解锁路径使用，前端不再读取/绘制关系线；节点下方增加按时代栏中心对齐的横向轴和刻度。节点仍按 `EraPosition` 留空定位，顶部返回仍可退出待揭示页面。

同步更新 `docs/sources.md`、`docs/engine-coverage.md`、`docs/interface.md` 与页面资源版本。`node --check web/app.js`、`git diff --check` 通过；未运行玩法测试或浏览器目视检查。规则 Host 和 `runtime/Main.cs` 无需重编译；刷新页面载入前端即可。原版时间线场景仍未实现图像卡片与动画。

## 62. 时间线门槛与无标签时代列（2026-09-29）

用户要求时间线遵循原版入口条件，并询问时间线页面的空白时代栏。核对 `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMainMenu.cs`、`NGameOverScreen.cs` 与 `NTimelineScreen.cs` 后确认：普通启动不会自动打开 Timeline；有真实待揭示 Epoch 时，原版禁用开始新旅程/百科入口并启用 Timeline，且待揭示项清空前禁用返回。结算页只有在本局发现 Epoch 时才会把玩家选择“主菜单”的操作路由进 Timeline。

网页仍从普通启动菜单开始；真实待揭示节点出现时，时间线返回、`new` 开局和百科命令受原版门槛限制。放宽命令入口不能绕过 UI 禁用状态。终端为标准开局预先揭示 Neow；原版 `NeowEpoch.QueueUnlocks()` 因此会把 Silent 节点置为 `Obtained`。`CanRevealTimelineEpoch()` 继续要求原版 Ironclad 对局记录，屏蔽这条预置路径在首局前形成的假待揭示状态。

截图中空标题栏来自简中 `eras.json` 只包含各大时代的 `*0.name/.year`，部分 `*1/*2` `EpochEra` 没有文字名称或年份。之前网页仍绘制空的标题底色/边线；现隐藏无标签标题栏的视觉框，同时保留 Era 列宽、`EraPosition` 节点位置和底部轴刻度。未添加自造时代名称。

修改涉及 `runtime/Main.cs`、`web/app.js`、`web/style.css`、`web/index.html` 以及界面/来源/覆盖说明。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 警告、0 错误；`node --check web/app.js` 与 `git diff --check` 通过。当前 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `3dd1fdac7677864866234616f4200f30ee8b38897a29ebd5d4bccb3567b3393cb` / `acd42e99aca271968eabf68286da7b182a8e0cd6e31db44dd9ccb70f7287e507`。未运行玩法烟测，也未做完整浏览器点击/目视回归。C# 修改需重启 `server.py`；网页 JS/CSS 资源版本已更新，需刷新页面。

## 63. 时间线揭示与药水百科异常回归（2026-09-29）

用户反馈点击未揭示 Timeline 节点后立即变为已揭示，并报告百科显示 `potionRarity=None` 越界异常。核对本机原版后确认：`NEpochSlot.OnRelease()` 对 `Obtained` 节点直接调用 `RevealEpoch()`、持久化揭示并打开详情；新揭示详情的 `UnlockAnimation()` 再调用 `EpochModel.QueueUnlocks()`。已揭示 `Complete` 节点只打开详情，普通点击 `NotObtained` 节点不会变更状态。网页按钮同样只为 `obtained && canReveal` 节点挂揭示动作，点击后经命令桥调用 `reveal <id>`；因此“待揭示节点点一次即揭示”符合原版行为，文字版将动画后的队列解锁直接应用。

百科根因是 `ModelDb.AllPotions` 含 `DeprecatedPotion`（`Rarity=None`），网页原先把它传给抛出 `ArgumentOutOfRangeException` 的原版 `PotionRarityExtensions.ToLocString()`。现将列表过滤到原版 Potion Lab 载入的 Common、Uncommon、Rare、Event、Token 五个类别。

新增 `tests/timeline_compendium_smoke.py`。隔离存档回归通过：百科成功载入 63 个药水条目且稀有度文本齐全；取得但未揭示的 Silent Epoch 可揭示并解锁猎手；未获得 Epoch 被拒绝揭示且状态保持 locked；前端代码路径只对可揭示 Epoch 发出命令。测试期间 TestMode/headless 的放弃流程记录了原版 UI 节点缺失导致的已知 `NullReferenceException`，宿主兜底随后完成原版进度与历史结算，整个检查通过。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 为 0 warning、0 error；`node --check web/app.js`、Python 编译和 `git diff --check` 通过。报告：`.cache/timeline-compendium-smoke.json`。未进行普通图形游戏或实际浏览器目视点按验收。

本次 `runtime/Main.cs` / Godot Mono assembly SHA-256：`4ffa8c71bea47ce33a316e6f0f2510631060d6a64d5d2eb8414fe829143786c5` / `4d2186055ba577684fc773b8e4578d1850a3878a2489072a725d2b4e4d6332dc`。C# 修复需重启 `server.py` 后生效；无网页资源变更，无需清缓存。

## 64. 地图笔迹不再拦截路线节点（2026-09-29）

用户反馈手绘层会影响节点点击，要求笔迹仍绘制在节点上层。此前擦除模式把 SVG 笔迹设为 `pointer-events:stroke`，绘图模式又拦截地图上所有 click，造成笔迹覆盖节点时无法前进。现保持 SVG DOM 绘制顺序不变，令笔迹始终穿透指针；绘图/擦除模式下，可达节点点击仍优先执行 `move`。绘制只从空白区域起笔，擦除改为根据指针和笔迹线段的最近距离选择，避免依赖路径作为点击目标。

前端缓存版本已更新为 `20260929-map-ink-click-through-1`。涉及 `web/app.js`、`web/style.css`、`web/index.html` 和 `docs/interface.md`；无需重编译 C#，刷新页面后生效。此改动尚未进行浏览器点按实测。

## 65. 角色状态显示 Power 具体效果（2026-09-29）

用户指出右侧角色状态栏只有 HP/属性和简略状态，没有显示增益的具体效果。将 `PowerViews()` 的原版 `PowerModel.HoverTips` 说明、`PowerType` 和 `DisplayAmount` 加到玩家快照；侧栏按增益、减益、状态分类显示名称与动态效果描述，描述缺失时显示原版展示数值。旧 `player.powers` 字符串字段保留兼容。描述仍来自原版 Power 动态本地化，不把未定义语义的数值推断为回合数。

`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 warning、0 error。前端缓存版本更新为 `20260929-player-power-effects-1`；需重启 `server.py` 并刷新页面。未运行玩法测试或浏览器目视检查。

当前 `runtime/Main.cs` / Godot Mono assembly SHA-256：`f0c6dd8dcabcf5a9ba318a449191a0131bdc1281a19711ee7dc34c0cd42efba6` / `8ea6960cb549c3df540bf58a8f1f908fc2a803978dbc436aa6ecd1a8e21dd7a8`。


## 66. 开始菜单隐藏未选择角色侧栏（2026-09-29）

用户指出开始游戏界面尚未选择角色时，右侧仍显示铁甲战士占位状态。现在无玩家/无在途旅程时隐藏角色侧栏，并将主内容区切换为单列全宽；玩家快照出现后恢复侧栏。默认 HTML 也将侧栏标记为隐藏，避免首帧闪现占位角色。

前端资源版本更新为 `20260929-start-menu-no-inspector-1`，并同步更新 `docs/interface.md`。不涉及 C#，无需重编译或重启规则 Host；刷新网页载入即可。本轮未进行浏览器目视回归。


## 67. 右侧药水槽点击使用（2026-09-29）

用户要求右侧药水栏可以点击使用。快照此前只提供药水名称；现改为逐槽提供原版名称、`DynamicDescription`、目标类型、使用状态和可用性。前端用高亮按钮展示；无目标药水点击后提交现有 `potion 槽位` 命令。指定敌人的药水点击槽位后高亮敌人目标，再点击敌人提交 `potion 槽位 敌人编号`；再次点击药水可取消目标选择。空槽、自动药水、禁用药水、原版自定义不可用状态以及非战斗阶段的战斗药水均禁用。实际效果与目标合法性仍由原版 `UsePotionAction` / `PotionModel.IsValidTarget` 结算校验。

已同步 `docs/interface.md`、`docs/sources.md` 和 `docs/engine-coverage.md`，网页资源版本为 `20260929-clickable-potions-1`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 warning、0 error；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256 为 `eb28af95d60b4ccba3c782f602949472c232f6cfb942acfc55154e1d9a251a69` / `086762e3143e1679db43cf61f3efbb5cbb0708168ae620a483474638d2ce94d6`。本轮未运行玩法测试或浏览器目视回归；重启 `server.py` 并刷新网页后生效。


## 68. 牌组查看、事件卡牌预览与选中留白（2026-09-29）

用户要求改善选中项左右内边距、可从右侧牌组计数打开当前牌组，以及在事件选项发放具体卡牌时查看牌面。右侧“卡组”计数现在是按钮，打开原版 `Player.Deck.Cards` 列表；选中列表项会显示原版卡名、类型、能量、说明及卡牌词条提示。事件选项快照从 `EventOption.HoverTips.OfType<CardHoverTip>()` 提取已确定的原版卡牌；若选项文案提及卡名，就直接将文案内的卡名显示为可点击下划线；否则在说明下显示该卡名作为预览入口。事件选项整行仍可选择；事件卡牌与特殊卡牌奖励都不再提供额外“查看牌面”按钮，点击卡名只打开牌面，不调用事件回调或改动牌组。没有原版卡牌提示的随机结果不伪造详情。事件/手牌当前选中态补左右留白。

原版依据和覆盖范围记入 `docs/sources.md`、`docs/interface.md`、`docs/engine-coverage.md`。规则端 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 warning、0 error；本轮前端调整后 `node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256：`477a5185fee185f044043e209bfbb38354a6713ae07bad01299befa3d5476b60` / `09da245d31a5ed6f4dcebc275bb51a00aacfc0cdeeed2f82faed0026fe1762d5`。前端缓存版本为 `20260929-inline-event-card-preview-1`。未运行玩法测试或浏览器视觉验收；C# 改动需重启 `server.py`，前端更新后刷新网页。不可据此宣称所有事件都提供确定的卡牌预览，或玩法完整 1:1。

## 69. 卡牌关键词自定义悬浮提示（2026-09-29）

用户指出卡牌“消耗”等词条使用问号光标/浏览器默认提示，要求改为悬停直接显示且体验更好。现用自定义 popover 展示从原版 `CardModel.HoverTips` 快照来的标题和格式化说明；鼠标悬停与键盘聚焦都会立即打开，浮层按锚点上/下方选择位置并限制在视口内。词条保留下划线作为提示，光标不再显示问号，也不再设置原生 `title`。

网页缓存版本更新为 `20260929-custom-keyword-tooltip-1`；只改前端与说明文档，不需重新编译原版桥。`node --check web/app.js` 与 `git diff --check` 通过；没有浏览器视觉验收或逐个关键词检查，不声称所有词条均已覆盖或完整 1:1。

## 70. 精简事件提示与英文眉题（2026-09-29）

用户要求移除事件提示行“choose 编号处理事件选项 · map 预览路线”，并删除中文标题旁的英文副标题。普通事件选项提示现在留空；“ROUTE MAP”和“ENEMY INTENT”眉题已移除，保留“旅程路线”“敌人意图”中文标题和实际地图/关闭操作。

网页缓存版本更新为 `20260929-clean-interface-copy-1`。`runtime/Main.cs`、`web/app.js`、`web/index.html`、`docs/interface.md` 已更新；规则端 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功（0 警告、0 错误），`node --check web/app.js` 和 `git diff --check` 通过。普通事件无提示文本且无结算状态时会收起空提示栏。未运行玩法测试或浏览器视觉验收；需重启 `server.py` 并刷新网页载入。

## 71. 休息处铁匠卡牌升级预览（2026-09-29）

用户要求休息处升级牌时像原版一样预览升级结果。原版 NDeckUpgradeSelectScreen 有“查看升级”切换，候选卡点击后由 NUpgradePreview 并排显示升级前后卡牌，确认后才执行 SmithRestSiteOption.OnSelect() 的 CardCmd.Upgrade()。现 CardListChoice 仅在 Smith 上附带克隆卡升级预览；网页可切换预览所有候选，选择时显示前后对比，确认才提交原版 choose，取消不改牌组。多卡升级选择也在提交前展示对比。

修改 runtime/Main.cs、web/app.js、web/style.css、web/index.html 与来源/界面/覆盖文档；网页缓存版本为 20260929-rest-upgrade-preview-1。dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers 成功，0 警告、0 错误；node --check web/app.js 与 git diff --check 通过。runtime/Main.cs / Godot Mono assembly SHA-256 为 798ed37765393cce340fdbbd506f357ff6ea6ca0d4bc3fbf7d082960d2d789e6 / 334c547190be6768a51d8a0b988a3509136320c77e22ebf62f2260e5643fdebb。尚未运行玩法烟测或浏览器视觉验收。CardModel 副本的升级值由原版 API 生成，最终规则仍由原版铁匠选择流程结算；需重启 server.py 并刷新网页载入。


## 72. 真理石板事件显示已升级卡牌（2026-09-29）

用户指出真理石板事件“你一直读到现在，感觉有点头晕目眩！”没有显示升级了哪些卡牌。核对原版 `TabletOfTruth.LoseMaxHpAndUpgrade()`：前四次解读由原版事件 RNG 各从可升级牌中选一张，第五次升级当时全部可升级牌；每次均调用原版 `CardCmd.Upgrade()`。该命令将升级卡牌的 ModelId 记入当前地图点 `PlayerMapPointHistoryEntry.UpgradedCards`。

`runtime/Main.cs` 现在为该历史列表维护独立游标；原版事件结算后读取新增 ID，通过原版 `ModelDb` 取简中卡名，并发送“升级了 卡名”。前端已有事件卡牌结果区域和历史消息缓存，因此不需要改网页。更新 `docs/sources.md`、`docs/interface.md` 与 `docs/engine-coverage.md`；覆盖文档明确这项新显示尚未做固定种子实战回归。

`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 成功，0 warning、0 error；`git diff --check` 通过。未运行玩法测试或浏览器视觉检查。`runtime/Main.cs` / Godot Mono assembly SHA-256：`1dabc198047e8f429a39c5151c07c39066602e9418f7cfdfb5b012265c94e632` / `ba96f8e54dd5d3656d6c0e582a7e2b6ba1366875cf9a3ada52f36f9f4ad170f8`。需要重启 `server.py` 载入新规则程序集。
