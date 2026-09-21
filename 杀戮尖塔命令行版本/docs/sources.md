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
- 原版 `NEventRoom.SetDescription()` 仅在说明 `LocString.Exists()` 时设置说明控件；缺少该 key 时原版界面留空。提供的 `zhs/ancients.json` 与 `eng/ancients.json` 均没有 `NEOW.pages.INITIAL.description`。终端快照沿用此行为；方括号形式的“原版文本未提供”是宿主原先对缺失 key 的诊断格式，不是原版剧情文本。

## 本机原版怪物状态文本依据

- `.cache/source/MegaCrit.Sts2.Core.Models/PowerModel.cs` 的 `HoverTips` 用 `SmartDescription`（缺省时用 `Description`），并加入 `Amount`、`DynamicVars`、施加者、目标和拥有者等原版变量后格式化说明；`GetDumbHoverTip()` 是不含智能动态说明的原版回退。
- PowerType 定义将状态分类为 Buff 与 Debuff；终端只据此标注增益/减益类别，不自行推断持续时间。
- `.cache/extracted/localization/zhs/powers.json` 提供本机提取的中文 Power 文本。例如 `VULNERABLE_POWER.smartDescription` 把 `Amount` 写为回合数，`STRENGTH_POWER.smartDescription` 将 `Amount` 写为攻击伤害变化。终端通过原版 `PowerModel.HoverTips` 格式化显示，不把其他 Power 的 `Amount` 一概解释成回合。
- `runtime/Main.cs` 将原版标题、`PowerType` 和已格式化说明写入状态快照；网页仅负责排版。缺少动态说明的个别 Power 仍以原版 `Description` 回退，其运行时覆盖需要另行验证。

## 本机原版测试击杀流程依据

- `.cache/source/MegaCrit.Sts2.Core.Commands/CreatureCmd.cs` 的 `Kill(Creature, bool force)` 委托到集合重载。内部击杀会触发 `Hook.BeforeDeath`、`Hook.AfterDeath`、死亡状态/敌人移除/死亡后 Power 清理，并在主敌人死亡且队友全为次级敌人时继续处理队友；`force:true` 会跳过 `Hook.ShouldDie` 的死亡阻止判断。
- `.cache/source/MegaCrit.Sts2.Core.Combat/CombatManager.cs` 的 `CheckWinCondition()` 在战斗进入 `IsEnding` 时调用 `EndCombatInternal()`；后者调用 `Hook.AfterCombatEnd`、房间结束处理、`Hook.AfterCombatVictory`、进度保存和 `CombatWon` 事件。现有终端在 `CombatWon` 上调用房间原版奖励生成。
- `runtime/Main.cs` 的 `__test_kill` 仅在 `SPIRECLI_ENABLE_TEST_HOOKS=1` 时注册，用原版击杀及胜利检查来推进流程；它不会构造卡牌攻击或模拟伤害、格挡与伤害触发器。可证明的是适配路径直接复用这些原版死亡/战斗结束 API，不能由此证明战斗过程完整或 1:1。

## 本机原版房间选项与可取消选牌依据

- `.cache/source/MegaCrit.Sts2.Core.Entities.RestSite/RestSiteOption.cs` 的 `Generate()` 建立本地选项并调用 `Hook.ModifyRestSiteOptions()`；选项可用性来自各自的 `IsEnabled`。
- `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/RestSiteSynchronizer.cs` 的 `ChooseOption()` 只有在 `OnSelect()` 返回成功时才记录休息选择并移除已选项或清空剩余项；取消选牌会返回 `false`，原选项继续保留。`.cache/source/MegaCrit.Sts2.Core.Entities.RestSite/SmithRestSiteOption.cs` 和 `CookRestSiteOption.cs` 都将原版 `CardSelectorPrefs.Cancelable` 及 `RequireManualConfirmation` 设为 `true`，空选牌时返回 `false`。
- `.cache/source/MegaCrit.Sts2.Core.Entities.Merchant/MerchantCardRemovalEntry.cs` 将 `cancelable:true` 传给 `OneOffSynchronizer.DoLocalMerchantCardRemoval()`；`.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/OneOffSynchronizer.cs` 的原版选牌偏好允许取消，并且仅当返回了卡牌后才扣金币并移除卡牌。`.cache/source/MegaCrit.Sts2.Core.Rewards/CardRemovalReward.cs` 调用 `RewardSynchronizer.DoUnsyncedCardRemoval()`；该同步器也设为可取消，只有选到卡牌才移除。
- `runtime/Main.cs` 只在这些原版可取消的休息处/商店/移除奖励选牌上下文中接受 `back`，并向原版 selector 返回空选择；其它强制选牌仍拒绝 `back`。`tests/room_flow_smoke.py` 用固定种子实测取消铁匠和商店移除后房间选项保留、可继续旅程且金币未减少。
- `.cache/source/MegaCrit.Sts2.Core.Nodes.Rooms/NRestSiteRoom.cs` 在 TestMode 下由 `Create()` 返回 `null`；网页显示的是 `RestSiteRoom.Options` 和原版描述，不复刻营火场景动画。`.cache/source/MegaCrit.Sts2.Core.Nodes.Screens.Map/NMapScreen.cs` 的 `SetTravelEnabled()` 还要通过 `Hook.ShouldProceedToNextMapPoint()`；适配快照 `canLeave` 用于禁用尚不可执行的网页路线入口。
- 网页选择行、快速动作和路线按钮只会填入 `choose`、`take`、`buy`、`skip`、`back` 或 `move` 命令；执行仍需通过终端命令框提交。该交互改良属于输入方式，不增加游戏内选项或绕过原版同步器。

## 本机原版事件结算与离房提示依据

- `.cache/source/MegaCrit.Sts2.Core.Models/EventModel.cs` 的 `SetEventState()` 在当前选项列表为空时将事件标记为已完成；此状态变更可以发生在事件选项回调执行期间。
- `.cache/source/MegaCrit.Sts2.Core.Multiplayer.Game/EventSynchronizer.cs` 将 `EventOption.Chosen()` 加入待处理任务；`AwaitPendingOptionTasks()` 等这些任务结束。`.cache/source/MegaCrit.Sts2.Core.Rooms/EventRoom.cs` 在退出事件房间前也会等待待处理选项任务。
- 终端的事件路线提示和文字地图按 `CanLeave()` 判断是否可移动；该判断同时检查房间结束状态、原版动作结算、待处理选择、战斗状态和 `Hook.ShouldProceedToNextMapPoint()`。事件动作仍在结算时只显示路线预览。

## 已锁定的版本

用户指定 Build `23811903`。

- [官方 Steam 公告：Major Update #2 - v0.107.1](https://steamcommunity.com/games/2868840/announcements/detail/710026912607505281)：已确认标题；本次网页读取未返回公告正文。
- [SteamDB 补丁索引](https://steamdb.info/patchnotes/23811903/)及[分支索引](https://steamdb.info/app/2868840/depots/)将此 Build 对应到 `v0.107.1` / `public`。SteamDB 是第三方，仅用于版本定位，不作为独立的官方玩法证据。
- 第三方转载的公告提示该版涉及随机数算法和战士卡牌调整；这些细节需以官方公告正文或对应游戏文件核实后才可进入实现。
