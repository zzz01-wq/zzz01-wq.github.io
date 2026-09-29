# 官方来源登记

核验日期：2026-09-20。以下仅记录网页实际支持的事实，不推导具体玩法数值。

| 来源 | 可支持的结论 | 不能由此确认的内容 |
| --- | --- | --- |
| [Mega Crit：抢先体验发售公告，2026-03-05](https://www.megacrit.com/news/2026-03-05-early-access-launch/) | 二代已进入抢先体验；内容会继续增加及平衡调整 | 当前精确版本和完整规则 |
| [Mega Crit：发售日期与预告，2026-02-19](https://www.megacrit.com/news/2026-02-19-release-date-trailer/) | Ironclad 为可用角色之一；存在单人和最多四人合作 | 战士所有属性、卡牌与联机结算细节 |
| [Mega Crit FAQ](https://www.megacrit.com/faq/) | 游戏使用 Godot；包含卡牌、遗物、药水、敌人、事件、附魔等内容；支持模组 | 卡牌数值、敌人状态机、概率、随机数算法 |
| [Mega Crit：2026 年 6 月 Neowsletter](https://www.megacrit.com/news/2026-6-19-neowsletter-issue-23/) | 官方确认内置模组加载器与 Steam Workshop，并提供模组资源入口 | 命令行适配 API、无界面运行方式、特定版本程序集接口 |

## 待取得的证据

- Build `23811903` 的官方游戏数据与本地版本凭据（用户已锁定 Build ID）。
- 战士全卡池（含升级、生成牌、状态牌和诅咒）及可接触的公共内容。
- 敌人招式条件、权重、冷却、状态机与难度差异。
- 各幕完整流程、奖励、商店价格、普通事件池与解锁规则；幕首 Ancient 选择已有下列本机原版源码依据，仍需覆盖更多种子和解锁状态。
- 伤害取整、各类触发排序、战斗结束边界与死亡处理。
- 同版本原版回放或可重复的逐步对照。

目前没有任何完整玩法模块被核验为 1:1。

## 本机原版幕首事件依据

- `.cache/source/MegaCrit.Sts2.Core.Map/StandardActMap.cs` 的 `AssignPointTypes()` 将 `StartingMapPoint.PointType` 设为 `Ancient`。
- `.cache/source/MegaCrit.Sts2.Core.Models.Acts/Overgrowth.cs` 的 `AllAncients` 只有 Neow；因此第一幕解锁该 Ancient 后固定出现涅奥。
- `.cache/source/MegaCrit.Sts2.Core.Models/ActModel.cs` 的 `GenerateRooms()` 通过运行 RNG 从 `GetUnlockedAncients(unlockState)` 与该幕的共享 Ancient 子集中选择 `_rooms.Ancient`；`PullAncient()` 返回这个预选模型。
- `.cache/source/MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 `GenerateRooms()` 为后续幕分配共享 Ancient 子集；`CreateRoom()` 在 Ancient 地图点读取 `State.Act.PullAncient()`。
- 原版 `RunManager.SetStartedWithNeowFlag()` 只在 `NeowEpoch` 已揭示时标记 Neow 开局；否则第一幕地图起点改为 Monster。原版 `ProgressSaveManager.UpdateEpochsPostRun()` 会在一局结束后取得 Neow，随后由 Timeline 流程显示/揭示该 Epoch。这是原版全新空白进度与已完成时间线解锁后的差别。
- 命令终端跳过原版 Timeline UI，也不读取 Steam 进度。按本项目的标准开局要求，`runtime/Main.cs` 在 `new ironclad` 前用原版 `SaveManager` API 将终端自己的 NeowEpoch 标记为 Revealed，再由原版 `RunManager.EnterAct(0)` 自动进入固定 Neow。它是宿主的进度初始化策略，不表示原版空白首档也必定从 Neow 开始。
- 后两幕的 `EnterAct()` 先进入地图房间；终端用 `move 1` 进入 Ancient，再用 `choose 编号` 处理已由原版 RNG 预选的事件。执行证据见 `.cache/act-opening-smoke.json` 和 `docs/engine-coverage.md`。
- 原版 `.cache/source/MegaCrit.Sts2.Core.Models/ActModel.cs` 的 `GetRandomList()` 按 `ModelDb.ActsByIndex` 的幕编号建立标准旅程；本构建的标准列表为 3 幕。`.cache/source/MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 `EnterNextAct()` 在当前幕不是最后一幕时调用 `EnterAct(CurrentActIndex + 1)`，后者进入下一幕地图；只有最后一幕才进入 `TheArchitect` 终局事件。终端 Boss 结算后调用同一 `EnterNextAct()`，不是网页层自造路线。
- 原版 `NEventRoom.SetDescription()` 仅在说明 `LocString.Exists()` 时设置说明控件；缺少该 key 时原版界面留空。提供的 `zhs/ancients.json` 与 `eng/ancients.json` 均没有 `NEOW.pages.INITIAL.description`。终端快照沿用此行为；方括号形式的“原版文本未提供”是宿主原先对缺失 key 的诊断格式，不是原版剧情文本。

## 本机原版建筑师终局对白依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Events/TheArchitect.cs` 的 `LoadDialogue()` 以原版进度中的角色胜场和总胜场，从 `DialogueSet.GetValidDialogues()` 取本角色对白，再用该事件自己的 `Rng.NextItem()` 选择。运行时不自行决定台词分支。
- `.cache/source/MegaCrit.Sts2.Core.Entities.Ancients/AncientDialogueSet.cs` 与 `AncientDialogue.cs` 根据角色、胜场索引和 `ancients.json` 填入原版对白行；`AncientDialogueLine.LineText`、`Speaker`、`NextButtonText` 都来自这些原版模型/本地化键。`docs/reference-manifest.json` 标识所用原版 DLL/PCK 哈希，但 Build `23811903` 归属仍未独立验证。
- 简中原文在 `.cache/extracted/localization/zhs/ancients.json` 的 `THE_ARCHITECT.talk.IRONCLAD.*`、`THE_ARCHITECT.talk.SILENT.*` 等键；建筑师名、每句对白和继续/回应按钮均由原版 `LocString` 格式化后传给网页，未在网页层重写台词。
- 原版 `TheArchitect.CreateOptionForCurrentLine()` 把当前行的 `.next` 本地化作为下一个按钮，`AdvanceDialogue()` 更新行并创建后续原版选项；最后一行对应 `CreateProceedOption()`，其回调为 `WinRun()`。终端点击仍调用当前 `EventOption`，末尾仍通过原版 `ActChangeSynchronizer.SetLocalPlayerReady()` 进入 `RunManager.EnterNextAct()/WinRun()`，没有自行设置胜利标记。
- 原版 `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NEventRoom.cs` 的对白气泡与 `.cache/source/MegaCrit.Sts2.Core.Models.Events/TheArchitect.cs` 的 `PlayCurrentLine()` 需要图形/战斗场景中的说话者。在本项目 TestMode 下 `NEventRoom.Create()` 不创建房间节点；`TheArchitect.OnRoomEnter()` 又会先清空首个选项，等待 `PlayCurrentLine()` 显示首句。`runtime/Main.cs` 仅在该模式、终局事件首行且原版选项为空时，通过反射取原版 `CreateOptionForCurrentLine()` 生成选项，再调用原版 `EventModel.SetEventState()`；后续逐句和结束回调仍由原版事件完成。该适配尚未做实际通关到终局的端到端交互回归，也不代表对白动画、攻击演出或完整终局 1:1。

## 本机原版事件选项动态文本依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Events/Wellspring.cs` 的 `CanonicalVars` 明确定义 `new DynamicVar("BatheCurses", 1m)`；`Bathe()` 使用 `base.DynamicVars["BatheCurses"].IntValue` 调用原版 `AddGuilty()`，因此“沐浴”会移除 1 张牌并添加 1 张愧疚。
- `.cache/source/MegaCrit.Sts2.Core.Events/EventOption.cs` 的 `AddLocVars()` 注入角色详情和 `IsMultiplayer`；`.cache/source/MegaCrit.Sts2.Core.Nodes.Events/NEventOptionButton.cs` 在显示前调用 `Event.DynamicVars.AddTo(Option.Description)` 与 `AddTo(Option.Title)`。事件选项的 `{Damage}`、`{BatheCurses}` 等占位符必须经过这条原版动态变量链路，不能在网页层硬编码。
- `runtime/Main.cs` 的 `EventOptionText()` 现在按该显示路径注入原版事件变量后再格式化选项标题和说明。固定 `WEBTEST` 房间流程已确认“仔细翻找”显示为“失去14点生命，获得天选芝士。”，不再显示 `{Damage}` 占位符。

## 本机原版事件卡牌变化结果依据

- `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/EventSynchronizer.cs` 的 `ChooseOptionForEvent()` 将 `EventOption.Chosen()` 放入待处理任务，`AwaitPendingOptionTasks()` 等待这些原版任务完成；终端在同一结算边界后读取结果。
- `.cache/source/MegaCrit.Sts2.Core.Commands/CardCmd.cs` 的牌堆变牌路径在目标是玩家牌组时，将 `new CardTransformationHistoryEntry(original, replacement)` 写入 `runState.CurrentMapPointHistoryEntry.GetEntry(original.Owner.NetId).CardsTransformed`。
- `.cache/source/MegaCrit.Sts2.Core.Runs.History/CardTransformationHistoryEntry.cs` 保存原版 `SerializableCard.OriginalCard` 与 `FinalCard`，其中包含卡牌 `ModelId` 和升级等级。终端用 `ModelDb.GetById<CardModel>()` 格式化标题，只展示原版历史中的实际结果，不在网页层随机或推断变牌结果。

## 本机原版牌组与事件卡牌预览依据

- `.cache/source/MegaCrit.Sts2.Core.Entities.Players/Player.cs` 将 `Deck` 初始化为 `new CardPile(PileType.Deck)`；右侧牌组清单和卡牌详情直接读取 `Player.Deck.Cards`。卡牌费用、类型、本地化描述和特殊词条提示分别来自 `CardModel.EnergyCost`、`CardType.ToLocString()`、`GetDescriptionForPile()` 和 `CardHoverTips()`。
- `.cache/source/MegaCrit.Sts2.Core.Events/EventOption.cs` 暴露 `IEnumerable<IHoverTip> HoverTips`；`.cache/source/MegaCrit.Sts2.Core.HoverTips/CardHoverTip.cs` 暴露对应的原版 `CardModel`。网页只对 `HoverTips` 中明确包含 `CardHoverTip` 的事件选项显示牌面入口，不猜测动态、随机或未实例化的卡牌。
- 原版事件例证：`.cache/source/MegaCrit.Sts2.Core.Models.Events/Trial.cs` 为“审判”选项附加愧疚、羞耻或疑虑的卡牌提示；`.cache/source/MegaCrit.Sts2.Core.Models.Events/Bugslayer.cs` 给两种奖励选项附加具体奖励卡提示。牌面内容由原版 `CardModel` 格式化，查看操作不调用事件选项，也不改变奖励/牌组状态。

## 本机原版结束回合与自动打牌依据

- `.cache/source/MegaCrit.Sts2.Core.Nodes.Combat/NEndTurnButton.cs` 在原版按钮触发时，将 `EndPlayerTurnAction` 加入原版动作队列；网页手牌区的“结束回合”只提交终端既有的 `end` 命令，该命令同样创建 `EndPlayerTurnAction`，不在网页层模拟回合切换。
- `.cache/source/MegaCrit.Sts2.Core.Commands/CardCmd.cs` 的 `AutoPlay()` 对自动打出的卡调用 `CardModel.OnPlayWrapper(..., isAutoPlay: true, ...)`。成功完成出牌后，`.cache/source/MegaCrit.Sts2.Core.Entities.Cards/CardPlay.cs` 的 `IsAutoPlay` 随 `CardPlay` 保存；`.cache/source/MegaCrit.Sts2.Core.Combat.History/CombatHistory.cs` 通过 `CardPlayFinished()` 产生完成记录并触发 `Changed`，记录类型为 `.cache/source/MegaCrit.Sts2.Core.Combat.History.Entries/CardPlayFinishedEntry.cs`。
- 终端订阅原版 `CombatHistory.Changed`，仅收集当前玩家且 `IsAutoPlay` 为真的完成出牌记录，以原版本地化卡名在战斗文本区展示。由于 `CombatManager` 会在战斗收尾清空历史，终端先监听完成记录，再将已记录名称保留到玩家离开当前地图节点；并非将全部原版战斗日志或自动效果可视化称为完整复刻。

## 本机原版偷窃草蜢卡牌记录依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Monsters/ThievingHopper.cs` 的 `ThieveryMove()` 从玩家抽牌堆与弃牌堆按原版优先级选牌，调用 `CardPileCmd.RemoveFromCombat()` 后创建并应用 `SwipePower`。
- `.cache/source/MegaCrit.Sts2.Core.Models.Powers/SwipePower.cs` 的 `Steal(CardModel)` 保存被偷的实际卡牌实例到公开属性 `StolenCard`；运行时读取敌人身上的该 Power，并用卡牌原版标题生成 `stolenCards` 快照字段。网页只在记录存在时显示“偷走的牌”及实际名称，不根据招式文本推测卡牌。
- `.cache/source/MegaCrit.Sts2.Core.Rewards/SpecialCardReward.cs` 将卡牌以 `CardHoverTip` 放入 `Reward.HoverTips`，只有 `OnSelect()` 才把牌加入牌堆；`NRewardButton.OnFocus()` 显示该卡牌提示，点击时才调用原版 `SelectLocalReward()`。网页在被偷卡奖励上分开展示“查看牌面”和“取回”，预览不改变奖励状态，取回仍走 `take`/`SelectLocalReward()`。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens/NRewardsScreen.cs` 的原版继续/跳过流程和 `.cache/source/MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 `ExitCurrentRoom()` 会调用 `RewardsSetSynchronizer.BeforeLeavingRoom()`；同步器对未领取的奖励调用 `OnSkipped()`。网页牌面预览只提供“取回”和“返回奖励列表”；返回时奖励保持未领取，用户可在奖励列表使用现有的“跳过剩余奖励”操作，仍由原版同步器处理未领取项。

## 本机原版卡牌类型与特殊词条提示依据

- `.cache/source/MegaCrit.Sts2.Core.Entities.Cards/CardTypeExtensions.cs` 的 `ToLocString()` 将 Attack、Skill、Power 等卡牌类型对应到原版 `gameplay_ui.CARD_TYPE.*`；运行时快照直接格式化该原版本地化，不在网页自造类型标签。
- `.cache/source/MegaCrit.Sts2.Core.Models/CardModel.cs` 的 `HoverTips` 汇总卡牌自身、附魔、灾祸、动态重放、充能球、格挡和 `CardKeyword` 提示；关键词提示由 `.cache/source/MegaCrit.Sts2.Core.HoverTips/HoverTipFactory.cs` 及 `CardKeyword.GetTitle()/GetDescription()` 构造。
- `.cache/source/MegaCrit.Sts2.Core.HoverTips/HoverTip.cs` 保留原版本地化标题和格式化说明；`static_hover_tips.json` 的 `REPLAY_STATIC` 与 `REPLAY_DYNAMIC` 分别提供简体中文“重放”标题及“将这张牌额外打出一次/Times 次”的说明。
- `runtime/Main.cs` 将卡牌类型和 `HoverTips` 中的原版标题、说明放入快照；网页仅在卡牌描述中为与原版提示标题匹配的词条添加悬停说明，不自行编写规则文案。词条用自定义 `popover` 提示框呈现，悬停/键盘聚焦即显示，并在视口边缘调整位置；不依赖浏览器 `title` 文本或问号帮助光标。

## 本机原版水晶球占卜流程依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Events/CrystalSphere.cs` 定义事件选项与费用：`UncoverFuture()` 通过原版 `LoseGold()` 扣除 `UncoverFutureCost`，然后构造 3 次占卜的小游戏；`PaymentPlan()` 通过原版 `AddCurseToDeck<Debt>()` 添加 Debt，然后构造 6 次占卜。两者都在 `PlayMinigame()` 返回后才调用原版 `SetEventFinished()`。动态价格、事件 RNG 与选项文案继续从该事件模型和本地化读取。
- `.cache/source/MegaCrit.Sts2.Core.Events.Custom.CrystalSphereEvent/CrystalSphereMinigame.cs` 建立 11×11 格子及物品位置，默认工具为 `Big`。原版 `CellClicked()` 每次只扣 1 次占卜；`Small` 清除被点格，`Big` 清除中心格及边界内相邻的八格；`ClearCell()` 只在该物品占据的全部格子都清除时调用 `RevealItem()`。次数降到 0 后完成信号触发，`CompleteMinigame()` 把已揭示物交给原版 `DoLocalCrystalSphereRewards()`。
- `.cache/source/MegaCrit.Sts2.Core.Events.Custom.CrystalSphereEvent/CrystalSphereItems/` 下的具体物品类定义原版格子尺寸、正负属性和奖励转换。`CrystalSphereCurse.RevealItem()` 在揭示时直接调用 `CardPileCmd.AddCurseToDeck<Doubt>()`，并同步已获得卡牌；它没有 `ToReward()` 覆盖，因此不会进入最终奖励列表。金币、药水、卡牌奖励和遗物的 `ToReward()` 分别构造原版奖励对象。`.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/OneOffSynchronizer.cs` 只把非空 `ToReward()` 结果交给原版 `RewardsCmd.OfferCustom()`。
- 原版 `RewardsSet.Offer()` 在 TestMode 下调用 `testSelector`，正常模式显示 `NRewardsScreen`；奖励列表为空时，不显示奖励界面。原版水晶球的其它揭示物进入这套标准奖励领取界面，可逐项领取，也可用奖励屏幕的跳过/继续入口处理余下奖励。诅咒的即时获取与该奖励界面无关。
- `.cache/source/MegaCrit.Sts2.Core.Rewards/RewardsSet.cs` 对最后一幕 Boss 返回空奖励集；`.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/RewardsSetSynchronizer.cs` 在 `BeginRewardsSet()` 中按 `AllRewardsSuccessfullySelected` 完成空集。TestMode 的网页选择器因此应立即返回已完成任务，不应把空集压入网页待领取奖励栈或显示“跳过剩余奖励”；之后是否能离开 Boss 房仍由原版房间进度条件决定。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Events.Custom.CrystalSphere/NCrystalSphereScreen.cs` 提供原版 `ShowScreen()`、格子和工具按钮入口；它预先绘制物品图像，并由 `NCrystalSphereMask.UpdateMat()` 按格子状态遮盖/揭开图像，完整揭示时 `NCrystalSphereItem.OnRevealed()` 才播放揭示动画。简中 `events.json` 的 `CRYSTAL_SPHERE.minigame.*` 与 `CRYSTAL_SPHERE.button.DIVINATION_LABEL_*` 提供占卜说明、次数和工具名称。TestMode 下 `NCrystalSphereCell.Create()` / `NCrystalSphereItem.Create()` 返回 `null`，因此桥接补丁只重定向暂存 DLL 中 `ShowScreen()`，把已有原版模型交给网页；每次网页工具/格子按钮仍调用 `CrystalSphereMinigame.SetTool()` / `CellClicked()`。目前网页只画完整揭示的物品标签，不复刻逐格揭开原版物品纹理的像素效果；这是一条窄范围显示适配，不代表图形小游戏、其他图形回调或全部游戏完整 1:1。
- `runtime/Main.cs` 快照仅在物品所占格子全部非隐藏时发送该物品的位置、尺寸与原版类型信息；格子动作经 `scry` 命令输入解析，不从随机布局推断或暴露尚未揭开的内容。原版奖励列表活动时，网页收起已结束的棋盘并把滚动视图移回奖励选项，避免把领取入口挤出视口。`EventInitializationPending()` 在已登记水晶球模型时结束等待，避免事件空选项被误判为初始化卡住；事件阶段保持为原房间阶段。

## 本机原版角色与怪物状态文本依据

- `.cache/source/MegaCrit.Sts2.Core.Models/PowerModel.cs` 的 `HoverTips` 用 `SmartDescription`（缺省时用 `Description`），并加入 `Amount`、`DynamicVars`、施加者、目标和拥有者等原版变量后格式化说明；`GetDumbHoverTip()` 是不含智能动态说明的原版回退。
- PowerType 定义将状态分类为 Buff 与 Debuff；终端只据此标注增益/减益类别，不自行推断持续时间。
- `.cache/extracted/localization/zhs/powers.json` 提供本机提取的中文 Power 文本。例如 `VULNERABLE_POWER.smartDescription` 把 `Amount` 写为回合数，`STRENGTH_POWER.smartDescription` 将 `Amount` 写为攻击伤害变化。终端通过原版 `PowerModel.HoverTips` 格式化显示，不把其他 Power 的 `Amount` 一概解释成回合。
- `runtime/Main.cs` 的 `PowerViews()` 将原版标题、`PowerType`、`DisplayAmount` 和格式化说明写入角色及敌人快照；`PowerDescription()` 优先取 `PowerModel.HoverTips`，并使用原版 `GetDumbHoverTip()` / `Description` 回退。角色侧栏与敌人栏按原版增益/减益/状态类型显示具体说明，网页不自行将通用数值解释为回合数。缺少动态说明的个别 Power 仍以原版 `Description` 回退，其运行时覆盖需要另行验证。

## 本机原版 Boss 战信息依据

- `.cache/source/MegaCrit.Sts2.Core.Rooms/CombatRoom.cs` 将房间的 `RoomType` 直接映射到 `Encounter.RoomType`，并公开该房间的 `CombatState`、`Encounter` 和 `Enemies`。
- `.cache/source/MegaCrit.Sts2.Core.Combat/CombatManager.cs` 的 `DebugOnlyGetState()` 返回当前原版 `CombatState`；`SetUpCombat()` 将房间内已生成的 Creature 加入同一状态，`StartCombatInternal()` 在原版战斗开始时设置 `IsInProgress`。
- `.cache/source/MegaCrit.Sts2.Core.Models/EncounterModel.cs` 的 `Title` 是原版 `encounters` 本地化标题；Boss 房间的名称来自该标题和战斗状态中的 Monster `Creature.Name`，不是网页层自造名称。
- `runtime/Main.cs` 在战斗期间优先读取上述原版 CombatManager 敌人集合；网页只显示快照的 Boss 标记、原版遭遇标题和敌人状态，不替换原版 Boss 行为或数值。验证报告为 `.cache/boss-display-smoke.json`。
- `.cache/boss-transition-smoke.json` 使用固定种子 `BOSSFLOW` 和测试专用原版死亡入口完成第一幕 Boss 结算，确认网页暴露 `proceed` 后调用原版 `EnterNextAct()`，状态从第 1 幕 Boss 切换到第 2 幕地图，并提供唯一 Ancient 起点。该测试验证的是转幕与入口，不是用测试击杀证明战斗伤害规则。

## 本机原版测试击杀流程依据

- `.cache/source/MegaCrit.Sts2.Core.Commands/CreatureCmd.cs` 的 `Kill(Creature, bool force)` 委托到集合重载。内部击杀会触发 `Hook.BeforeDeath`、`Hook.AfterDeath`、死亡状态/敌人移除/死亡后 Power 清理，并在主敌人死亡且队友全为次级敌人时继续处理队友；`force:true` 会跳过 `Hook.ShouldDie` 的死亡阻止判断。
- `.cache/source/MegaCrit.Sts2.Core.Combat/CombatManager.cs` 的 `CheckWinCondition()` 在战斗进入 `IsEnding` 时调用 `EndCombatInternal()`；后者调用 `Hook.AfterCombatEnd`、房间结束处理、`Hook.AfterCombatVictory`、进度保存和 `CombatWon` 事件。现有终端在 `CombatWon` 上调用房间原版奖励生成。
- `runtime/Main.cs` 的 `__test_kill` 仅在 `SPIRECLI_ENABLE_TEST_HOOKS=1` 时注册，用原版击杀及胜利检查来推进流程；它不会构造卡牌攻击或模拟伤害、格挡与伤害触发器。可证明的是适配路径直接复用这些原版死亡/战斗结束 API，不能由此证明战斗过程完整或 1:1。

## 本机原版房间选项与可取消选牌依据

- `.cache/source/MegaCrit.Sts2.Core.Entities.RestSite/RestSiteOption.cs` 的 `Generate()` 建立本地选项并调用 `Hook.ModifyRestSiteOptions()`；选项可用性来自各自的 `IsEnabled`。
- `.cache/source/MegaCrit.Sts2.Core.Rooms/RestSiteRoom.cs` 在进入房间时同步调用 `RestSiteSynchronizer.BeginRestSite()`，再由 `RestSiteRoom.Options` 暴露原版行动；终端快照的 `restState` 记录选项数量、可用数量和本次适配器是否已经成功完成一项行动。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NMerchantRoom.cs` 的原版 `_Ready()` 将 Proceed 按钮连接到 `HideScreen()`，`HideScreen()` 调用 `NMapScreen.Instance.Open()`；终端商店动作因此暴露为“离开商店”，调用已有 `proceed` 路径进入路线图，不把离店误当成购买或额外规则。
- `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/RestSiteSynchronizer.cs` 的 `ChooseOption()` 只有在 `OnSelect()` 返回成功时才记录休息选择并移除已选项或清空剩余项；取消选牌会返回 `false`，原选项继续保留。`.cache/source/MegaCrit.Sts2.Core.Entities.RestSite/SmithRestSiteOption.cs` 和 `CookRestSiteOption.cs` 都将原版 `CardSelectorPrefs.Cancelable` 及 `RequireManualConfirmation` 设为 `true`，空选牌时返回 `false`。
- `.cache/source/MegaCrit.Sts2.Core.Entities.Merchant/MerchantCardRemovalEntry.cs` 将 `cancelable:true` 传给 `OneOffSynchronizer.DoLocalMerchantCardRemoval()`；`.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/OneOffSynchronizer.cs` 的原版选牌偏好允许取消，并且仅当返回了卡牌后才扣金币并移除卡牌。`.cache/source/MegaCrit.Sts2.Core.Rewards/CardRemovalReward.cs` 调用 `RewardSynchronizer.DoUnsyncedCardRemoval()`；该同步器也设为可取消，只有选到卡牌才移除。
- `runtime/Main.cs` 只在这些原版可取消的休息处/商店/移除奖励选牌上下文中接受 `back`，并向原版 selector 返回空选择；其它强制选牌仍拒绝 `back`。`tests/room_flow_smoke.py` 用固定种子实测取消铁匠和商店移除后房间选项保留、可继续旅程且金币未减少。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NRestSiteRoom.cs` 在 TestMode 下由 `Create()` 返回 `null`；网页显示的是 `RestSiteRoom.Options` 和原版描述，不复刻营火场景动画。`.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Map/NMapScreen.cs` 的 `SetTravelEnabled()` 还要通过 `Hook.ShouldProceedToNextMapPoint()`；适配快照 `canLeave` 用于禁用尚不可执行的网页路线入口。
- 网页选择行、快速动作和路线按钮只会填入 `choose`、`take`、`buy`、`skip`、`back` 或 `move` 命令；执行仍需通过终端命令框提交。该交互改良属于输入方式，不增加游戏内选项或绕过原版同步器。

## 本机原版事件结算与离房提示依据

- `.cache/source/MegaCrit.Sts2.Core.Models/EventModel.cs` 的 `SetEventState()` 在当前选项列表为空时将事件标记为已完成；此状态变更可以发生在事件选项回调执行期间。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NEventRoom.cs` 的 `SetOptions()` 在 `EventModel.IsFinished` 时不显示空的 `CurrentOptions`，而是替换成原版 `PROCEED` 选项；`events.json` 的简中标题为“继续”。点击后原版 `NEventRoom.Proceed()` 启用地图行走并打开地图。网页在事件已完成时显示同名“继续”选项，点击打开网页路线地图；具体路线是否可前往仍由 `CanLeave()` 控制。
- `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/EventSynchronizer.cs` 将 `EventOption.Chosen()` 加入待处理任务；`AwaitPendingOptionTasks()` 等这些任务结束。`.cache/source/MegaCrit.Sts2.Core.Rooms/EventRoom.cs` 在退出事件房间前也会等待待处理选项任务。
- `.cache/source/MegaCrit.Sts2.Core.Rooms/EventRoom.cs` 的 `EnterInternal()` 调用 `EventSynchronizer.BeginEvent()`，而 `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/EventSynchronizer.cs` 的该方法对每个可变事件使用 `TaskHelper.RunSafely(eventModel.BeginEvent(...))`，不会等待 `BeginEvent()` 返回；原版 UI 依靠 `StateChanged` 后续刷新。桥接层的 `Settle()` 现在等待一个尚未完成且选项仍为空的 `EventModel` 完成初始化，并在快照中暴露 `eventState.initialized/finished/optionCount`，防止空选项瞬间被网页误当成可离房状态。
- `.cache/source/MegaCrit.Sts2.Core.GameActions/VoteForMapCoordAction.cs` 只同步登记 `MapSelectionSynchronizer.PlayerVotedForMapCoord()`；宿主随后由 `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/MapSelectionSynchronizer.cs` 排队 `MoveToMapCoordAction`，而 `.cache/source/MegaCrit.Sts2.Core.GameActions/MoveToMapCoordAction.cs` 又用 `TaskHelper.RunSafely(GoToMapCoord())` 启动未被动作本身等待的 `RunManager.EnterMapCoord()`。因此桥接层在每次 `move` 后记录目标坐标和源房间，`Settle()` 要等坐标已切换、源房间已退出且目标房间已进入，避免把中间 MapRoom 快照发给网页。
- `.cache/source/MegaCrit.Sts2.Core.Odds/UnknownMapPointOdds.cs` 的 `Roll()` 规定：当 `UnlockState.NumberOfRuns == 0` 时，前两个 Unknown 点直接返回 `RoomType.Event`，第三个直接返回 `RoomType.Monster`；之后 Unknown 会按原版动态概率在事件、普通战、宝箱和商店等房间中抽取。因此地图上的 `?` 本身不保证每次都是事件；若快照的 `phase` 不是 `Event/EventRoom`，那是原版随机房间结果，不是事件被跳过。
- 终端的事件路线提示和文字地图按 `CanLeave()` 判断是否可移动；该判断同时检查房间结束状态、原版动作结算、待处理选择、战斗状态和 `Hook.ShouldProceedToNextMapPoint()`。事件动作仍在结算时只显示路线预览。

## 已锁定的版本

用户指定 Build `23811903`。

- [官方 Steam 公告：Major Update #2 - v0.107.1](https://steamcommunity.com/games/2868840/announcements/detail/710026912607505281)：已确认标题；本次网页读取未返回公告正文。
- [SteamDB 补丁索引](https://steamdb.info/patchnotes/23811903/)及[分支索引](https://steamdb.info/app/2868840/depots/)将此 Build 对应到 `v0.107.1` / `public`。SteamDB 是第三方，仅用于版本定位，不作为独立的官方玩法证据。
- 第三方转载的公告提示该版涉及随机数算法和战士卡牌调整；这些细节需以官方公告正文或对应游戏文件核实后才可进入实现。

## 本机原版角色与静默猎手解锁依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Characters/Ironclad.cs` 与 `Silent.cs` 分别定义战士和静默猎手的原版开局数据；`CharacterModel.StartingHp/StartingGold/StartingDeck/StartingRelics/CardPool` 是终端角色选择菜单和开局快照的数据来源。静默猎手是此构建源码类型名 `Silent`，本地化角色名取自 `characters.SILENT.title`（“静默猎手”）。
- `.cache/source/MegaCrit.Sts2.Core.Unlocks/UnlockState.cs` 的 `Characters` 只在 `SILENT1_EPOCH` 已揭示时包含 `ModelDb.Character<Silent>()`；`Player.CreateForNewRun(CharacterModel, UnlockState, ulong)` 以该原版角色模型创建玩家。命令 `new silent` 另先检查同一个 `UnlockState.Characters` 集合。
- `.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/Silent1Epoch.cs` 定义静默猎手角色解锁 Epoch；`.cache/extracted/localization/zhs/epochs.json` 的 `SILENT1_EPOCH.unlockInfo` 原文为“以铁甲战士完成一局游戏来揭示这个历史节点”，`unlockText` 为“解锁静默猎手成为一名可玩角色”。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect/NCharacterSelectButton.cs` 的 `Init()` 对未解锁角色使用 `CharacterSelectLockedIcon` 并显示锁头；聚焦时提示标题来自 `main_menu_ui.CHARACTER_SELECT.locked.title`，正文来自 `CharacterModel.GetUnlockText()`。`.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect/NCharacterSelectScreen.cs` 的 `SelectCharacter()` 在锁定分支把资料名设为“锁定”、显示通用角色解锁文本、`??/??` / `???` 属性和“未知遗物”，并禁用启程按钮；不会在角色资料内显示 `SILENT1_EPOCH.unlockInfo`、实际角色名、描述或真实遗物。时间线条件提示由 `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NEpochSlot.cs` 按 Epoch 状态格式化。
- `.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/NeowEpoch.cs` 的 `QueueUnlocks()` 将 `Silent1Epoch` 记为 `ObtainedNoSlot` 并建立其时间线扩展；`.cache/source/MegaCrit.Sts2.Core.Timeline/EpochModel.cs` 的 `QueueTimelineExpansion()` 通过原版 `SaveManager.UnlockSlot()` 写入扩展状态。`Silent1Epoch.QueueUnlocks()` 在揭示后设置 `Progress.PendingCharacterUnlock` 并写入其扩展。网页不加载原版 Timeline 场景，因此 `runtime/Main.cs` 只复用这些存档状态操作，不调用依赖 UI 单例的方法。

## 本机原版储君与解锁链依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Characters/Regent.cs` 是储君原版角色模型：75 生命、99 金币、4 张 `StrikeRegent`、4 张 `DefendRegent`、`FallingStar`、`Venerate`，初始遗物 `DivineRight`，并设置 `ShouldAlwaysShowStarCounter=true`。角色名、起始牌和遗物名/描述来自原版本地化与模型，不由网页另写。
- `.cache/source/MegaCrit.Sts2.Core.Saves.Managers/ProgressSaveManager.cs` 的 `PostRunUnlockCharacterEpochCheck()` 在标准对局结束时读取原版实际角色模型；角色为 `Silent` 时获得 `Regent1Epoch`。`runtime/localization/zhs/epochs.json` 中 `REGENT1_EPOCH.unlockInfo` 是“以静默猎手完成一局游戏来揭示这个历史节点”。结算胜负参数不会改变此角色链检查是否执行；新局资格与可揭示状态仍受原版 `GetRevealableEpochs()` 管理。
- `.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/Regent1Epoch.cs` 的 `QueueUnlocks()` 设置 `Progress.PendingCharacterUnlock` 并沿 `GetTimelineExpansion()` 开放后续 Epoch 槽位。`UnlockState.Characters` 只在 `REGENT1_EPOCH` 揭示时加入 Regent；开局经 `Player.CreateForNewRun()` 使用角色模型的 HP、卡组与遗物。
- `.cache/source/MegaCrit.Sts2.Core.Models.Relics/DivineRight.cs` 在进入 `CombatRoom` 后调用原版 `PlayerCmd.GainStars(3, owner)`；`.cache/source/MegaCrit.Sts2.Core.Entities.Players/PlayerCombatState.cs` 管理当前辉星与卡牌辉星费用；`.cache/source/MegaCrit.Sts2.Core.Nodes.Combat/NStarCounter.cs` 按 `ShouldAlwaysShowStarCounter` 或辉星大于零显示计数，悬浮说明来自 `static_hover_tips.STAR_COUNT`。网页只将此计数转成文字状态栏，不实现新的辉星规则。
- Regent smoke 通过隔离存档验证铁甲战士→静默猎手→储君的揭示顺序、`REGENT1_EPOCH` 本地化条件、锁定状态、储君 75/99/10 开局与首战 3 辉星。该验证只覆盖角色接入和起始流程，不覆盖储君全卡池或完整玩法 1:1。

## 本机原版主菜单与单人模式层级依据

- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMainMenu.cs` 的 `_Ready()` 连接原版主菜单的继续游戏、放弃当前游戏、单人模式、多人模式、百科大全、时间线、设置和退出按钮；`RefreshButtons()` 以 `SaveManager.Instance.HasRunSave` 控制继续/放弃按钮的可见与可用状态。时间线按钮仅在原版进度已有 Epoch 时显示。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu/NPauseMenu.cs` 的游戏内暂停菜单包含“放弃”按钮。原版仅在非多人客户端显示它，并在 `Initialize(IRunState)` 中按 `RunManager.IsInProgress` 和 `IRunState.IsGameOver` 控制可用状态；点击后打开 `NAbandonRunConfirmPopup.Create(null)`。确认框确定后调用 `RunManager.Abandon()`。简体中文按钮文案来自 `gameplay_ui.PAUSE_MENU.GIVE_UP`（“放弃”）。网页没有原版暂停菜单，因此把入口放在右侧栏，确认后走已有 `abandon` 命令。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NSingleplayerSubmenu.cs` 创建“标准模式”“每日挑战”“自定模式”三个入口。标准模式打开 `NCharacterSelectScreen`；每日挑战和自定模式分别按 `DailyRunEpoch`、`CustomAndSeedsEpoch` 是否已揭示决定原版按钮能否使用。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMainMenu.cs` 的 `SingleplayerButtonPressed()` 在 `Progress.NumberOfRuns == 0` 时直接打开角色选择；有已完成旅程后才打开单人模式子菜单。因此终端主菜单与子菜单的出现顺序需要使用原版已结束局数，不因网页偏好改变。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMainMenuTextButton.cs` 只将原版本地化 label 写入主菜单按钮；它没有副标题。`.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NSubmenuButton.cs` 则分别显示 `{MODE}.title` 与 `{MODE}.description`，未解锁时显示 `{MODE}.LOCKED.description`。所以模式页有小字说明，主菜单根按钮没有。
- `.cache/extracted/localization/zhs/main_menu_ui.json` 为原版简体中文模式名提供 `STANDARD.title`、`DAILY.title`、`CUSTOM.title`；`DAILY.LOCKED.description` 和 `CUSTOM.LOCKED.description` 保存相应解锁文本，`STANDARD.description` 是“启程去屠戮这座高塔！”。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.CommonUi/NAbandonRunConfirmPopup.cs` 使用原版 `ABANDON_RUN_CONFIRMATION.header/body` 和 `GENERIC_POPUP.confirm/cancel`；本机构建简体中文是“你确定吗？”、“放弃游戏会被视为本局失败。”、“好的”和“不了”。`NMainMenu.AbandonRun()` 在确认后调用 `SaveManager.UpdateProgressWithRunData(saveData, false)`、`RunHistoryUtilities.CreateRunHistoryEntry(saveData, false, true, saveData.PlatformType)` 并删除 run 存档。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PauseMenu/NPauseMenu.cs` 确认后走 `RunManager.Abandon()`；`.cache/source/MegaCrit.Sts2.Core.Runs/RunManager.cs` 的 `AbandonInternal()` 标记 `IsAbandoned` 并调用 `GuaranteeKillAllPlayers()`，后者通过原版 `CreatureCmd.Kill(..., force:true)` 结束所有玩家。`.cache/source/MegaCrit.Sts2.Core.Commands/CreatureCmd.cs` 仅在 `TestMode.IsOff` 时调用 `RunManager.OnEnded(false)`，因此 headless 适配在死亡动作结算后调用同一个原版结束方法。`RunManager.OnEnded(false)` 内调用 `ProgressSaveManager.UpdateWithRunData()`、原版失败历史及清理；`ProgressSaveManager.UpdateEpochsPostRun()` 随后按原版规则处理 Neow 和角色节点。
- `RunManager.Abandon()` 通过 `TaskHelper.RunSafely(AbandonInternal())` 异步执行。headless 主机缺少 `NCapstoneContainer` / `NMapScreen` 时，原版关闭 UI 节点会捕获 `NullReferenceException` 后继续设置 `IsAbandoned` 并调用 `GuaranteeKillAllPlayers()`。网页桥在活动旅程的 `Settle()` 中等待该原版流程；若等待 120 帧后玩家仍存活且没有正在结算的动作，则调用同一原版 `CreatureCmd.Kill(player.Creature, force:true)` 兜底，再走原版 `RunManager.OnEnded(false)` 和存档清理。此兜底是对异步 UI 流程的 headless 适配，不代表图形模式完整复刻。
- `.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/NeowEpoch.cs` 的 `QueueUnlocks()` 通过 `ObtainEpochOverride(SILENT1_EPOCH, ObtainedNoSlot)` 建立静默猎手节点，再由 `EpochModel.QueueTimelineExpansion()` 调用 `UnlockSlot()` 将其变为 `Obtained`。网页启动时跳过该原版 Timeline 场景，因此 `EnsureTerminalTimelineProgress()` 复用这一存档状态迁移；旧存档中已存在但状态为 `NoSlot` / `NotObtained` 的 Silent epoch 也必须提升，不能只处理 epoch 条目缺失的情况。显示可揭示节点仍由原版 `GetRevealableEpochs()` 决定，角色最终解锁仍需要原版 `SaveManager.RevealEpoch()` 与 `Silent1Epoch.QueueUnlocks()` 的存档效果。
- 网页主菜单按原版存档状态隐藏单人模式入口，只在存在 run 存档时显示继续和放弃。放弃确认使用上述原版本地化；`runtime/Main.cs` 从内存运行态或 `LoadRunSave()` 取得 `SerializableRun`，调用原版进度更新与历史记录 API，再删存档。无存档时，单人模式根据 `Progress.NumberOfRuns` 直达角色选择或进入模式页。
- 原版 `NMainMenu.UpdateTimelineButtonBehavior()` 在 `!DevSkip`、已发现待揭示 Epoch 且没有 run 存档时强制打开 Timeline，并禁用单人模式、多人模式和百科入口。网页沿用待揭示条件，按原版存档中所有可见 Epoch 建立时间线浏览页；原版 `NEpochSlot.OnRelease()` 中可揭示节点与已揭示节点分别对应揭示、查看详情，未获得节点点击不触发状态变化。
- `.cache/source/MegaCrit.Sts2.Core.Debug/DebugSettings.cs` 将 `DevSkip` 定义为 `Environment.GetEnvironmentVariable("STS2_DEV_SKIP") != null`；只要变量存在，哪怕值为 `0` 或空字符串，也会跳过原版强制 Timeline。`server.py` 启动 Godot Host 前通过 `_godot_host_environment()` 清除此调试变量，避免网页服务继承启动 shell 中的设置。绕过网页服务直接启动 Godot 时，应从环境中取消 `STS2_DEV_SKIP`。
- 网页仍未接入每日、自定、多人、设置及退出页面；时间线和百科已接入文字浏览，不复刻原版图片、场景、动画、Timeline 连线或完整卡面布局，也不代表两者或游戏完整 1:1。
- `.cache/source/MegaCrit.Sts2.Core.Saves.Managers/ProgressSaveManager.cs` 的 `UpdateWithRunData()` 对标准单人胜/负记录角色 `TotalWins/TotalLosses`；自定义和每日模式被原版排除。`Silent1Epoch.unlockInfo` 从原版 `epochs.json` 读取；网页只有在原版 `GetRevealableEpochs()` 与铁甲战士标准对局记录均满足时才显示节点。点击后调用 `SaveManager.RevealEpoch()`，并按 `.cache/source/MegaCrit.Sts2.Core.Timeline.Epochs/Silent1Epoch.QueueUnlocks()` 写入角色解锁标记和时间线扩展状态。`unlock silent` 保留作兼容命令；角色选择页本身仍不显示 Epoch 条件。
- `.cache/source/MegaCrit.Sts2.Core.Saves.Managers/RunSaveManager.cs` 的 `HasRunSave` 会在主存档不存在时继续检查 `current_run.save.backup`。2026-09-28 服务日志记录了原版 `RunManager.OnEnded(false)` 已写入进度与失败历史，但 `GodotFileIo.DeleteFile` 删除主存档/备份失败。当前桥接按原版 `SaveManager.CleanupStaleCurrentRunSaveForProfile()` 的规则读取主存档（若主存档缺失则读 `.backup`）中的 `start_time`，并检查同名 `${StartTime}.run` 历史；已记录历史的存档不再被终端当成未完成旅程。活动 host 已调用 `RunManager.OnEnded(false)` 时也将残留存档视为已结算。菜单清理仍会尝试删除主存档及 `.backup`；已结算时的放弃清理按历史名去重，避免重复写失败次数和历史。隔离存档烟测已覆盖活动旅程放弃、重启后从菜单放弃存档、失败局计数、静默猎手 Epoch 出现、揭示 Epoch 后角色可用；记录见 `.cache/silent-character-smoke.json`。网页从主菜单放弃已恢复的存档后回到开始菜单；如果有待揭示节点，时间线作为可用入口，开始新旅程与百科受原版门槛限制。放弃只完成败局记录，角色仍须按原版揭示 `SILENT1_EPOCH` 后才可选择。
- `.cache/source/MegaCrit.Sts2.Core.Commands/CreatureCmd.cs` 在 `TestMode.IsOff` 才会于玩家死亡后调用 `RunManager.OnEnded(false)`。无窗口宿主固定运行 TestMode，所以 `Main.RecordHeadlessDefeatIfNeeded()` 在原版战斗/事件死亡结算点调用同一原版 `RunManager.OnEnded(false)`，让原版 `ProgressSaveManager` 写入失败局计数。测试专用 `__test_complete_run` 仅触发该结束分支，不作为生产玩法操作。
- 以上是网页菜单、角色入口和头尾局数路径的源码依据及 TestMode 适配说明；未覆盖普通图形模式下的 Timeline 动画、剧情揭示流程、Steam 档案同步或所有角色/模式规则，不代表完整 1:1。

## 本机原版时间线与百科大全依据

- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NTimelineScreen.cs` 读取原版 `Progress.Epochs`，依据 `EpochModel.Era`、`Year` 和 `EraPosition` 放置节点；`GetSlot(Era, position)` 也按确切位置取节点。网页必须保留空缺的 `EraPosition` 行，不能把节点紧密堆叠，否则会偏离原版节点位置。`GetTimelineExpansion()` 提供 Epoch 可达/解锁关系，不作为网页绘制节点连线的依据；`NEpochSlot.OnRelease()` 对 `Obtained` 节点调用揭示，对 `Complete` 节点打开详情，`NotObtained` 节点只允许查看锁定提示。详情中的标题、剧情、章节号、解锁说明和解锁文本来自 `EpochModel` 与原版本地化。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.MainMenu/NMainMenu.cs` 的 `UpdateTimelineButtonBehavior()` 只在存在待揭示 Epoch、且没有 run 存档时禁用新旅程/多人/百科并启用时间线；它不会在普通 `_Ready()` 中自动打开时间线。`.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.GameOverScreen/NGameOverScreen.cs` 仅在本局发现 Epoch 时，把结算页的主菜单按钮路由到 Timeline；否则回普通主菜单。`NTimelineScreen.RefreshBackButton()` 在 `GetDiscoveredEpochCount()>0` 时禁用返回。当前终端对这个流程使用页面入口适配：普通启动不自动打开；真实待揭示项锁住返回、开局与百科入口，逐项揭示后恢复。标准旅程宿主预先揭示 Neow 会按原版 `QueueUnlocks()` 展开静默猎手节点；前端仅在铁甲战士已有原版对局记录后才把这个预置节点算作可揭示项，避免首局前锁死菜单。
- `.cache/source/MegaCrit.Sts2.Core.Timeline/EpochModel.cs` 从 `eras` 本地化表按具体 `EpochEra` 键读取名称与年份，`NEraColumn.Init()` 仍会绘制对应时代图标；`.cache/extracted/localization/zhs/eras.json` 仅包含 `PREHISTORIA0`、`SEEDS0` 等基准时代键，没有部分 `*1/*2` 变体的 `.name/.year`。这些列因此合法地没有文字标签。网页不加载原版时代图标；为避免空框误导，隐藏无标签列的标题边框与底色，同时保留列宽及节点位置。
- `SaveManager.GetRevealableEpochs()` 根据原版 Epoch 状态与 `GetTimelineExpansion()` 图可达性筛选揭示资格；`SaveManager.RevealEpoch()` 执行揭示。`NEpochInspectScreen` 揭示完成时才调用 `QueueUnlocks()`；网页没有原版 Timeline UI，所以运行时保留 `RevealEpoch()` 并补写每个 Epoch 的持久化解锁状态。Neow 初始化与静默猎手第一节点仍受网页标准存档策略约束：标准旅程启动前已揭示 Neow，而原版 `NeowEpoch.QueueUnlocks()` 会将 `SILENT1_EPOCH` 从 `ObtainedNoSlot` 展开为 `Obtained`。因此网页仅对这条宿主预置路径额外检查铁甲战士已有一局记录，避免标准开局初始化提前开放猎手；真实解锁仍以原版进度和 Epoch 状态为准。
- 原版百科入口是否可用由 `SaveManager.IsCompendiumAvailable()` 决定。`NCardLibraryGrid.InitialSorter` 按原版卡池、稀有度、ModelId 排列卡牌，发现/解锁分别来自 `Progress.DiscoveredCards` 和原版解锁池；`NRelicCollection.LoadRelics()`、`NPotionLab.LoadPotions()` 使用相应发现集合和原版类别。网页对应显示原版模型本地化、说明和进度状态，并提供文本筛选。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Bestiary/NBestiary.cs` 依已发现幕、敌人击败记录和 `ShouldShowInCompendium` 构造怪物条目；怪物名称、遭遇名和招式通过本机模型与原版本地化读取。`NGeneralStatsGrid` 与 `NRunHistory` 是统计、历史数据来源；网页使用原版进度统计和 `SaveManager` 历史存档，按原版入口条件隐藏未开放的 Bestiary/历史分区。
- 网页时间线按 EraPosition 网格保留原版节点高度；时代扩展关系继续用于原版可达性/解锁判定，但不绘制节点间连线。按用户提供的原版截图，仅在节点下方绘制横向时间轴和时代刻度。普通启动停留在开始菜单；真实待揭示项出现时，时间线入口保持可用，开始新旅程、百科和时间线返回按原版状态禁用，全部揭示后恢复。原版结束页的“主菜单/解锁”按钮过渡尚未单独做成网页画面。网页使用文字时代栏布局，不加载原版 Godot 场景、Epoch 肖像与粒子、卡牌/遗物/药水图像、Bestiary 版面或翻页/揭示动画。Run History 暂以对局摘要呈现，不复刻原版楼层地图、牌组/遗物图标和玩家选择交互。模型与进度状态来自本机原版输入，不因此宣称页面像素级或完整功能 1:1。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Timeline/NEpochSlot.cs` 的 `OnRelease()` 对 `Obtained` 状态直接调用 `RevealEpoch()`，立即持久化揭示并打开详情；`Complete` 状态点击只打开已揭示详情，`NotObtained` 正常点击不会改状态。新揭示会以 `wasRevealed=true` 进入 `NEpochInspectScreen.Open()`，再在 `UnlockAnimation()` 调用 `EpochModel.QueueUnlocks()` 并保存进度。网页点击资格由 `state == obtained && canReveal` 限定，点击后经 HTTP 桥发 `reveal <id>`，其他未获得节点没有揭示动作；文字版立即应用揭示及对应解锁状态，不复刻揭示动画。该点击行为与原版一致。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.PotionLab/NPotionLab.cs` 只载入 Common、Uncommon、Rare、Event 和 Token 五类；`NPotionLabCategory.LoadPotions()` 按传入稀有度精确筛选。`.cache/source/MegaCrit.Sts2.Core.Models.Potions/DeprecatedPotion.cs` 的稀有度是 `None`，而 `PotionRarityExtensions.ToLocString()` 明确对 `None` 抛出 `ArgumentOutOfRangeException`。因此百科药水列表同样只保留原版五个药水分类，不把内部/废弃药水送入本地化。`tests/timeline_compendium_smoke.py` 以隔离存档确认图鉴可打开、63 个可见药水都有原版稀有度文本，并验证待揭示节点点击路径、未获得节点拒绝揭示及揭示后静默猎手解锁；报告在 `.cache/timeline-compendium-smoke.json`。


## 本机原版药水点击使用依据

- `.cache/source/MegaCrit.Sts2.Core.Models/PotionModel.cs` 提供 `Title`、包含动态变量的 `DynamicDescription`、`Usage`、`TargetType`、`IsQueued` 与 `PassesCustomUsabilityCheck`；`PotionUsage` 枚举区分 `CombatOnly`、`AnyTime`、`Automatic` 和 `None`。网页药水槽显示原版名称和动态说明，是否可点击按这些运行时属性及玩家移除药水状态判断。
- `.cache/source/MegaCrit.Sts2.Core.GameActions/UsePotionAction.cs` 按药水槽位与可选目标执行原版 `UsePotionAction`，并调用药水原版 `IsValidTarget` 与使用流程。现有命令 `potion 槽位 [目标编号]` 已通过该动作队列执行；网页点击无目标药水提交槽位命令，指定敌人的药水则先选择药水再点敌人，最终规则仍由运行时原版对象校验。本次只接入文字按钮交互，不复刻原版药水图像、拖拽或动画。

## 本机原版休息处铁匠升级预览依据

- .cache/source/MegaCrit.Sts2.Core.Entities.RestSite/SmithRestSiteOption.cs 的铁匠行动以 CardSelectCmd.FromDeckForUpgrade() 请求升级牌；CardSelectorPrefs 为可取消且要求手动确认，只有选定并确认卡牌后才调用原版 CardCmd.Upgrade()。网页只有在确认预览后才提交对应选择。
- .cache/source/MegaCrit.Sts2.Core.Nodes.Screens.CardSelection/NDeckUpgradeSelectScreen.cs 为升级选牌提供原版“查看升级”切换；切换后 NCardGrid.IsShowingUpgrades 将候选卡片暂时显示成升级预览。点击单张候选牌时原版打开 NUpgradePreview，并要求确认或取消；多选则在选满后展示升级后的候选卡牌并确认。
- .cache/source/MegaCrit.Sts2.Core.Nodes.Cards/NCardGrid.cs 与 .cache/source/MegaCrit.Sts2.Core.Nodes.Cards.Holders/NGridCardHolder.cs 通过克隆候选 CardModel 并调用 UpgradeInternal() 生成预览；.cache/source/MegaCrit.Sts2.Core.Nodes.Cards/NCard.cs 的 ShowUpgradePreview() 调用 CardModel.GetDescriptionForUpgradePreview()，费用、卡名、动态描述和 HoverTips 来自克隆后的原版模型。网页快照也只克隆并升级副本；不改动牌组中的卡对象，确认后仍由原版铁匠回调升级。


## 本机原版真理石板升级结果依据

- `.cache/source/MegaCrit.Sts2.Core.Models.Events/TabletOfTruth.cs` 的 `LoseMaxHpAndUpgrade()` 从玩家当前牌组筛出 `IsUpgradable` 卡牌；前四次解读由事件自身 `Rng.NextItem(list)` 各随机取一张并调用原版 `CardCmd.Upgrade()`；第五次遍历当时仍可升级的牌逐张调用同一 API。随机结果由原版事件 RNG 与牌组决定，网页不重新抽选。
- `.cache/source/MegaCrit.Sts2.Core.Commands/CardCmd.cs` 的 `Upgrade()` 在升级牌实际位于牌组时，将该卡的 `ModelId` 追加到当前 `PlayerMapPointHistoryEntry.UpgradedCards`，再调用 `UpgradeInternal()` / `FinalizeUpgradeInternal()`。原版 `.cache/source/MegaCrit.Sts2.Core.Nodes.HoverTips/NMapPointHistoryHoverTip.cs` 也使用这份历史列出升级卡牌名称。
- `runtime/Main.cs` 在事件选项由原版执行并结算后，按 `UpgradedCards` 游标读取新增记录，通过原版 `ModelDb` 标题发出“升级了 卡名”；网页沿用事件结果区域展示。它只显示原版历史确认的牌名，不显示推测的升级内容，也不表示升级调用路径或事件 UI 完整 1:1。
