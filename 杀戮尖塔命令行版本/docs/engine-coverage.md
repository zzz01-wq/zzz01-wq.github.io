# 原版运行时覆盖与验证记录

本文只记录已执行验证和可追溯到本机原版文件的适配，不代表全部规则或完整 API 覆盖。版本目标是 Steam Build `23811903`；`docs/reference-manifest.json` 中的 DLL/PCK 哈希与当前原版输入一致，但 `build_verified` 仍为 `false`，因为没有本机 Steam 安装清单或 `release_info.json` 证明这些文件属于该 Build。

运行时保留“网页 → Python HTTP 桥 → Godot Mono → 原版 `sts2.dll`”结构。规则状态和动作通过原版模型、同步器、动作队列、房间与存档类型驱动。命令终端不是第二套规则引擎，也没有把有限 API 调用描述成完整 1:1。

## 已执行验证

| 范围 | 原版依据 | 适配与真实验证 | 当前边界 |
| --- | --- | --- | --- |
| 原版输入完整性 | `docs/reference-manifest.json`；`tools/sts2-bridge-patcher/Program.cs` 校验 DLL SHA-256 与 MVID | `python3 tests/engine_smoke.py` 重算并比对 `reference/` 中清单所列文件哈希；补丁器只改 `runtime/lib/sts2.dll` 暂存副本 | 输入哈希只能标识文件，不能独立证明 Steam Build 归属 |
| Host 初始化与协议快照 | `TestMode`、`SaveManager.Init*ForTest`、Godot 主线程与 `Main._Ready/Publish` | `runtime/Main.cs`；`tests/engine_smoke.py` 与 `tests/http_smoke.py`；快照含 `engineMode=TestMode/headless` | 无窗口测试模式与普通图形游戏不是同一运行环境 |
| 战士开局与首战路线 | `RunState.CreateForNewRun`、`RunManager.SetUpNewSingleplayer/EnterAct`、`ActModel.GetRandomList`、`MapTravel.GetTravelablePointsFrom` | 固定种子 `WEBTEST`；`new ironclad` 自动进入 Neow，完成开局选项后按可见路线进入原版 Monster 战斗 | 命令终端默认把自己的标准进度设为 Neow 已揭示；这不等同原版全新空白进度 |
| 角色菜单、静默猎手与储君解锁 | `CharacterModel` 的原版开局数据、`UnlockState.Characters`、`NeowEpoch.QueueUnlocks`、`Silent1Epoch.QueueUnlocks`、`Regent1Epoch.QueueUnlocks`；`NCharacterSelectButton.Init/OnFocus`、`NCharacterSelectScreen.SelectCharacter`、`CharacterModel.GetUnlockText`；`SILENT1_EPOCH.unlockInfo`、`REGENT1_EPOCH.unlockInfo` 与 `ProgressSaveManager.UpdateWithRunData/PostRunUnlockCharacterEpochCheck` | 网页按原版 `UnlockState.Characters` 控制铁甲战士、静默猎手和储君的可选状态。锁定资料使用原版锁定文本和隐藏数据；角色开局直接调用原版模型。`silent_character_smoke.py` 与 `regent_character_smoke.py` 验证猎手和储君的时间线揭示链、锁定时拒绝开局、开局属性和遗物。储君首战从原版 `DivineRight.AfterRoomEntered` 获得 3 辉星，快照按原版 `NStarCounter` 可见规则显示计数 | 只呈现这三个角色；smoke 走 TestMode/headless 和隔离存档，不代表正常图形流程或全角色玩法 1:1。Build 归属仍未独立验证 |
| 放弃并结算失败局 | 原版 `NPauseMenu` → `NAbandonRunConfirmPopup` → `RunManager.Abandon/AbandonInternal`，强制击杀角色后由 `CreatureCmd.Kill` 在非 TestMode 调用 `RunManager.OnEnded(false)`；`OnEnded` 调用 `ProgressSaveManager.UpdateWithRunData` 和 `RunHistoryUtilities.CreateRunHistoryEntry`；`RunSaveManager.HasRunSave` 也会检查 `.backup`；原版 `SaveManager.CleanupStaleCurrentRunSaveForProfile` 按 `${StartTime}.run` 判断过期存档 | 运行时右侧放弃按钮调用 `RunManager.Abandon()`；TestMode 下 `Settle()` 在原版死亡结算后调用相同 `RunManager.OnEnded(false)`。即使 Godot 的物理删除失败，只要主存档或备份的 `start_time` 已有同名原版历史，就不再把它当作未结束存档，也不会重复记失败次数；同时继续尝试清理主存档与 `.backup`。最新服务日志证实旧物理删除方案仍报错，已按原版 staleness 规则修正 | 当前修正尚未在真实网页重放放弃→时间线揭示→猎手可选的完整流程。网页确认框位置与原版暂停菜单布局不同；不能视为已验证流程或完整 1:1 |
| 时间线与百科入口 | `NMainMenu.UpdateTimelineButtonBehavior()`、`NGameOverScreen.DiscoveredAnyEpochs/OnMainMenuButtonPressed()`、`NTimelineScreen.RefreshBackButton()`、`NEpochSlot.OnRelease()`、`NEpochInspectScreen`、`EpochModel.GetTimelineExpansion/QueueTimelineExpansion()`；`NMainMenu` 的百科按钮与 `SaveManager.IsCompendiumAvailable()` | 网页按原版 Epoch 存档、`EpochEra`、`EraPosition`、状态和本地化渲染节点；保留空行，不画节点连线，节点下方只画横向时代轴。普通启动留在开始菜单；有真实待揭示节点时禁用开始新旅程/百科入口，点时间线揭示；全部揭示前禁止返回。揭示调用原版 `SaveManager.RevealEpoch()` 并补写对应持久解锁状态。百科条目与可见性来自原版模型和进度 | 原版只在结算后玩家选择前往主菜单且本局发现 Epoch 时直接进入时间线；普通启动不会自动打开。终端预先揭示 Neow 会按原版 `NeowEpoch.QueueUnlocks()` 将 Silent 节点置为已获得；网页仅在铁甲战士已有原版对局记录后把此预置节点作为可揭示项，避免首局前锁住菜单。简中 `eras.json` 未给部分 Era 变体名称/年份；前端隐藏空标题栏但保留时间列。Timeline 肖像/动画、百科图像/场景和 Run History 逐层互动未复刻；未完成网页端到端点击验收，不代表完整 1:1 |
| 时间线点击与药水分类回归 | `NEpochSlot.OnRelease/RevealEpoch`；`NPotionLab.LoadPotions`、`NPotionLabCategory.LoadPotions`；`DeprecatedPotion.Rarity=None`；`PotionRarityExtensions.ToLocString` 对 `None` 抛错 | `tests/timeline_compendium_smoke.py` 用隔离存档验证：待揭示的 Silent 节点可揭示且解锁角色，未获得节点拒绝揭示并保留锁定，网页点击只对有资格节点发出揭示命令；百科药水页成功显示原版五类中的 63 项且均有原版稀有度文本 | 测试运行于 Godot TestMode/headless；未做普通图形版的 Timeline 动画和浏览器目视点击验收，不代表完整 1:1 |
| 待揭示节点时的主菜单流程 | 原版 `NMainMenu.UpdateTimelineButtonBehavior()` 在无 run 存档且有待揭示节点时禁用新旅程和百科入口、保留时间线入口；普通主菜单不自动打开时间线。若结算页本局发现 Epoch，`NGameOverScreen.OnMainMenuButtonPressed()` 会在玩家选择后直接转入 Timeline；`NTimelineScreen.RefreshBackButton()` 在待揭示项清空前禁用返回 | 网页普通启动停留开始菜单；待揭示节点存在时只允许走时间线，禁用时间线返回、`new` 与百科命令；揭示完成后返回和开局恢复 | 网页没有完整复刻原版 GameOverScreen 中的“主菜单/解锁”过渡按钮；待揭示节点列表与 Epoch 动画仍是文字适配 |
| 各幕幕首事件与三幕列表 | `StandardActMap.AssignPointTypes` 将 `StartingMapPoint` 设为 `Ancient`；`ActModel.GenerateRooms` 用运行 RNG 从本幕已解锁 Ancients 与共享 Ancient 子集中选取；`ActModel.GetRandomList` 按 `ModelDb.ActsByIndex` 建立标准旅程；`RunManager.CreateRoom` 在 `MapPointType.Ancient` 时调用 `ActModel.PullAncient`。第一幕还受 `NeowEpoch` 控制：`SetStartedWithNeowFlag` 读该解锁；原版空白进度未解锁时会把第一幕起点改为 `Monster`，揭示后 `EnterAct(0)` 自动进入固定 Neow。 | 终端 `new ironclad` 在自己的进度中通过原版 `SaveManager` 揭示 `NeowEpoch`，再由原版引擎开局；快照暴露原版 `RunState.Acts.Count=3`。事件选项由 `choose` 处理。后两幕在地图房间显示 Ancient 起点，`move 1` 进入原版 `EventRoom`。`act_opening_smoke` 用普通 `new` 验证固定 Neow，并通过测试专用入口直接调用原版 `EnterAct` 检查后两幕；固定种子 `XHPB63HK` 选到 `PAEL`、`TANX`。报告 `.cache/act-opening-smoke.json` | 终端默认进度是已完成 Neow 时间线解锁后的标准开局，并非原版新建空白进度；后两幕的该报告未模拟打完 Boss 的自然转幕，转幕另由 `.cache/boss-transition-smoke.json` 覆盖。事件候选受种子、解锁和共享池影响。 |
| 事件选项动态文本 | `Wellspring.CanonicalVars` 定义 `BatheCurses=1`；`EventOption.AddLocVars`、`NEventOptionButton._Ready` 分别注入角色详情和 `Event.DynamicVars` 后格式化标题/说明 | `runtime/Main.cs` 的 `EventOptionText()` 复用这条注入顺序；固定 `WEBTEST` 房间流程实测“仔细翻找”显示“失去14点生命，获得天选芝士。”，并确认无 `{Damage}` 占位符 | 仅对固定种子中的动态事件选项做了回归；全部事件和全部变量类型仍未覆盖 |
| 水晶球占卜 | `CrystalSphere.UncoverFuture/PaymentPlan`、`CrystalSphereMinigame.PlayMinigame/SetTool/CellClicked/CompleteMinigame`、`OneOffSynchronizer.DoLocalCrystalSphereRewards` | 本轮新增 TestMode 的 `ShowScreen` 窄范围桥、网页 11×11 格子和 `scry` 点击命令；开局价格/诅咒、次数、清格、物品揭示与奖励均仍走原版调用；奖励出现时收起已结束棋盘并归顶 | 已构建但尚未对真实水晶球房间做端到端回归或浏览器视觉验收；网页显示完整揭示物品标签，不复刻原版逐格揭开物品纹理的像素效果；TestMode 原版图形格子节点返回 `null`，不等于原版小游戏图形或玩法完整 1:1 |
| 出牌、目标与能量检查 | `PlayCardAction`、`CardModel.CanPlay/IsValidTarget`、`ActionQueueSynchronizer` | `play` 将行动排入原版队列；Smoke 实测 Defend 与 Strike、目标缺失/能量不足拒绝、失败前后状态不变；HTTP 测试也经 `/api/command` 打出攻击牌 | 只验证起始牌与固定首战；全卡、全部目标类型、状态触发顺序和边界未覆盖 |
| 回合结算 | 原版 `EndPlayerTurnAction`、`ActionExecutor` | `end` 后观察敌方行动结束、进入第 2 回合及能量刷新 | 未做同种子图形版逐步对照；敌人 AI 仅由原版运行时执行，覆盖取决于实际遇到的敌人 |
| 敌人意图显示与 Boss 转幕 | 原版 `MonsterModel.NextMove.Intents`、`AbstractIntent.GetIntentLabel/GetHoverTip/HasIntentTip`、`NCreature.UpdateIntent`、`NIntent.UpdateVisuals`；`RunManager.EnterNextAct` | `runtime/Main.cs` 快照保留原版意图类别与标签；原版提示可生成时附加本地化标题/说明。敌人集合优先取原版 `CombatManager.DebugOnlyGetState().Enemies`，网页在 Boss 战额外显示原版 `Encounter.Title`。固定路线 `BOSSFLOW` 进入原版 Boss `仪式兽`，快照显示 Boss 类型、名称和 `252/252` HP；测试专用击杀完成首领奖励后，网页提供 `proceed`，真实调用原版 `EnterNextAct()` 切到第 2 幕地图，报告见 `.cache/boss-display-smoke.json` 与 `.cache/boss-transition-smoke.json` | 意图只验证了一个 Boss 遭遇和首回合快照；网页以文字呈现，未复刻原版意图图标动画，全部 Boss 和多阶段敌人仍未覆盖；终局对白虽已接入但尚未实际回归 |
| 建筑师终局对白与胜利回调 | `TheArchitect.LoadDialogue/CreateOptionForCurrentLine/AdvanceDialogue/WinRun`、`AncientDialogueSet.GetValidDialogues`、原版 `ancients` 本地化、`ActChangeSynchronizer`、`RunManager.WinRun` | 已接入网页说话人/当前台词快照，台词和逐句按钮取自原版模型；点击调用原版 `EventOption`。TestMode 首句选项为空时，宿主经反射调用原版 `CreateOptionForCurrentLine` 与 `EventModel.SetEventState` 恢复交互，不生成台词内容 | 已构建实现但未通关到建筑师房间做交互回归；无对白气泡、角色/建筑师攻击演出和多人同步验收，不能视为完整终局或 1:1 验证 |
| 普通战奖励与卡牌奖励 | `CombatManager.EndCombatInternal`、`RewardsSetSynchronizer.SelectLocalReward`、`CardReward.OnSelect`、`ICardSelector` | `engine_smoke` 实战完成首战、领取金币和卡牌，再走下一条地图路线 | 已验证普通单选；替代奖励、重抽、连续多段奖励及满药水槽组合未完整覆盖 |
| 选择交互 | 原版 `CardSelectCmd`、`RelicSelectCmd`、`ICardSelector`、`PlayerChoiceSynchronizer` 与每次调用的 `CardSelectorPrefs` | `runtime/Main.cs` 队列化单选/多选/可跳过/嵌套选择；`runtime/ChoiceAdapters.cs` 将所选原版卡牌组合和遗物交还原版调用方。`Mono.Cecil` 补丁仅重定向 `FromChooseABundleScreen`、`FromChooseARelicScreen`，并包装部分 `CardRewardAlternative.Generate` 结果。`python3 tests/choice_adapters_smoke.py` 用测试专用命令验证 1–3 张、0–3 张、连续嵌套、卡牌组合和遗物选择；休息处/商店移除取消由 `room_flow_smoke` 覆盖 | `back` 仅在原版偏好可取消的选择里返回空选择；组合/遗物桥仅针对本地单人 TestMode；原版其它屏幕和网络/Replay 流程未接管。测试专用命令默认关闭。替代奖励和全部真实遭遇仍未完整验证 |
| 地图与房间流程 | `RunManager`、`EventSynchronizer`、`EventModel`、`CardCmd`、`CardTransformationHistoryEntry`、`PlayerMapPointHistoryEntry.UpgradedCards`、`MerchantEntry`、`RestSiteSynchronizer`、`TreasureRoom` 与原版奖励 API | `python3 tests/room_flow_smoke.py`：固定种子走过普通战、商店购买与商店移除取消、事件单选及嵌套选卡、二选八事件、铁匠取消后改选休息、宝箱金币和遗物；本轮 floor 4 的原版变牌事件消息实测为“原版变化结果：打击 → 飞剑回旋镖”。状态中的事件/休息/商店/宝箱 `open`、奖励/遗物候选项附带内置命令；网页选项、宝箱开启/遗物选择和路线点击直接提交对应命令，Boss 结算后另由 `boss_transition_smoke` 验证下一幕按钮。进入 Neow/Ancient/未知地图点前按需挂载原版 PCK，以供原版事件选项构造读取图标资源 | 已验证固定种子的到达路径；`CardRemovalReward` 取消分支、商店其它商品/库存变化、全部事件分支、药水时机、精英、全部 Boss、幕终局仍未覆盖。事件说明遵循原版 `NEventRoom.SetDescription` 的 `LocString.Exists()` 检查：缺失说明键时留空（例如 `NEOW.pages.INITIAL.description` 在提供的中英文原版文本表中都不存在），不显示内部诊断占位符，也不补写剧情 |
| 旅程中主动放弃 | 原版 `NPauseMenu.Initialize(IRunState)`、`NAbandonRunConfirmPopup`、`RunManager.Abandon` | 网页右侧栏在旅程进行中显示原版“放弃”标签，使用原版本地化确认框文案，确认后提交现有 `abandon` 命令并由桥接层写入原版失败进度/历史 | 网页入口位置适配在右侧栏，原版入口位于暂停菜单；无原版暂停页面，多人客户端和原版 modal UI 未实现；未做本轮端到端点击回归 |
| 自动存档、继续与放弃 | 原版 `SaveManager.SaveRun/LoadRunSave`、`RunSaveManager`、`SerializableRun`、`RunState.FromSerializable`、`RunManager.SetUpSavedSingleplayer/LoadIntoLatestMapCoord`；战斗结束保存 `PreFinishedRoom` | `continue` 使用原版存档反序列化和 RunManager 恢复路径。`python3 tests/save_smoke.py` 在宝箱/战斗奖励检查点写存档，关闭并重启 Godot 后恢复相同种子、楼层、HP、金币、卡组，再用 `abandon` 删除存档 | 只验证原版自动保存检查点，不提供任意时刻/战斗中手动快照；测试存储在 `res://.cache/spirecli-*`，生产默认隔离于 `user://terminal-save`。Steam Cloud、正常 GUI 配置和进度迁移未验证 |
| 网页 → HTTP → Godot | `server.py` 的 `/api/state`、`/api/command` 会话协议；`web/index.html` 命令输入框；`web/app.js` 请求 `/api/command` | 本轮 HTTP smoke 经本机回环验证页面、脚本、Cookie 会话、`help → new → choose(Neow) → move → play → end → abandon`；涅奥后由 `move` 进入战斗；HTTP 烟测使用 TestMode 内存存档，持久化另由 `save_smoke` 覆盖。隔离 Chrome/TestMode 内存会话中，在可达战斗节点上画线、关闭手绘后点击该节点确认进入战斗，并从地图点击固定种子 `WEBTEST` 的商店和休息处：商店先显示商品，休息处显示“营火行动”、休息和锻造选项，均未被全屏地图覆盖 | 路线图做过真实浏览器视觉与穿过手绘笔迹、商店和休息处入口的点击检查；战斗状态固定面板、IME、窄屏和移动端视觉仍未验收；并发、错误边界和崩溃恢复未覆盖 |

## 新增的前端显示实现（2026-09-21）

命令回显现与规则消息分离，存放在独立滚动的命令历史栏；点击一条历史只会填入命令框，不会提交执行，小屏幕默认折叠该栏。怪物 Power 的标题、增益/减益分类和描述从本机原版 PowerModel.HoverTips 进入快照，并使用原版动态说明文本；例如易伤显示原版回合数说明，力量显示原版数值效果，不将所有 Amount 解释为回合。依据见 docs/sources.md 的“本机原版怪物状态文本依据”。

本次运行了 dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers（0 warning、0 error）、node --check web/app.js 和 git diff --check。桌面 Chrome 预览中经网页内置命令框提交只读 help，截图确认 help 回答留在主消息区、命令只出现在独立历史栏。未跑测试；未验证历史项点击回填、真实战斗 Power 快照或窄屏布局。

## 房间交互一致性修正（2026-09-21）

检查了休息处、事件、商店、卡牌/遗物奖励、宝箱、地图路线和嵌套选牌。原版铁匠、烹饪、商店移除与卡牌移除奖励把 `CardSelectorPrefs.Cancelable` 设为 true；现在只有这些调用路径接受 `back`，并把空选择交回原版。商店移除在原版返回已选卡后才扣金币；固定种子 `WEBTEST` 已实测先取消商店移除再正常购买，取消前后金币均为 116。休息处实测先取消铁匠，原版仍保留该项且不开放离开，再成功休息并开放路线。事件、商店、卡牌/遗物候选项都附带其内置命令；多选卡牌点击会累积/移除编号并生成一条 `choose` 命令。网页选项与路线点击直接提交命令，命令框继续作为手动入口；命令历史点击只回填输入框。地图手动 `move` 会收起路线页，进入休息处时优先展示营火行动。此轮仅通过 JS 语法与补丁格式检查，未运行房间流程或浏览器点击回归。

路线预览遵循快照 `canLeave`；事件完成、休息动作成功、宝箱处理完毕等条件未满足时网页禁用 `move`，且提示为预览。商店卡牌/遗物/药水说明和金币数使用原版对象/价格，选项按原版售罄和金币状态禁用。房间仍由 `TestMode/headless` 运行，因此原版营火、商店和事件场景图形没有复刻。

本次 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过（0 warning、0 error）；`python3 tests/engine_smoke.py`、`python3 tests/choice_adapters_smoke.py`、`python3 tests/room_flow_smoke.py`、`python3 tests/http_smoke.py`、`node --check web/app.js`、Python 编译检查和 `git diff --check` 均通过。`room-flow-smoke.json` 记录 Main 源码哈希 `ab2b9bcf5e03276db96248db571f2955a47497bca9aa411fa8d90812fd2f3287`、程序集哈希 `9254deee39868942ee2251df107e617aa23cf07235fec47bbf6d550cbb18c7e9`。这轮没有跑真实浏览器点击验收；Build 归属与完整玩法 1:1 仍未核验。

## TestMode 与图形模式差异

当前每个 Godot Host 都设置 `TestMode.IsOn = true`，这是本项目 headless 命令适配的运行前提。状态快照会明确标注 `TestMode/headless`。

- 原版 `RunManager.ShouldApplyTutorialModifications()` 在 TestMode 下返回 `false`（除非 `ForceDiscoveryOrderModifications`）；因此地图章节的发现顺序修改不会照常应用。
- 原版 `ActModel.GetRandomList()` 仅在 `TestMode.IsOff` 时才优先选择已解锁但未发现的章节。测试模式的章节选择可能与普通单人游戏不同。
- 原版 `RunManager.SetStartedWithNeowFlag()` 只在 `NeowEpoch` 已揭示时标记从 Neow 开始；原版空白进度没有 Epoch，故第一幕起点按原版改为 `Monster`。本项目无 Timeline UI，命令 `new ironclad` 会用原版 `SaveManager.ObtainEpochOverride(..., Revealed)` 与 `SaveProgressFile()` 为终端自己的进度补上 Neow 解锁，再交给原版 `RunManager` 自动进入固定 Neow。此宿主策略满足标准开局交互，但不声称复现原版空白档首次运行或 Steam 进度。
- 原版 `SaveManager.ConstructDefault()` 在 TestMode 使用内存 `MockGodotFileIo`。Host 显式注入隔离的 `GodotFileIo`，默认目录为 `user://terminal-save`，用来让原版 `SerializableRun` 自动存档可跨进程继续；这不会启用原版 Steam Cloud，也不等同用户 Steam 配置文件。
- 原版 PCK 仅在新旅程将从 Neow 开始或命令将进入 Ancient/Unknown 点时按需挂载（`replaceFiles:false`），供原版事件选项中的遗物悬浮提示读取资源。挂载后，`res://` 不适合作为持久化写入位置；产品默认存档使用 `user://terminal-save`。当前受限沙箱未验证真实用户目录写权限。
- 原版 `CardSelectCmd.FromChooseABundleScreen()` 在 TestMode 固定返回 `bundles[0]`，`RelicSelectCmd.FromChooseARelicScreen()` 仍依赖图形选择节点。本项目在暂存 DLL 的这两个入口接入命令选择适配；相关行为是窄范围 UI 桥接，不表示其余 UI/所有选择流程已复刻。
- 原版水晶球 `NCrystalSphereCell.Create()` 与 `NCrystalSphereItem.Create()` 在 TestMode 下返回 `null`。本项目只在暂存 DLL 中将 `NCrystalSphereScreen.ShowScreen()` 接到网页快照；小游戏状态机和奖励沿用原版模型/同步器，原版图形动画与普通 GUI 路径未作为网页复刻目标。
- 其他以 `TestMode.IsOn` 分支的 UI、教程、演示、声音或调试逻辑尚未逐项审计。不要把当前 Host 行为外推成普通 GUI 或多人模式表现。

## 测试专用战斗流程命令（2026-09-21）

仅当启动网页服务的进程设置 `SPIRECLI_ENABLE_TEST_HOOKS=1` 时，网页终端 `help` 才显示 `__test_kill [敌人编号|all]`；无参数时击杀全部存活敌人，指定编号按状态面板中当前存活敌人顺序击杀一个。命令限制在玩家出牌阶段，且没有结算或待处理选择时。

实现调用原版 `.cache/source/MegaCrit.Sts2.Core.Commands/CreatureCmd.cs` 的 `CreatureCmd.Kill(creature, force: true)`，之后调用原版 `CombatManager.CheckWinCondition()`。击杀仍经过原版 `BeforeDeath` / `AfterDeath`、敌人移除、主敌人与次级敌人处理和战斗结束结算；奖励由既有 `CombatManager.CombatWon` 路径处理。此测试命令绕过卡牌伤害、格挡、伤害触发器及原版 `ShouldDie` 防止死亡判断，只验证死亡、房间结束与奖励等后续流程，不用于验证战斗数值或宣称规则等价。该命令本轮仅做了运行时构建，尚未执行真实战斗流程回归。

## 最新构建与测试证据

- 事件动态文本修复后，`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 和 `python3 tests/room_flow_smoke.py --seed WEBTEST` 均通过；固定事件选项显示“失去14点生命，获得天选芝士。”，不再保留 `{Damage}`。当前 `runtime/Main.cs` / Godot Mono assembly SHA-256 为 `38aa34ea28e0cd733b56577a305fc95cfdaf6de46d7d7ba73a10a96e7700cd93` / `12dfc790f98e9e10386a5b268ca453d64d5d751c19e83000cafa09b412188dfd`；`node --check web/app.js` 与 `git diff --check` 通过。本轮未重跑其它 smoke 或图形版对照。
- 网页地图状态修复后，`Event/EventRoom` 的待处理选项和结算阶段会抑制地图覆盖层；事件完成后先保留原版事件结果和路线清单，用户点击“查看地图”或路线按钮后再导航，避免结果被地图覆盖。`node --check web/app.js` 与 `git diff --check` 通过；当前环境没有可用的浏览器控制面，因此未做本轮图形点击目视验收。
- 测试专用击杀入口 `__test_kill [敌人编号|all]` 于 2026-09-21 编译通过：`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`，0 warning、0 error；`git diff --check` 通过。`runtime/Main.cs` / Godot Mono assembly SHA-256 为 `f6943e6145bbd06a91aed751a61f931e2d12e722bda9ed16aa2be533fe4a04a2` / `a3ac97557bb626822f117ee7bb1af8abe0dcc0999a64cbce13d591133cf51a06`。本轮未启动 Host 执行击杀命令，死亡钩子、胜利结算和奖励仍待真实流程回归；行为范围及限制见上文。
- 本轮重新执行 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`，0 warning、0 error；Godot Mono `4.5.1.stable.mono.official.f62fdbde1`，.NET `10.0.102`。以下报告均记录当前 Main SHA-256 `e83123f89e88e8728fdfc6c7ee821da10aac5fb91e5707e57444c51be94efe34` 和程序集 SHA-256 `c5ab914f54607c7e5a767ba6514ba758508506d82446f516d06ee6c7db61db94`。
- 地图快照补充：`MapView()` 将原版地图点、`Children` 连线、当前可达编号及有序 `VisitedMapCoords` 放入快照。该阶段构建的源码/程序集 SHA-256 为 `a3ad3e2fce80f5ffd088c4eb949fa11719dc1a5227eb43f7fce24b7d7a112535` / `eeaf29a83971295c47f96d77fabdc4d061c418cbe8e52ccae2078f09c5785c01`；当时没有重跑六项 smoke。
- 敌人意图显示修正：快照现保留原版 `IntentType`、意图标签，并在原版 `GetHoverTip()` 可生成时附加格式化标题/说明；网页对空标签显示可用的原版提示，并遵循 `HasIntentTip`。`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error；当前 `runtime/Main.cs` SHA-256 为 `71bfaa7c44df958d4d50fdbed232d8f51622fb2c4164d5a80b72830654dbf2ae`，程序集 SHA-256 为 `7320e6e5875ad6d427f007fd3ceb26b35826ce4f431bb38bc36411f7cd961d87`。`node --check web/app.js` 与 `git diff --check` 通过；本次未运行战斗回归或浏览器目视检查，因此这些证据不覆盖具体敌人的运行时意图状态。
- Boss 信息修正：敌方快照改用原版 `CombatManager.DebugOnlyGetState().Enemies` 作为战斗期间的权威集合，并将意图标签、悬浮提示和 Power 分别隔离读取，缺少原版贴图时不会丢弃敌人名称和生命值；网页新增 Boss 遭遇标题。固定 TestMode 路线 `BOSSFLOW` 进入原版 Boss `仪式兽`，快照确认 `combat.type=Boss`、名称“仪式兽”和 `252/252` HP，报告 `.cache/boss-display-smoke.json`。当前构建源码/程序集 SHA-256 为 `a8cff318c78bfca7ea38157d254266749c02dcb0b255d386be10019ff914503c` / `33450862297ede7a63eecf3f7118bdfbc7aba67e1371e88b1440464e387996b2`。浏览器视觉面仍未在本环境验收。
- Boss 转幕修正：首领奖励/结算完成且原版 Boss 没有子路线时，快照新增“进入下一幕”动作和 `proceed 进入下一幕` 提示；第三幕对应提示为“进入终局事件”。`proceed` 继续调用原版 `RunManager.EnterNextAct()`，没有在网页层生成下一幕地图。`python3 tests/boss_transition_smoke.py --seed BOSSFLOW` 通过，确认标准 `actCount=3`、第 1 幕 Boss 结算后切到第 2 幕地图并出现唯一 Ancient 路线；报告 `.cache/boss-transition-smoke.json`。最新 `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 为 0 warning、0 error；`node --check web/app.js`、`python3 -m py_compile tests/boss_transition_smoke.py`、`git diff --check` 通过。该 smoke 使用测试击杀入口验证转幕和入口，不证明战斗伤害过程完整 1:1。
- 问号事件入口修正：原版 `EventRoom.EnterInternal()` 不等待 `EventSynchronizer.BeginEvent()` 内部的 `EventModel.BeginEvent()`，桥接层 `Settle()` 现会等待未完成且选项为空的原版事件初始化；快照新增 `eventState.initialized/finished/optionCount`，网页在初始化状态下禁止自动打开地图，路线点击进入事件时也会清除残留地图状态。`python3 tests/unknown_event_smoke.py --seed BOSSFLOW` 通过，确认 Unknown 点进入 `EventRoom` 后先显示原版选项、`canLeave=false`；报告 `.cache/unknown-event-smoke.json`。随后重跑 `engine_smoke`、`room_flow_smoke`、`node --check web/app.js`、Python 编译和 `git diff --check` 均通过。该检查覆盖固定种子入口，不等于全部随机事件和普通图形模式已完成对照。
- 本轮最终源码/程序集 SHA-256：`db1273350972dffc085eb59fe29b27ae612dc5d0032cd9703714854ee497febe` / `93bae58c1c400ecc3175611c1c14f66fefccf7a4c6835584738de1fe43b27f56`；同一构建下 `boss_transition_smoke`、`act_opening_smoke`、`choice_adapters_smoke`、`save_smoke` 也通过。
- 休息处地图覆盖修正后的最终源码/程序集 SHA-256：`5a1fedf53d5ea44ccb17b47f8d6829cbd3d515a6f196c586c68b64728850866a` / `01b6a43e99f139b127eb8611d25bb26328f249f211cdb35db26f828eaab114f7`；`room_flow_smoke` 重新确认进入休息处先有原版行动，成功行动后才开放路线。
- 地图房间过渡和商店离店修正后的最终源码/程序集 SHA-256：`cf139407ecf700bda62da84fa8d2a040b3d59af7ead5a81eb3eb54d7d98aa578` / `24e1f7ee81717cb9bea5976f93427ab3512a6fe47eed1ef5c22d9ebc0787f22d`。`Settle()` 现等待每次 `move` 的目标坐标、源房间退出和目标房间进入，并等待休息处原版选项生成；商店快照暴露原版 Proceed 对应的“离开商店”动作，点击后打开路线图。最新 `engine_smoke`、`room_flow_smoke`、`unknown_event_smoke`、`node --check web/app.js` 和 `git diff --check` 均通过。当前环境没有浏览器控制面，未做本轮实际网页点击目视验收。
- 战斗手牌点击入口：`web/app.js` 将战斗手牌渲染为可聚焦按钮；无目标卡直接提交 `play 编号`，`AnyEnemy`/`AnyAlly` 先选择敌人/战士再提交带目标编号的命令。目标类型仍来自运行时 `CardView.targetType`，最终由原版 `CardModel.CanPlay/IsValidTarget` 校验；命令框保留为手动入口。`node --check web/app.js` 与 `git diff --check` 通过，当前环境没有浏览器控制面，未做实际点按目视回归。
- 启动文案与手牌布局修正后的最终源码/程序集 SHA-256：`0e7b8c916a5fd10c58aa78bfbd3bf90bdbfe6aeb0256a0abb29e8ca675c0b594` / `bbe5c59ff6c4841befd8f9ef6a36c1dba06433079ea9a5f5d62151a9b23ebae6`。运行时移除连接初始的说明性日志，欢迎页仍提供开始提示；网页双列手牌增加卡牌高度、列距、行距和中文说明行距。`engine_smoke`、`room_flow_smoke`、`unknown_event_smoke`、`node --check web/app.js` 和 `git diff --check` 均通过。当前环境没有浏览器控制面，未做本轮实际网页视觉回归。
- 网页视觉检查使用仅绑定 `127.0.0.1:8876` 的临时服务和 `SPIRECLI_EPHEMERAL_SAVES=1`。通过网页命令 `new ironclad MAPUI26 0`、`choose 3`、`proceed`、`map` 到达路线界面，目视确认节点连线、可达编号和全屏图；服务随后关闭。此检查没有进入战斗，也没有覆盖手绘、移动端或 IME。
- `python3 tests/engine_smoke.py`：固定种子 `WEBTEST`，24 条命令；检查原版文件哈希，验证 `new` 自动进入 Neow、开局选择、路线、出牌、拒绝无效行动、回合、战斗奖励、选卡、继续地图、放弃和重开。报告：`.cache/engine-smoke.json`。
- `python3 tests/choice_adapters_smoke.py`：14 条命令；覆盖开局 Neow 后的测试专用多选、可跳过选择、嵌套请求、卡牌组合和遗物选择。报告：`.cache/choice-adapters-smoke.json`。
- `python3 tests/room_flow_smoke.py`：74 条命令；覆盖开局 Neow 后固定种子实际到达的普通战、商店、两个事件选择分支、休息点、宝箱。报告：`.cache/room-flow-smoke.json`。
- `python3 tests/unknown_event_smoke.py --seed BOSSFLOW`：固定原版 Unknown 点入口；确认事件初始化完成前不返回空选项，进入事件后先显示可执行原版选项且不可离房。报告：`.cache/unknown-event-smoke.json`。
- `python3 tests/save_smoke.py`：两个独立 Godot 进程；在原版战斗奖励存档点写入并恢复 `SerializableRun`，随后放弃并确认当前存档消失。报告：`.cache/save-smoke.json`。
- `python3 tests/act_opening_smoke.py --seed XHPB63HK`：16 条命令；第一幕通过普通 `new ironclad` 进入固定 `NEOW`（没有解锁测试钩子）；后两幕分别从 `Ancient` 起点进入本幕 `ActModel.Ancient` 并处理事件选项。报告：`.cache/act-opening-smoke.json`。
- 涅奥缺失说明回归：`act_opening_smoke` 还确认 `NEOW.pages.INITIAL.description` 不生成占位符，而事件选项仍正常存在；终端按原版 `NEventRoom.SetDescription` 对不存在的 LocString 不渲染说明。
- `python3 tests/http_smoke.py`：本轮通过；固定种子 `WEBHTTP`，验证页面、脚本、Cookie 会话、涅奥选择、进入首战、出牌、结束回合和放弃。HTTP 用例通过 TestMode 内存存档隔离；写盘和跨进程恢复由 `save_smoke` 单独验证。报告：`.cache/http-smoke.json`。
- 水晶球占卜接入构建（2026-09-28）：补丁器成功将暂存 `runtime/lib/sts2.dll` 的原版 `NCrystalSphereScreen.ShowScreen()` 重定向到网页模型登记；`dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error；`node --check web/app.js` 与 `git diff --check` 通过。`runtime/Main.cs` / `ChoiceAdapters.cs` / Godot Mono assembly SHA-256 为 `bb299728d9023be7c3e7c16b5675eecd8ecc212077b2bfc72d289308640e410a` / `dd95c63f5073958172bd2f3ccf9f18c48e909ca9289197cc6546db3655f90d9d` / `66e82670b98bf61fa9fb3163bd5dca2cb4045e274a19b19a97f2523a577b734a`。原版 `reference/sts2.dll` 哈希仍为 manifest 的 `a1f9e653f1e28e4076558fee1e60d218619cb7e057b887c6417f62c62c6d7a52`。本轮未运行玩法测试、未开新存档或推进当前旅程，也未进行浏览器视觉验收；这些构建和静态检查不证明真实水晶球流程已运行正确。

原版输入 SHA-256：`sts2.dll` `a1f9e653f1e28e4076558fee1e60d218619cb7e057b887c6417f62c62c6d7a52`；`SlayTheSpire2.pck` `42520eb8b0911c6c0f0bd102d92b33f41abd4d26b83489817d0a6dbd7dd48587`。输入文件保存在 `reference/`；原版 DLL 未被补丁器改写。

## 未验证范围

- 本机原版文件到 Steam Build `23811903` 的独立出处证明仍缺失；不可将 `build_verified` 改为 `true`，也不可宣称完整规则 1:1。
- 尚无全卡牌、所有状态/遗物/药水/敌人、全部事件与商店项目、精英和 Boss、进阶全等级、成就、多人、Steam Cloud、结局与失败恢复覆盖。
- 没有真实图形版同种子逐帧基准；浏览器只检查了地图页，战斗面板、键盘/中文输入法和移动视口仍待视觉验收。
- 存档只通过原版实际自动保存时机验证；若游戏流程尚未触发原版存档，终端没有额外的“强制写入任意战斗状态”命令。
- 药水点击使用刚接入网页：药水可用性取原版 `PotionModel` 状态，使用经现有命令进入原版 `UsePotionAction`；本轮尚未用实战药水或浏览器点按验证，所有药水种类、目标类型与战斗时机仍未覆盖。

## 牌组与事件卡牌查看（2026-09-29）

- 右侧牌组入口展示原版 `Player.Deck.Cards`，详情来自对应 `CardModel`，不修改游戏状态。
- 事件选项按原版 `EventOption.HoverTips` 中的 `CardHoverTip` 将选项文字里的卡名标为可点击下划线，特殊卡牌奖励也将卡名设为预览入口；没有明确卡牌提示的随机/动态结果不预先虚构牌面，不另加“查看牌面”按钮。
- 本次仅完成数据与界面接入、编译和静态检查；尚未逐个进入事件、点击牌组抽查原版卡牌效果，也没有浏览器目视验收，不据此宣称完整覆盖。

## 卡牌关键词自定义悬浮提示（2026-09-29）

- 卡牌描述中的特殊词条使用 `CardModel.HoverTips` 原版标题与格式化说明；网页用自定义提示框在鼠标悬停或键盘聚焦时立即展示，位置会避开视口边缘，词条保留点状下划线作为可交互提示。
- 仅验证 JavaScript 语法与补丁格式；未进行浏览器视觉验收或逐个关键词检查，不据此宣称覆盖所有词条或完整 1:1。

## 放弃后存档与时间线回归（2026-09-28）

- `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers` 通过，0 warning、0 error。`python3 tests/silent_character_smoke.py --timeout 90` 通过：活动旅程放弃后关闭并重启独立持久化 Godot Host，确认没有可继续/可放弃的旧 run save、时间线仍强制显示静默猎手 Epoch；揭示后角色可开局。
- 该隔离路径中的原版异步击杀及时完成，所以 `Settle()` 新增的 120 帧 headless 击杀兜底没有被触发；完整用户服务 HTTP 请求与浏览器菜单点击也因沙箱拒绝本机回环连接而未验证。不能据此证明用户当前运行的旧服务已载入修复。
- 后续真实进度诊断发现 `SILENT1_EPOCH` 已存在但仍为 `not_obtained`，导致仅按“epoch 缺失”初始化时无法揭示。现 `EnsureTerminalTimelineProgress()` 会迁移 `None` / `NoSlot` / `NotObtained` 到原版 Neow `QueueUnlocks()` 对应状态。更新烟测模拟这一旧档状态后通过；并把当前真实 `progress.save` 只读复制至独立测试存档，确认启动迁移会强制显示节点、揭示后角色可选。真实进度文件未被修改；要让当前服务使用新逻辑仍需重启。

## 储君接入验证（2026-09-28）

- 原版证据：`.cache/source/MegaCrit.Sts2.Core.Models.Characters/Regent.cs` 定义 75 HP、99 金币、10 张起始牌（4 张 `StrikeRegent`、4 张 `DefendRegent`、`FallingStar`、`Venerate`）和 `DivineRight` 初始遗物；`.cache/source/MegaCrit.Sts2.Core.Saves.Managers/ProgressSaveManager.cs` 的 `PostRunUnlockCharacterEpochCheck()` 在静默猎手完成标准对局后获得 `REGENT1_EPOCH`；`.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/Regent1Epoch.cs` 揭示时解锁储君并扩展时间线；`.cache/source/MegaCrit.Sts2.Core.Models.Relics/DivineRight.cs` 每次进入战斗获得 3 辉星；`PlayerCombatState.Stars` 和 `NStarCounter.RefreshVisibility()` 是原版计数与显隐来源。
- `runtime/Main.cs` 将 Regent 加入角色菜单、命令别名和 Epoch 揭示；`web/app.js` 显示角色名和战斗中的原版辉星数量，解释文字取自 `static_hover_tips.STAR_COUNT`。旅程创建、原始牌组、遗物触发和战斗行动仍经原版模型/队列运行。
- `python3 tests/regent_character_smoke.py --timeout 90` 通过：新档隐藏并拒绝启动储君；铁甲战士局后揭示静默猎手；静默猎手局后出现 `REGENT1_EPOCH` 原文条件并揭示；储君原版 75/99/10 开局、起始牌组和遗物正确；首战显示 3 辉星。隔离目录位于 `.cache/spirecli-regent-character-smoke-*`，不触碰用户进度。
- `python3 tests/silent_character_smoke.py --timeout 90` 通过，原有猎手解锁链无回归；`python3 tests/engine_smoke.py --timeout 90` 通过。综合 smoke 的 abandon 断言同步为当前已验证行为：败局状态保留在宿主快照，前端显示开始菜单；run save 已清除且可继续开局。
- `dotnet build runtime --configfile runtime/NuGet.Config --disable-build-servers`：0 warnings / 0 errors；`node --check web/app.js`、`python3 -m py_compile tests/regent_character_smoke.py tests/engine_smoke.py` 与 `git diff --check` 通过。此验证未覆盖储君全卡池、全部辉星增益/消耗卡、进阶、随机事件、图形版动画或普通图形模式；不声称完整 1:1。

## 休息处铁匠升级预览（2026-09-29）

- 铁匠候选卡牌附带原版 CardModel.MutableClone() + UpgradeInternal() 生成的预览快照。网页提供原版“查看升级”切换；点击候选牌后显示升级前后卡名、费用、描述和关键词，确认才提交原版选择，取消返回列表。
- 预览没有变更实际牌组卡牌；升级结算仍由 SmithRestSiteOption.OnSelect() / CardCmd.Upgrade() 完成。编译和静态检查结果记录在最新交接条目；本轮没有运行房间流程烟测或浏览器目视回归。
