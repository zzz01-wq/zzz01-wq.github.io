# 原版运行时覆盖与验证记录

本文只记录已执行验证和可追溯到本机原版文件的适配，不代表全部规则或完整 API 覆盖。版本目标是 Steam Build `23811903`；`docs/reference-manifest.json` 中的 DLL/PCK 哈希与当前原版输入一致，但 `build_verified` 仍为 `false`，因为没有本机 Steam 安装清单或 `release_info.json` 证明这些文件属于该 Build。

运行时保留“网页 → Python HTTP 桥 → Godot Mono → 原版 `sts2.dll`”结构。规则状态和动作通过原版模型、同步器、动作队列、房间与存档类型驱动。命令终端不是第二套规则引擎，也没有把有限 API 调用描述成完整 1:1。

## 已执行验证

| 范围 | 原版依据 | 适配与真实验证 | 当前边界 |
| --- | --- | --- | --- |
| 原版输入完整性 | `docs/reference-manifest.json`；`tools/sts2-bridge-patcher/Program.cs` 校验 DLL SHA-256 与 MVID | `python3 tests/engine_smoke.py` 重算并比对 `reference/` 中清单所列文件哈希；补丁器只改 `runtime/lib/sts2.dll` 暂存副本 | 输入哈希只能标识文件，不能独立证明 Steam Build 归属 |
| Host 初始化与协议快照 | `TestMode`、`SaveManager.Init*ForTest`、Godot 主线程与 `Main._Ready/Publish` | `runtime/Main.cs`；`tests/engine_smoke.py` 与 `tests/http_smoke.py`；快照含 `engineMode=TestMode/headless` | 无窗口测试模式与普通图形游戏不是同一运行环境 |
| 战士开局与首战路线 | `RunState.CreateForNewRun`、`RunManager.SetUpNewSingleplayer/EnterAct`、`ActModel.GetRandomList`、`MapTravel.GetTravelablePointsFrom` | 固定种子 `WEBTEST`；由快照选择原版 `Monster` 路线进入战斗 | 当前验证为单人战士和测试配置；Build 归属、完整解锁进度与普通图形模式未对照 |
| 出牌、目标与能量检查 | `PlayCardAction`、`CardModel.CanPlay/IsValidTarget`、`ActionQueueSynchronizer` | `play` 将行动排入原版队列；Smoke 实测 Defend 与 Strike、目标缺失/能量不足拒绝、失败前后状态不变；HTTP 测试也经 `/api/command` 打出攻击牌 | 只验证起始牌与固定首战；全卡、全部目标类型、状态触发顺序和边界未覆盖 |
| 回合结算 | 原版 `EndPlayerTurnAction`、`ActionExecutor` | `end` 后观察敌方行动结束、进入第 2 回合及能量刷新 | 未做同种子图形版逐步对照；敌人 AI 仅由原版运行时执行，覆盖取决于实际遇到的敌人 |
| 普通战奖励与卡牌奖励 | `CombatManager.EndCombatInternal`、`RewardsSetSynchronizer.SelectLocalReward`、`CardReward.OnSelect`、`ICardSelector` | `engine_smoke` 实战完成首战、领取金币和卡牌，再走下一条地图路线 | 已验证普通单选；替代奖励、重抽、连续多段奖励及满药水槽组合未完整覆盖 |
| 选择交互 | 原版 `CardSelectCmd`、`RelicSelectCmd`、`ICardSelector`、`PlayerChoiceSynchronizer` | `runtime/Main.cs` 队列化单选/多选/可跳过/嵌套选择；`runtime/ChoiceAdapters.cs` 将所选原版卡牌组合和遗物交还原版调用方。`Mono.Cecil` 补丁仅重定向 `FromChooseABundleScreen`、`FromChooseARelicScreen`，并包装部分 `CardRewardAlternative.Generate` 结果。`python3 tests/choice_adapters_smoke.py` 用测试专用命令验证 1–3 张、0–3 张、连续嵌套、卡牌组合和遗物选择 | 组合/遗物桥仅针对本地单人 TestMode；原版其它屏幕和网络/Replay 流程未接管。测试专用命令默认关闭。替代奖励和全部真实遭遇仍未完整验证 |
| 地图与房间流程 | `RunManager`、`EventSynchronizer`、`MerchantEntry`、`RestSite`、`TreasureRoom` 与原版奖励 API | `python3 tests/room_flow_smoke.py`：固定种子走过普通战、商店购买、事件单选及嵌套选卡、二选八事件、休息点、宝箱金币和遗物 | 此测试路径只覆盖实际到达的选项；商店库存、全部事件分支、药水时机、精英、Boss、幕终局未覆盖。SmartFormat 无法解析的展示文本回退原版 raw 本地化文本，可能保留 `{Damage}` 等变量，不会据此生成玩法数值 |
| 自动存档、继续与放弃 | 原版 `SaveManager.SaveRun/LoadRunSave`、`RunSaveManager`、`SerializableRun`、`RunState.FromSerializable`、`RunManager.SetUpSavedSingleplayer/LoadIntoLatestMapCoord`；战斗结束保存 `PreFinishedRoom` | `continue` 使用原版存档反序列化和 RunManager 恢复路径。`python3 tests/save_smoke.py` 在宝箱/战斗奖励检查点写存档，关闭并重启 Godot 后恢复相同种子、楼层、HP、金币、卡组，再用 `abandon` 删除存档 | 只验证原版自动保存检查点，不提供任意时刻/战斗中手动快照；测试存储在 `res://.cache/spirecli-*`，生产默认隔离于 `user://terminal-save`。Steam Cloud、正常 GUI 配置和进度迁移未验证 |
| 网页 → HTTP → Godot | `server.py` 的 `/api/state`、`/api/command` 会话协议；`web/index.html` 命令输入框；`web/app.js` 请求 `/api/command` | `python3 tests/http_smoke.py` 通过本机回环 HTTP、同源请求和 Cookie 发送 `help → new → move → play → end → abandon`，同时检查服务返回的页面表单与前端脚本绑定 | 已验证服务/协议及页面资源；尚未完成真实浏览器中的点击、IME、窄屏与视觉验收 |

## TestMode 与图形模式差异

当前每个 Godot Host 都设置 `TestMode.IsOn = true`，这是本项目 headless 命令适配的运行前提。状态快照会明确标注 `TestMode/headless`。

- 原版 `RunManager.ShouldApplyTutorialModifications()` 在 TestMode 下返回 `false`（除非 `ForceDiscoveryOrderModifications`）；因此地图章节的发现顺序修改不会照常应用。
- 原版 `ActModel.GetRandomList()` 仅在 `TestMode.IsOff` 时才优先选择已解锁但未发现的章节。测试模式的章节选择可能与普通单人游戏不同。
- 原版 `SaveManager.ConstructDefault()` 在 TestMode 使用内存 `MockGodotFileIo`。Host 显式注入隔离的 `GodotFileIo`，默认目录为 `user://terminal-save`，用来让原版 `SerializableRun` 自动存档可跨进程继续；这不会启用原版 Steam Cloud，也不等同用户 Steam 配置文件。
- 原版 `CardSelectCmd.FromChooseABundleScreen()` 在 TestMode 固定返回 `bundles[0]`，`RelicSelectCmd.FromChooseARelicScreen()` 仍依赖图形选择节点。本项目在暂存 DLL 的这两个入口接入命令选择适配；相关行为是窄范围 UI 桥接，不表示其余 UI/所有选择流程已复刻。
- 其他以 `TestMode.IsOn` 分支的 UI、教程、演示、声音或调试逻辑尚未逐项审计。不要把当前 Host 行为外推成普通 GUI 或多人模式表现。

## 最新构建与测试证据

- 本轮构建：`.cache/build-20260921-persistent-smoke.log`，Godot Mono `4.5.1.stable.mono.official.f62fdbde1`，.NET `10.0.102`，0 warning、0 error。构建后执行的测试报告均记录了当前源码/程序集 SHA-256。
- `python3 tests/engine_smoke.py`：固定种子 `WEBTEST`，23 条命令；检查原版文件哈希，验证开局、路线、出牌、拒绝无效行动、回合、战斗奖励、选卡、继续地图、放弃和重开。报告：`.cache/engine-smoke.json`。
- `python3 tests/choice_adapters_smoke.py`：13 条命令；覆盖测试专用多选、可跳过选择、嵌套请求、卡牌组合和遗物选择。报告：`.cache/choice-adapters-smoke.json`。
- `python3 tests/room_flow_smoke.py`：91 条命令；覆盖固定种子实际到达的普通战、商店、两个事件选择分支、休息点、宝箱。报告：`.cache/room-flow-smoke.json`。
- `python3 tests/save_smoke.py`：两个独立 Godot 进程；在原版战斗奖励存档点写入并恢复 `SerializableRun`，随后放弃并确认当前存档消失。报告：`.cache/save-smoke.json`。
- `python3 tests/http_smoke.py`：启动和关闭一个临时 loopback 服务进程；经页面资源和 HTTP 命令端点验证开局、出牌、回合。报告：`.cache/http-smoke.json`。

原版输入 SHA-256：`sts2.dll` `a1f9e653f1e28e4076558fee1e60d218619cb7e057b887c6417f62c62c6d7a52`；`SlayTheSpire2.pck` `42520eb8b0911c6c0f0bd102d92b33f41abd4d26b83489817d0a6dbd7dd48587`。输入文件保存在 `reference/`；原版 DLL 未被补丁器改写。

## 未验证范围

- 本机原版文件到 Steam Build `23811903` 的独立出处证明仍缺失；不可将 `build_verified` 改为 `true`，也不可宣称完整规则 1:1。
- 尚无全卡牌、所有状态/遗物/药水/敌人、全部事件与商店项目、精英和 Boss、进阶全等级、成就、多人、Steam Cloud、结局与失败恢复覆盖。
- 没有真实图形版同种子逐帧基准，也没有浏览器 UI 的键盘/中文输入法/移动视口视觉验收。
- 存档只通过原版实际自动保存时机验证；若游戏流程尚未触发原版存档，终端没有额外的“强制写入任意战斗状态”命令。
