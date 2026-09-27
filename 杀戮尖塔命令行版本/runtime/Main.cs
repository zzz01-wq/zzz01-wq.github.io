using Godot;
using MegaCrit.Sts2.Core.Helpers;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.TestSupport;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Characters;
using MegaCrit.Sts2.Core.Saves;
using MegaCrit.Sts2.Core.Saves.Runs;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Entities.TreasureRelicPicking;
using MegaCrit.Sts2.Core.Entities.Potions;
using MegaCrit.Sts2.Core.Entities.CardRewardAlternatives;
using MegaCrit.Sts2.Core.Entities.Merchant;
using MegaCrit.Sts2.Core.Entities.RestSite;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Rooms;
using MegaCrit.Sts2.Core.Rewards;
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Unlocks;
using MegaCrit.Sts2.Core.Hooks;
using MegaCrit.Sts2.Core.Random;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Timeline;
using MegaCrit.Sts2.Core.Timeline.Epochs;

public partial class Main : Node, ICardSelector
{
    private RunState? run;
    private Player? player;
    private Task? operation;
    private readonly List<string> messages = [];
    private readonly List<Task> background = [];
    private readonly Queue<PendingChoice> pendingChoices = new();
    private readonly Stack<(RewardsSet set, TaskCompletionSource done)> rewardStack = new();
    private bool messageError;
    private bool referencePackMounted;
    private CardReward? rewardCard;
    private TaskCompletionSource? rewardStageChoice;
    private bool rewardSelectionPending;
    private int rewardSelectionIndex;
    private bool cardSelectionCancelable;
    private bool restDone, treasureOpened, treasurePicking, treasureDone, gameWon;
    // The original map vote action only records the vote. The follow-up
    // MoveToMapCoordAction starts RunManager.EnterMapCoord through an
    // untracked TaskHelper task, so its GameAction can finish while the run
    // is still sitting in MapRoom. Keep the target until the room itself has
    // entered; otherwise the web client can receive one last map snapshot and
    // cover a freshly entered event or rest site with the route overlay.
    private MapCoord? pendingMapMoveDestination;
    private AbstractRoom? pendingMapMoveSourceRoom;
    private bool treasureAwardHandlerAttached;
    // Event transformations are recorded by the original CardCmd in the
    // current map-point history. Keep a cursor so the terminal can report the
    // exact original -> final card after the original event task settles.
    private PlayerMapPointHistoryEntry? observedEventHistoryEntry;
    private int reportedEventTransformCount;
    private string seed = "";
    private bool failed;
    private bool TestHooksEnabled => System.Environment.GetEnvironmentVariable("SPIRECLI_ENABLE_TEST_HOOKS") == "1";
    private static RunManager RM => RunManager.Instance;
    private static CombatManager CM => CombatManager.Instance;
    private List<Creature> Enemies
    {
        get
        {
            // During room entry the original CombatManager owns the authoritative
            // state before the local Player reference is fully repopulated. This is
            // especially visible for Boss rooms, whose first snapshot can otherwise
            // contain no enemies even though the original combat has started.
            ICombatState? combatState = CM.DebugOnlyGetState() ?? player?.Creature.CombatState;
            return combatState?.Enemies.Where(e => e is not null && e.IsAlive).ToList() ?? [];
        }
    }
    private RewardsSet? Rewards => rewardStack.TryPeek(out var x) ? x.set : null;
    private bool Playing => CM.IsInProgress && player?.PlayerCombatState?.Phase == PlayerTurnPhase.Play;
    private bool Busy => operation is { IsCompleted: false } || background.Any(t => !t.IsCompleted) || EngineBusy;
    private PendingChoice? CurrentChoice => pendingChoices.Count == 0 ? null : pendingChoices.Peek();
    private bool Choosing => CurrentChoice != null || Rewards != null || rewardCard != null;
    private bool Dead => player?.Creature.IsDead == true;
    private bool Won => gameWon || (Dead && run?.CurrentRoom?.IsVictoryRoom == true);
    private bool EngineBusy => run != null && (!RM.ActionQueueSet.IsEmpty || RM.ActionExecutor.IsRunning);

    public override async void _Ready()
    {
        try
        {
            TestMode.IsOn = true;
            if(System.Environment.GetEnvironmentVariable("SPIRECLI_EPHEMERAL_SAVES")!="1")
            {
                string saveDir=System.Environment.GetEnvironmentVariable("SPIRECLI_SAVE_DIR")??"user://terminal-save";
                bool userDataPath=saveDir.StartsWith("user://",StringComparison.Ordinal);
                bool isolatedTestPath=saveDir.StartsWith("res://.cache/spirecli-",StringComparison.Ordinal);
                if(!userDataPath&&!isolatedTestPath) throw new InvalidOperationException("SPIRECLI_SAVE_DIR must use user:// or the isolated res://.cache/spirecli- test directory.");
                SaveManager.MockInstanceForTesting(new SaveManager(new GodotFileIo(saveDir)));
            }
            SaveManager.Instance.InitSettingsDataForTest();
            SaveManager.Instance.SettingsSave.Language = "zhs";
            await MegaCrit.Sts2.Core.Modding.ModManager.Initialize(null!, null, null);
            LocManager.Initialize();
            ModelDb.Init(); ModelIdSerializationCache.Init(); ModelDb.InitIds(); ActionTypes.Initialize();
            SaveManager.Instance.InitProfileId(1);
            SaveManager.Instance.InitPrefsDataForTest(); SaveManager.Instance.InitProgressData();
            MegaCrit.Sts2.Core.Logging.Logger.GlobalLogLevel = LogLevel.Warn;
            CardSelectCmd.PushSelector(this);
            ChoiceAdapters.Attach(this);
            RewardsSet.testSelector = OfferRewards;
            CM.CombatWon += room => { if (room.Encounter.ShouldGiveRewards) Track(room.OfferRoomEndRewards()); };
            Publish();
            while (true)
            {
                string? input = await Task.Run(System.Console.ReadLine);
                if (input == null) break;
                messages.Clear();
                messageError = false;
                try
                {
                    await Dispatch(input.Trim());
                    await Settle();
                }
                catch (CommandError ex) { messageError = true; Say(ex.Message); }
                catch (Exception ex)
                {
                    messageError = true;
                    bool readOnly = IsReadOnly(input);
                    if(!readOnly) failed = true;
                    System.Console.Error.WriteLine(ex);
                    Say(readOnly
                        ? "只读查询失败，旅程状态未推进；可以继续输入其他命令。\n" + ex.GetBaseException().Message
                        : "原版接口适配发生错误，已停止推进以避免损坏状态。可输入 new ironclad 重开。\n" + ex.GetBaseException().Message);
                }
                Publish();
            }
        }
        catch (Exception ex) { System.Console.Error.WriteLine(ex); messageError = true; Say("初始化失败：" + ex.GetBaseException().Message); Publish(); }
        GetTree().Quit();
    }

    public override void _ExitTree() => ChoiceAdapters.Detach(this);

    private void MountReferencePack()
    {
        if(referencePackMounted) return;
        string packPath=System.Environment.GetEnvironmentVariable("SPIRECLI_GAME_PCK")??
            Path.GetFullPath(Path.Combine(ProjectSettings.GlobalizePath("res://"),"..","reference","SlayTheSpire2.pck"));
        if(!File.Exists(packPath)) throw new FileNotFoundException("找不到原版游戏资源包。可设置 SPIRECLI_GAME_PCK 指向提供的 SlayTheSpire2.pck。",packPath);
        if(!ProjectSettings.LoadResourcePack(packPath,replaceFiles:false))
            throw new InvalidOperationException("Godot 无法挂载提供的原版 SlayTheSpire2.pck。");
        referencePackMounted=true;
    }

    private void Track(Task task) => background.Add(task);
    private void Start(Task task) { operation = task; }
    private async Task Settle()
    {
        for (int i = 0; i < 600; i++)
        {
            await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
            if (operation?.IsFaulted == true)
            {
                pendingMapMoveDestination = null;
                pendingMapMoveSourceRoom = null;
                await operation;
            }
            foreach (var task in background.Where(t => t.IsFaulted).ToArray()) await task;
            background.RemoveAll(t => t.IsCompleted);
            if (MapMoveTransitionPending() || RestInitializationPending()) continue;
            // EventRoom.EnterInternal starts the original EventSynchronizer.BeginEvent
            // task without awaiting it. Do not publish a room snapshot while that
            // task still owns an empty, unfinished EventModel; the web client would
            // otherwise see no choices and could reopen the map over the event.
            if (EventInitializationPending()) continue;
            if (Choosing || (!Busy && !EngineBusy && (!CM.IsInProgress || Playing || Dead)))
            {
                ReportEventCardChanges();
                return;
            }
        }
        throw new CommandError("仍在结算。输入 status 获取状态；不要重复上一条操作。");
    }

    private static bool EventInitializationPending(EventRoom eventRoom)
    {
        EventModel eventModel=eventRoom.LocalMutableEvent;
        return !eventModel.IsFinished && eventModel.CurrentOptions.Count==0;
    }

    private bool EventInitializationPending()
        => run?.CurrentRoom is EventRoom eventRoom && EventInitializationPending(eventRoom);

    private bool MapMoveTransitionPending()
    {
        if (!pendingMapMoveDestination.HasValue) return false;
        if (run == null
            || !run.CurrentMapCoord.HasValue
            || run.CurrentMapCoord.Value != pendingMapMoveDestination.Value
            || run.CurrentRoom is null
            || run.CurrentRoom == pendingMapMoveSourceRoom
            || run.CurrentRoom is MapRoom)
            return true;
        pendingMapMoveDestination = null;
        pendingMapMoveSourceRoom = null;
        return false;
    }

    private bool RestInitializationPending()
        => run?.CurrentRoom is RestSiteRoom restSite
            && !restDone
            && restSite.Options.Count == 0;

    private async Task Dispatch(string input)
    {
        string[] a = input.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (a.Length == 0) return;
        string cmd = a[0].ToLowerInvariant();
        if (cmd is "help" or "帮助")
        {
            Say(TestHooksEnabled
                ? Help + "\n测试模式（SPIRECLI_ENABLE_TEST_HOOKS=1）：__test_kill [敌人编号|all]（无参数时击杀全部存活敌人）"
                : Help);
            return;
        }
        if (cmd is "status" or "状态" or "look") { Describe(); return; }
        if (cmd == "clear") return;
        if (cmd == "new")
        {
            if (a.Length < 2 || a[1].ToLowerInvariant() != "ironclad") throw new CommandError("用法：new ironclad [种子] [进阶0–10]");
            int asc=0;
            if(a.Length>3&&!int.TryParse(a[3],out asc)) throw new CommandError("进阶必须是 0–10 之间的整数。");
            if (a.Length > 4 || asc < 0 || asc > 10) throw new CommandError("用法：new ironclad [种子] [进阶0–10]");
            if (run != null && !failed && !Dead && !gameWon) throw new CommandError("已有进行中的旅程。输入 abandon 放弃后再开始。");
            if (run == null && SaveManager.Instance.HasRunSave) throw new CommandError("检测到可继续的存档。输入 continue 恢复，或 abandon 删除存档后重新开始。");
            if (run != null) SaveManager.Instance.DeleteCurrentRun();
            Start(NewRun(a.Length > 2 ? a[2] : SeedHelper.GetRandomSeed(), asc)); return;
        }
        if(cmd=="continue")
        {
            if(a.Length!=1) throw new CommandError("用法：continue");
            if(run!=null) throw new CommandError("当前已有旅程，不能继续另一份存档。");
            if(!SaveManager.Instance.HasRunSave) throw new CommandError("没有可继续的存档。输入 new ironclad 开始。");
            Start(ContinueSavedRun()); return;
        }
        if(cmd=="abandon")
        {
            if(run!=null) ResetRunState();
            SaveManager.Instance.DeleteCurrentRun();
            Say("已放弃本次旅程并删除存档。输入 new ironclad 开始，或 continue 恢复现有存档。");
            return;
        }
        if (cmd == "cards") { Catalog(a.Length > 1 ? string.Join(' ', a.Skip(1)) : ""); return; }
        if (run == null || player == null) throw new CommandError("尚未开始。输入 new ironclad。");
        if (cmd is "hand" or "deck" or "discard" or "exhaust" or "draw")
        {
            var pile = cmd switch { "deck" => player.Deck, "hand" => player.PlayerCombatState?.Hand, "draw" => player.PlayerCombatState?.DrawPile, "discard" => player.PlayerCombatState?.DiscardPile, _ => player.PlayerCombatState?.ExhaustPile };
            if (pile == null) throw new CommandError("当前不在战斗中。");
            // Original draw-pile viewer does not reveal shuffle order.
            var cards = cmd == "draw" ? pile.Cards.OrderBy(c=>c.Title).ToList() : pile.Cards.ToList();
            Say(cmd == "draw" ? "抽牌堆（按名称排列，不显示抽牌顺序）" : cmd);
            ShowCards(cards); return;
        }
        if (cmd == "relics") { Say(string.Join('\n', player.Relics.Select((r,i)=>$"{i+1}. {Text(r.Title)} · {Text(r.DynamicDescription)}"))); return; }
        if (cmd == "potions") { ShowPotions(); return; }
        if (cmd == "map") { ShowMap(); return; }
        if (cmd == "inspect") { Inspect(a); return; }
        if (cmd.StartsWith("__test_",StringComparison.Ordinal))
        {
            if(!TestHooksEnabled) throw new CommandError("未知命令。输入 help 查看命令。");
            if(cmd=="__test_kill")
            {
                if(a.Length>2) throw new CommandError("用法：__test_kill [敌人编号|all]");
                if(Busy||Choosing) throw new CommandError("当前有原版动作或选择待处理，不能执行测试击杀。");
                if(!Playing||run.CurrentRoom is not CombatRoom) throw new CommandError("测试击杀只能在玩家出牌阶段的战斗中使用。");
                var aliveEnemies=Enemies;
                if(aliveEnemies.Count==0) throw new CommandError("当前战斗没有存活的敌人。");
                List<Creature> targets;
                if(a.Length==1||a[1].Equals("all",StringComparison.OrdinalIgnoreCase)) targets=aliveEnemies;
                else targets=[aliveEnemies[Index(a,1,aliveEnemies.Count)]];
                Start(TestKillEnemies(targets)); return;
            }
            if(cmd=="__test_select")
            {
                if(a.Length!=2) throw new CommandError("测试入口用法错误。");
                Start(TestSelectCards(a[1])); return;
            }
            if(cmd=="__test_nested") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestNestedCards()); return; }
            if(cmd=="__test_bundle") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestBundleChoice()); return; }
            if(cmd=="__test_relic") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestRelicChoice()); return; }
            if(cmd=="__test_enter_act")
            {
                if(a.Length!=2||!int.TryParse(a[1],out int actNumber)||actNumber<2||actNumber>run!.Acts.Count)
                    throw new CommandError("测试入口用法：__test_enter_act 幕编号（2–3）。");
                Start(TestEnterAct(actNumber-1)); return;
            }
            if(cmd=="__test_assert_ancient")
            {
                if(a.Length!=1) throw new CommandError("测试入口用法错误。");
                AssertCurrentActAncient(); return;
            }
            throw new CommandError("未知命令。输入 help 查看命令。");
        }
        if (failed || Dead || gameWon) throw new CommandError("旅程已结束。输入 new ironclad 开始下一次。");
        if (CurrentChoice is { } currentChoice)
        {
            ResolveQueuedChoice(currentChoice, cmd, a);
            return;
        }
        if (rewardCard != null)
        {
            if (cmd is not ("choose" or "skip" or "back"))
                throw new CommandError(rewardStageChoice == null
                    ? "选择奖励卡：choose 编号；skip 跳过；back 返回奖励列表。"
                    : "当前奖励效果要求继续选择：choose 编号 或 skip。");
            if (cmd == "back")
            {
                if (rewardStageChoice != null) throw new CommandError("奖励效果正在等待选择，不能返回奖励列表。");
                rewardCard = null;
                return;
            }

            CardReward selected = rewardCard;
            List<CardModel> cards = selected.Cards.ToList();
            IReadOnlyList<CardRewardAlternative> alternatives = CardRewardAlternative.Generate(selected);
            int pickedIndex;
            if (cmd == "skip")
            {
                int skipIndex = alternatives.ToList().FindIndex(option => option.OptionId.Equals("Skip", StringComparison.OrdinalIgnoreCase));
                if (skipIndex < 0) throw new CommandError("这次奖励不可跳过。");
                pickedIndex = cards.Count + skipIndex;
            }
            else
            {
                if (a.Length != 2) throw new CommandError("请选择一个奖励编号：choose 编号。");
                pickedIndex = Index(a, 1, cards.Count + alternatives.Count);
            }
            SubmitRewardSelection(selected, pickedIndex);
            return;
        }
        if (Rewards != null)
        {
            if (cmd == "skip")
            {
                if(Rewards.DisallowSkipping) throw new CommandError("这组奖励不可跳过。");
                RM.RewardsSetSynchronizer.SkipLocalRewardsSet(); CompleteRewardSet(); return;
            }
            if(cmd is not ("take" or "choose")) throw new CommandError("领取奖励：take 编号；skip 放弃剩余奖励。");
            var list=Rewards.Rewards.Where(r=>!r.SuccessfullySelected).ToList(); var reward=list[Index(a,1,list.Count)];
            if(reward is CardReward cr) {rewardCard=cr; ShowRewardCardChoices(cr);}
            else Start(TakeReward(reward));
            return;
        }
        if (Busy) throw new CommandError("正在结算，请输入 status 查看。");
        switch(cmd)
        {
            case "play":
                if(!Playing) throw new CommandError("当前不能出牌。");
                var hand=player.PlayerCombatState!.Hand.Cards;
                var card=hand[Index(a,1,hand.Count)];
                if(!card.CanPlay(out var reason,out _)) throw new CommandError(reason==UnplayableReason.None?"此牌当前不可打出。":"无法打出此牌："+reason+"。");
                bool needsTarget=card.TargetType is TargetType.AnyEnemy or TargetType.AnyAlly;
                if((needsTarget&&a.Length!=3)||(!needsTarget&&a.Length!=2))
                    throw new CommandError(needsTarget?"此牌需要且只接受一个目标编号。":"此牌不接受额外目标参数。");
                var target=CardTarget(card.TargetType,a,2);
                if(!card.IsValidTarget(target)) throw new CommandError(CardTargetError(card.TargetType));
                Start(Enqueue(new PlayCardAction(card,target))); break;
            case "end":
                if(!Playing) throw new CommandError("当前不能结束回合。");
                Start(Enqueue(new EndPlayerTurnAction(player,player.PlayerCombatState!.TurnNumber))); break;
            case "choose":
                if(run.CurrentRoom is EventRoom er)
                {
                    var ev=er.LocalMutableEvent; int index=Index(a,1,ev.CurrentOptions.Count); var option=ev.CurrentOptions[index];
                    if(option.IsLocked) throw new CommandError("此选项不可用。");
                    RM.EventSynchronizer.ChooseLocalOption(index);
                    Start(RM.EventSynchronizer.AwaitPendingOptionTasks());
                }
                else if(run.CurrentRoom is RestSiteRoom rest)
                {
                    if(rest.Options.Count==0) throw new CommandError("休息处已没有可选行动。");
                    int idx=Index(a,1,rest.Options.Count);
                    if(!rest.Options[idx].IsEnabled) throw new CommandError("该选项不可用。");
                    Start(ChooseRest(idx));
                }
                else if(run.CurrentRoom is TreasureRoom)
                {
                    if(!treasureOpened||treasurePicking) throw new CommandError("请先输入 open 开启宝箱，或等待当前选择完成。");
                    var relics=RM.TreasureRoomRelicSynchronizer.CurrentRelics;
                    if(treasureDone||relics==null||relics.Count==0) throw new CommandError("宝箱遗物已处理。");
                    treasurePicking=true;
                    Start(ChooseTreasureRelic(Index(a,1,relics.Count)));
                }
                else throw new CommandError("当前没有可选择的选项。");
                break;
            case "skip":
                if(run.CurrentRoom is TreasureRoom && treasureOpened && !treasurePicking && !treasureDone)
                {
                    if(RM.TreasureRoomRelicSynchronizer.CurrentRelics==null) throw new CommandError("宝箱遗物已处理。");
                    treasurePicking=true;
                    Start(ChooseTreasureRelic(null));
                }
                else throw new CommandError("当前没有可跳过的奖励。"); break;
            case "open":
                if(run.CurrentRoom is not TreasureRoom treasure) throw new CommandError("当前不在宝箱房间。");
                if(treasureOpened) throw new CommandError("宝箱已经开启。");
                Start(OpenTreasure(treasure)); break;
            case "move":
                if(!CanLeave()) throw new CommandError("请先完成当前房间的战斗或选择。");
                var next=NextPoints(); var point=next[Index(a,1,next.Count)];
                if(point.PointType is MapPointType.Ancient or MapPointType.Unknown) MountReferencePack();
                restDone=false;treasureOpened=false;treasurePicking=false;treasureDone=false;
                pendingMapMoveDestination = point.coord;
                pendingMapMoveSourceRoom = run.CurrentRoom;
                Start(Enqueue(new VoteForMapCoordAction(player,run.MapLocation,new MapVote {coord=point.coord,mapGenerationCount=RM.MapSelectionSynchronizer.MapGenerationCount}))); break;
            case "proceed":
                if(!CanLeave()) throw new CommandError("当前房间尚未结束。");
                if((run.CurrentRoom is CombatRoom {RoomType:RoomType.Boss} && NextPoints().Count==0) || run.CurrentRoom!.IsVictoryRoom)
                {
                    Start(RM.EnterNextAct());
                }
                else {await RM.ProceedFromTerminalRewardsScreen();ShowMap();} break;
            case "shop": ShowShop(); break;
            case "buy":
                if(run.CurrentRoom is not MerchantRoom mr) throw new CommandError("当前不在商店。");
                var inv=mr.GetLocalInventory(); RefreshHeadlessMerchantInventory(inv); var entries=inv.AllEntries.ToList();
                var entry=entries[Index(a,1,entries.Count)];
                if(!entry.IsStocked||!entry.EnoughGold) throw new CommandError("商品已售罄或金币不足。");
                Start(Buy(entry,inv)); break;
            case "potion":
                int slot=Index(a,1,player.MaxPotionCount); var potion=player.GetPotionAtSlotIndex(slot);
                if(potion==null) throw new CommandError("该药水槽为空。");
                if(!player.CanRemovePotions||potion.IsQueued||!potion.PassesCustomUsabilityCheck)
                    throw new CommandError("该药水当前不可使用。");
                if(potion.Usage==PotionUsage.Automatic) throw new CommandError("该药水由原版规则自动触发，不能手动使用。");
                if(potion.Usage==PotionUsage.None) throw new CommandError("原版将该药水标记为不可用。");
                if(potion.Usage==PotionUsage.CombatOnly&&(!CM.IsInProgress||!player.Creature.IsAlive||player.Creature.CombatState?.CurrentSide!=player.Creature.Side||CM.PlayerActionsDisabled))
                    throw new CommandError("该药水只能在原版允许使用药水的战斗阶段使用。");
                bool potionNeedsTarget=potion.TargetType is TargetType.AnyEnemy or TargetType.AnyAlly;
                if((potionNeedsTarget&&a.Length!=3)||(!potionNeedsTarget&&a.Length!=2))
                    throw new CommandError(potionNeedsTarget?"该药水需要且只接受一个目标编号。":"该药水不接受额外目标参数。");
                var pt=PotionTarget(potion.TargetType,a,2);
                if(!potion.IsValidTarget(pt)) throw new CommandError("药水目标无效。");
                Start(Enqueue(new UsePotionAction(potion,pt,CM.IsInProgress))); break;
            case "discard-potion":
                var dp=player.GetPotionAtSlotIndex(Index(a,1,player.MaxPotionCount));
                if(dp==null) throw new CommandError("该药水槽为空。");
                if(a.Length!=2) throw new CommandError("用法：discard-potion 槽位。");
                if(!player.CanRemovePotions||dp.IsQueued) throw new CommandError("该药水当前不可丢弃。");
                Start(Enqueue(new DiscardPotionGameAction(player, (uint)player.GetPotionSlotIndex(dp), CM.IsInProgress))); break;
            default: throw new CommandError("未知命令。输入 help 查看命令。");
        }
    }

    private async Task NewRun(string chosenSeed,int asc)
    {
        ResetRunState();
        seed=chosenSeed;
        // The terminal skips the original Timeline UI; use its normal Neow-ready standard profile.
        if(!SaveManager.Instance.IsEpochRevealed<NeowEpoch>())
        {
            SaveManager.Instance.ObtainEpochOverride(EpochModel.GetId<NeowEpoch>(),EpochState.Revealed);
            SaveManager.Instance.SaveProgressFile();
        }
        var unlocks=SaveManager.Instance.GenerateUnlockStateFromProgress();
        int maxAscension=SaveManager.Instance.Progress.GetOrCreateCharacterStats(ModelDb.Character<Ironclad>().Id).MaxAscension;
        int acceptedAscension=Math.Min(asc,maxAscension);
        if(acceptedAscension!=asc) Say($"原版角色选择会将进阶限制为已解锁的 {acceptedAscension}。" );
        asc=acceptedAscension;
        player=Player.CreateForNewRun<Ironclad>(unlocks,1);
        // Same seed stream as StartRunLobby; other profile unlock restrictions remain in effect.
        var acts=ActModel.GetRandomList(new Rng((uint)StringHelper.GetDeterministicHashCode(seed), "act_selection"),unlocks,false).Select(a=>a.ToMutable()).ToArray();
        run=RunState.CreateForNewRun([player],acts,[],GameMode.Standard,asc,seed);
        RM.SetUpNewSingleplayer(run,true);
        if(run.ExtraFields.StartedWithNeow) MountReferencePack();
        AttachTreasureAwardHandler();
        await RM.FinalizeStartingRelics();RM.Launch();
        await RM.EnterAct(0,doTransition:false);
        Say($"战士 · 种子 {seed} · 进阶 {asc}\n{Text(run.Act.Title)}，旅程开始。");
    }

    private async Task TestEnterAct(int actIndex)
    {
        if(Busy||Choosing||CM.IsInProgress||!CanLeave()) throw new CommandError("请在当前房间已完成且没有待处理动作时运行此测试入口。");
        await RM.EnterAct(actIndex,doTransition:false);
        if(run==null||run.CurrentActIndex!=actIndex||run.CurrentRoom is not MapRoom)
            throw new InvalidOperationException("原版 EnterAct 未将后续幕放在地图房间。");
        if(run.Map.StartingMapPoint.PointType!=MapPointType.Ancient)
            throw new InvalidOperationException("原版后续幕地图起点不是 Ancient。");
        var startPoints=NextPoints();
        if(startPoints.Count!=1||startPoints[0].coord!=run.Map.StartingMapPoint.coord)
            throw new InvalidOperationException("终端没有将后续幕 Ancient 起点暴露为唯一首条路线。");
        Say($"测试断言通过：第 {actIndex+1} 幕地图开放 Ancient 起点，请用 move 1 进入。");
    }

    private async Task TestKillEnemies(IReadOnlyList<Creature> targets)
    {
        var killedNames=new List<string>();
        foreach(var enemy in targets)
        {
            if(!enemy.IsAlive) continue;
            killedNames.Add(enemy.Name);
            await CreatureCmd.Kill(enemy,force:true);
        }
        if(CM.IsInProgress) await CM.CheckWinCondition();
        if(killedNames.Count==0) Say("测试击杀没有找到仍存活的目标。");
        else Say($"测试击杀：{string.Join("、",killedNames)}。已调用原版死亡处理并检查战斗结束条件。");
    }

    private void AssertCurrentActAncient()
    {
        if(run?.CurrentRoom is not EventRoom eventRoom
            || eventRoom.LocalMutableEvent is not AncientEventModel ancient
            || !ancient.Id.Equals(run.Act.Ancient.Id))
            throw new InvalidOperationException("当前事件与原版本幕预生成 Ancient 不一致。");
        string selection = run.CurrentActIndex == 0 ? "固定" : "随机预选";
        Say($"测试断言通过：已进入本幕{selection} Ancient {ancient.Id.Entry}。");
    }

    private async Task ContinueSavedRun()
    {
        var loaded=SaveManager.Instance.LoadRunSave();
        if(!loaded.Success||loaded.SaveData==null) throw new CommandError($"原版存档无法读取：{loaded.Status} {loaded.ErrorMessage}");
        ResetRunState();
        var restored=RunState.FromSerializable(loaded.SaveData);
        run=restored;
        player=restored.Players.FirstOrDefault()??throw new CommandError("存档中没有玩家。");
        seed=restored.Rng.StringSeed;
        if(restored.CurrentRoom is EventRoom||restored.CurrentMapPoint?.PointType is MapPointType.Ancient or MapPointType.Unknown)
            MountReferencePack();
        await RM.SetUpSavedSingleplayer(restored,loaded.SaveData);
        AttachTreasureAwardHandler();
        RM.Launch();
        await RM.GenerateMap();
        await RM.LoadIntoLatestMapCoord(AbstractRoom.FromSerializable(loaded.SaveData.PreFinishedRoom,restored));
        Say($"已恢复战士旅程 · 种子 {seed} · 进阶 {restored.AscensionLevel}。");
    }

    private void AttachTreasureAwardHandler()
    {
        if(treasureAwardHandlerAttached) return;
        RM.TreasureRoomRelicSynchronizer.RelicsAwarded+=HandleTreasureRelicsAwarded;
        treasureAwardHandlerAttached=true;
    }

    private void ResetRunState()
    {
        while(pendingChoices.Count>0) pendingChoices.Dequeue().Cancel();
        rewardCard=null;
        rewardStageChoice?.TrySetCanceled();
        rewardStageChoice=null;
        rewardSelectionPending=false;
        rewardSelectionIndex=0;
        cardSelectionCancelable=false;
        while(rewardStack.TryPop(out var pendingReward)) pendingReward.done.TrySetCanceled();
        if(operation!=null) ObserveFault(operation);
        foreach(var task in background) ObserveFault(task);
        if(treasureAwardHandlerAttached)
        {
            RM.TreasureRoomRelicSynchronizer.RelicsAwarded-=HandleTreasureRelicsAwarded;
            treasureAwardHandlerAttached=false;
        }
        if(run!=null) RM.CleanUp();
        run=null;
        player=null;
        operation=null;
        background.Clear();
        failed=false;
        gameWon=false;
        restDone=false;
        treasureOpened=false;
        treasurePicking=false;
        treasureDone=false;
        pendingMapMoveDestination=null;
        pendingMapMoveSourceRoom=null;
        observedEventHistoryEntry=null;
        reportedEventTransformCount=0;
        seed="";
    }

    private static void ObserveFault(Task task)
    {
        _=task.ContinueWith(completed=>{_=completed.Exception;},TaskContinuationOptions.OnlyOnFaulted);
    }

    private async Task Enqueue(GameAction action)
    {
        RM.ActionQueueSynchronizer.RequestEnqueue(action);
        await action.CompletionTask;
        if(action.Exception!=null) throw action.Exception;
    }
    private Task OfferRewards(RewardsSet set)
    {
        var done=new TaskCompletionSource();rewardStack.Push((set,done));return done.Task;
    }
    private async Task TakeReward(Reward reward)
    {
        bool previousCancelable=cardSelectionCancelable;
        cardSelectionCancelable=reward is CardRemovalReward;
        bool ok;
        try { ok=await RM.RewardsSetSynchronizer.SelectLocalReward(reward); }
        finally { cardSelectionCancelable=previousCancelable; }
        if(!ok) Say("未领取该奖励，请检查药水槽等条件。");
        CompleteRewardSet();
    }
    private void CompleteRewardSet()
    {
        if(Rewards!=null&&RM.RewardsSetSynchronizer.IsRewardsSetCompleted(Rewards)) {var done=rewardStack.Pop();done.done.SetResult();}
    }
    private async Task ChooseRest(int idx)
    {
        if(run?.CurrentRoom is not RestSiteRoom restSite||idx<0||idx>=restSite.Options.Count)
            throw new CommandError("休息处选项已变化，请重新查看当前状态。");
        bool previousCancelable=cardSelectionCancelable;
        cardSelectionCancelable=restSite.Options[idx] is SmithRestSiteOption or CookRestSiteOption;
        try
        {
            if(await RM.RestSiteSynchronizer.ChooseLocalOption(idx)) restDone=true;
        }
        finally { cardSelectionCancelable=previousCancelable; }
    }

    private async Task OpenTreasure(TreasureRoom room)
    {
        int gold=await room.DoNormalRewards();
        Say($"原版宝箱金币奖励：{gold}。");
        await room.DoExtraRewardsIfNeeded();
        treasureOpened=true;
        var relics=RM.TreasureRoomRelicSynchronizer.CurrentRelics;
        if(relics==null||relics.Count==0)
        {
            RM.TreasureRoomRelicSynchronizer.CompleteWithNoRelics();
            treasureDone=true;
            Say("宝箱没有可选遗物。");
        }
        else Say("宝箱附加奖励已完成，请从原版遗物中选择一件；也可 skip。");
    }

    private async Task ChooseTreasureRelic(int? index)
    {
        RM.TreasureRoomRelicSynchronizer.PickRelicLocally(index);
        for(int frame=0;frame<600&&EngineBusy;frame++)
            await ToSignal(GetTree(),SceneTree.SignalName.ProcessFrame);
        if(EngineBusy) throw new CommandError("遗物选择仍在结算，请输入 status 查看。");
        treasurePicking=false;
        treasureDone=true;
    }

    private void HandleTreasureRelicsAwarded(List<RelicPickingResult> results)
        => Track(ApplyTreasureRelicAwards(results));

    private async Task ApplyTreasureRelicAwards(List<RelicPickingResult> results)
    {
        List<Task> obtainTasks=[];
        foreach(RelicPickingResult result in results.OrderBy(result=>result.type))
        {
            RelicModel relic=result.relic.ToMutable();
            if(result.type!=RelicPickingResultType.Skipped&&result.player!=null)
                obtainTasks.Add(RelicCmd.Obtain(relic,result.player));
            foreach(Player participant in run?.Players??[])
                if(participant!=result.player) participant.RelicGrabBag.MoveToFallback(result.relic);
        }
        await Task.WhenAll(obtainTasks);
    }

    private async Task Buy(MerchantEntry e,MerchantInventory i)
    {
        bool previousCancelable=cardSelectionCancelable;
        cardSelectionCancelable=e is MerchantCardRemovalEntry;
        bool success;
        try { success=await e.OnTryPurchaseWrapper(i); }
        finally { cardSelectionCancelable=previousCancelable; }
        if(success&&e is MerchantCardRemovalEntry removal) removal.SetUsed();
        Say(success?"购买完成。":"未完成购买。");
    }

    public Task<IEnumerable<CardModel>> GetSelectedCards(IEnumerable<CardModel> options,int minSelect,int maxSelect)
    {
        List<CardModel> cards=options.ToList();
        if(ChoiceAdapters.TryGetBundleContext(this,cards,out var bundleContext))
        {
            var bundleChoice=new BundleChoice(bundleContext);
            pendingChoices.Enqueue(bundleChoice);
            return bundleChoice.Completion.Task;
        }
        if(minSelect<0||maxSelect<minSelect||minSelect>cards.Count)
            throw new ArgumentOutOfRangeException(nameof(minSelect),$"原版选择范围 {minSelect}–{maxSelect} 与 {cards.Count} 张候选牌不匹配。");
        var choice=new CardListChoice(cards,minSelect,Math.Min(maxSelect,cards.Count),cardSelectionCancelable);
        pendingChoices.Enqueue(choice);
        return choice.Completion.Task;
    }

    public CardRewardSelection GetSelectedCardReward(IReadOnlyList<CardCreationResult> options,IReadOnlyList<CardRewardAlternative> alternatives)
    {
        if(!rewardSelectionPending)
            throw new InvalidOperationException("卡牌奖励选择器没有收到终端提交的选择。");
        int index=rewardSelectionIndex;
        rewardSelectionPending=false;
        if(index<options.Count) return new CardRewardSelection {card=options[index].Card};
        int alternativeIndex=index-options.Count;
        if(alternativeIndex<0||alternativeIndex>=alternatives.Count)
            throw new InvalidOperationException("卡牌奖励选项已变化，请查看当前状态后重新选择。");
        return new CardRewardSelection {alternative=alternatives[alternativeIndex]};
    }

    internal Task<RelicModel?> QueueRelicChoice(IReadOnlyList<RelicModel> relics)
    {
        var choice=new RelicListChoice(relics);
        pendingChoices.Enqueue(choice);
        return choice.Completion.Task;
    }

    internal async Task RunCardRewardAlternative(CardReward reward,CardRewardAlternative alternative)
    {
        await alternative.OnSelect();
        var completion=new TaskCompletionSource();
        rewardStageChoice=completion;
        rewardCard=reward;
        Say("原版奖励效果已执行，请继续选择。");
        ShowRewardCardChoices(reward);
        await completion.Task;
    }

    private void SubmitRewardSelection(CardReward selected,int index)
    {
        rewardSelectionIndex=index;
        rewardSelectionPending=true;
        rewardCard=null;
        if(rewardStageChoice is { } continuation)
        {
            rewardStageChoice=null;
            continuation.TrySetResult();
        }
        else Start(TakeReward(selected));
    }

    private void ResolveQueuedChoice(PendingChoice choice,string cmd,string[] args)
    {
        if(choice is CardListChoice cards)
        {
            if(cmd=="back"&&cards.Cancelable)
            {
                pendingChoices.Dequeue();
                cards.Completion.TrySetResult(Array.Empty<CardModel>());
                return;
            }
            if(cmd=="skip"&&cards.MinSelect==0)
            {
                pendingChoices.Dequeue();
                cards.Completion.TrySetResult(Array.Empty<CardModel>());
                return;
            }
            if(cmd!="choose") throw new CommandError(ChoicePrompt(choice));
            int[] indices=args.Skip(1).Select(value=>int.TryParse(value,out int n)?n-1:-1).ToArray();
            if(indices.Length<cards.MinSelect||indices.Length>cards.MaxSelect||indices.Distinct().Count()!=indices.Length||indices.Any(index=>index<0||index>=cards.Options.Count))
                throw new CommandError($"请选择 {cards.MinSelect}–{cards.MaxSelect} 个不重复编号；可用 choose 编号（多个编号以空格分隔）。");
            pendingChoices.Dequeue();
            cards.Completion.TrySetResult(indices.Select(index=>cards.Options[index]).ToArray());
            return;
        }
        if(choice is BundleChoice bundles)
        {
            if(cmd!="choose"||args.Length!=2) throw new CommandError(ChoicePrompt(choice));
            int index=Index(args,1,bundles.Options.Count);
            pendingChoices.Dequeue();
            bundles.Completion.TrySetResult([bundles.Representatives[index]]);
            return;
        }
        if(choice is RelicListChoice relics)
        {
            if(cmd!="choose"||args.Length!=2) throw new CommandError(ChoicePrompt(choice));
            RelicModel selected=relics.Options[Index(args,1,relics.Options.Count)];
            pendingChoices.Dequeue();
            relics.Completion.TrySetResult(selected);
            return;
        }
        throw new InvalidOperationException("未知的原版选择上下文。");
    }

    private static string ChoicePrompt(PendingChoice choice)=>choice switch
    {
        CardListChoice cards=>$"原版效果要求选择 {cards.MinSelect}–{cards.MaxSelect} 张牌：choose 编号"+(cards.MaxSelect>1?"（多个编号以空格分隔）":"")+(cards.MinSelect==0?"；也可 skip":"")+(cards.Cancelable?"；back 取消当前选牌":""),
        BundleChoice=>"请选择一个原版卡牌组合：choose 编号",
        RelicListChoice=>"请选择一个原版遗物：choose 编号",
        _=>"需要先完成当前原版选择。"
    };

    private void ShowRewardCardChoices(CardReward reward)
    {
        List<CardModel> cards=reward.Cards.ToList();
        ShowCards(cards);
        IReadOnlyList<CardRewardAlternative> alternatives=CardRewardAlternative.Generate(reward);
        for(int i=0;i<alternatives.Count;i++) Say($"{cards.Count+i+1}. {Text(alternatives[i].Title)}");
    }

    private async Task TestSelectCards(string mode)
    {
        List<CardModel> deck=player!.Deck.Cards.ToList();
        (int min,int max) range=mode switch
        {
            "single"=>(1,1),
            "multi"=>(1,3),
            "optional"=>(0,3),
            _=>throw new CommandError("测试入口用法错误。")
        };
        IEnumerable<CardModel> selected=await GetSelectedCards(deck.Take(5),range.min,range.max);
        Say($"test selection {mode} selected: {string.Join(",",selected.Select(card=>card.Id.Entry))}");
    }

    private async Task TestNestedCards()
    {
        List<CardModel> deck=player!.Deck.Cards.ToList();
        Task<IEnumerable<CardModel>> first=GetSelectedCards(deck.Take(3),1,1);
        Task<IEnumerable<CardModel>> second=GetSelectedCards(deck.Skip(3).Take(3),0,2);
        IEnumerable<CardModel> firstResult=await first;
        IEnumerable<CardModel> secondResult=await second;
        Say($"test nested selections: {string.Join(",",firstResult.Select(card=>card.Id.Entry))} | {string.Join(",",secondResult.Select(card=>card.Id.Entry))}");
    }

    private async Task TestBundleChoice()
    {
        List<CardModel> deck=player!.Deck.Cards.ToList();
        IReadOnlyList<IReadOnlyList<CardModel>> bundles=[deck.Take(2).ToList(),deck.Skip(2).Take(2).ToList()];
        IEnumerable<CardModel> selected=await CardSelectCmd.FromChooseABundleScreen(player,bundles);
        Say($"test bundle selected: {string.Join(",",selected.Select(card=>card.Id.Entry))}");
    }

    private async Task TestRelicChoice()
    {
        List<RelicModel> relics=ModelDb.AllRelics.Take(3).Select(relic=>relic.ToMutable()).ToList();
        RelicModel? selected=await RelicSelectCmd.FromChooseARelicScreen(player!,relics);
        Say($"test relic selected: {selected?.Id.Entry??"none"}");
    }

    private Creature? CardTarget(TargetType type,string[] args,int pos)
    {
        if(type==TargetType.AnyEnemy) return Enemies[Index(args,pos,Enemies.Count)];
        if(type==TargetType.AnyAlly)
        {
            var allies=player!.Creature.CombatState?.PlayerCreatures.Where(c=>c.IsAlive).ToList()??[];
            return allies[Index(args,pos,allies.Count)];
        }
        return null;
    }
    private Creature? PotionTarget(TargetType type,string[] args,int pos)
    {
        if(type==TargetType.AnyEnemy) return Enemies[Index(args,pos,Enemies.Count)];
        if(type==TargetType.Self) return player!.Creature;
        if(type==TargetType.AnyPlayer) return player!.Creature;
        if(type==TargetType.AnyAlly)
        {
            var allies=player!.Creature.CombatState?.PlayerCreatures.Where(c=>c.IsAlive&&c!=player.Creature).ToList()??[];
            return allies[Index(args,pos,allies.Count)];
        }
        return null;
    }
    private static string CardTargetError(TargetType type)=>type switch
    {
        TargetType.AnyEnemy=>"请选择一个有效的存活敌人编号。",
        TargetType.AnyAlly=>"请选择一个有效的存活同侧目标编号（卡牌可选自己）。",
        _=>"此牌当前不能以所选目标打出。"
    };
    private static int Index(string[] args,int pos,int count)
    {
        if(args.Length<=pos||!int.TryParse(args[pos],out int n)||n<1||n>count) throw new CommandError($"请输入有效编号：1–{count}。");
        return n-1;
    }
    private bool CanLeave()
    {
        if(run==null||Busy||Choosing||CM.IsInProgress||Dead||!Hook.ShouldProceedToNextMapPoint(run)) return false;
        if(run.CurrentRoom is MapRoom) return NextPoints().Count>0;
        return run.CurrentRoom switch {CombatRoom c=>c.IsPreFinished, EventRoom e=>!EventInitializationPending(e)&&e.LocalMutableEvent.IsFinished,RestSiteRoom=>restDone,TreasureRoom=>treasureDone,_=>true};
    }

    private void ReportEventCardChanges()
    {
        if(run?.CurrentRoom is not EventRoom || player==null) return;
        PlayerMapPointHistoryEntry? historyEntry;
        try { historyEntry=run.CurrentMapPointHistoryEntry?.GetEntry(player.NetId); }
        catch(Exception) { return; }
        if(historyEntry==null) return;
        if(!ReferenceEquals(historyEntry,observedEventHistoryEntry))
        {
            observedEventHistoryEntry=historyEntry;
            reportedEventTransformCount=historyEntry.CardsTransformed.Count;
            return;
        }
        if(historyEntry.CardsTransformed.Count<=reportedEventTransformCount) return;
        foreach(var change in historyEntry.CardsTransformed.Skip(reportedEventTransformCount))
            Say($"原版变化结果：{SerializableCardName(change.OriginalCard)} → {SerializableCardName(change.FinalCard)}");
        reportedEventTransformCount=historyEntry.CardsTransformed.Count;
    }

    private static string SerializableCardName(SerializableCard card)
    {
        if(card.Id is not { } id) return "未知卡牌";
        try
        {
            CardModel model=ModelDb.GetById<CardModel>(id);
            string title=Clean(model.Title);
            int level=Math.Min(Math.Max(card.CurrentUpgradeLevel,0),model.MaxUpgradeLevel);
            if(level>0) title+=model.MaxUpgradeLevel>1?$"+{level}":"+";
            return title;
        }
        catch(Exception)
        {
            return id.Entry+(card.CurrentUpgradeLevel>0?$"+{card.CurrentUpgradeLevel}":"");
        }
    }

    private List<MapPoint> NextPoints()
    {
        if(run==null)return [];
        if(run.CurrentMapPoint==null)
            return run.CurrentRoom is MapRoom ? [run.Map.StartingMapPoint] : [];
        return MapTravel.GetTravelablePointsFrom(run,run.CurrentMapPoint).OrderBy(p=>p.coord.col).ToList();
    }
    private void Say(string text) {if(!string.IsNullOrWhiteSpace(text))messages.Add(Clean(text));}
    private static string Clean(string s)
    {
        s=Regex.Replace(s,@"res://images/packed/sprite_fonts/[A-Za-z0-9_]+_energy_icon\.png","能量");
        return Regex.Replace(s.Replace("[energy:1]","能量").Replace("[energy:0]","能量"),@"\[/?[^\]]+\]","");
    }
    private static string Text(LocString? s)
    {
        if(s==null) return "";
        try { return Clean(s.GetFormattedText()); }
        catch(Exception)
        {
            try { return Clean(s.GetRawText()); }
            catch(Exception) { return $"[原版文本未提供：{s.LocTable}.{s.LocEntryKey}]"; }
        }
    }
    private static string PowerDescription(PowerModel power)
    {
        try
        {
            var tip=power.HoverTips.OfType<HoverTip>().FirstOrDefault();
            if(!string.IsNullOrWhiteSpace(tip.Description)) return Clean(tip.Description);
        }
        catch(Exception) { }
        try { return Clean(power.GetDumbHoverTip().Description); }
        catch(Exception) { return Text(power.Description); }
    }
    private static object[] PowerViews(Creature creature) => creature.Powers.Select(power=>new
    {
        name=Text(power.Title),
        type=power.Type.ToString(),
        description=PowerDescription(power)
    }).ToArray();
    private sealed record EnemyIntentView(string type,string label,string title,string description,bool hasIntentTip);
    private EnemyIntentView[] EnemyIntentViews(Creature enemy)
    {
        var monster=enemy.Monster;
        if(player==null||monster==null)return [];
        Creature[] targets=[player.Creature];
        var views=new List<EnemyIntentView>();
        foreach(var intent in monster.NextMove.Intents)
        {
            if(intent==null)continue;
            string label="";
            try { label=Text(intent.GetIntentLabel(targets,enemy)); }
            catch(Exception) { }
            string title="",description="";
            bool hasIntentTip=false;
            try { hasIntentTip=intent.HasIntentTip; }
            catch(Exception) { }
            if(hasIntentTip)
            {
                try
                {
                    var tip=intent.GetHoverTip(targets,enemy);
                    title=Clean(tip.Title??"");
                    description=Clean(tip.Description);
                }
                catch(Exception)
                {
                    // Intent tooltips are optional display details; keep the label if an asset or localization is unavailable.
                }
            }
            string type="Unknown";
            try { type=intent.IntentType.ToString(); }
            catch(Exception) { }
            views.Add(new EnemyIntentView(type,label,title,description,hasIntentTip));
        }
        return views.ToArray();
    }
    private static string EventDescription(EventModel eventModel)
    {
        // Match NEventRoom.SetDescription: missing optional localization is not rendered.
        var description=eventModel.Description??new LocString("events","ERROR.description");
        if(!description.Exists()) return "";
        if(eventModel.Owner is { } owner)
        {
            owner.Character.AddDetailsTo(description);
            description.Add("IsMultiplayer",owner.RunState.Players.Count>1);
            eventModel.DynamicVars.AddTo(description);
        }
        return Text(description);
    }
    private static object EventState(EventRoom eventRoom)
    {
        EventModel eventModel=eventRoom.LocalMutableEvent;
        int optionCount=eventModel.CurrentOptions.Count;
        return new {initialized=eventModel.IsFinished||optionCount>0,finished=eventModel.IsFinished,optionCount};
    }
    private object RestState(RestSiteRoom restSite)
    {
        var options=restSite.Options;
        return new {initialized=options.Count>0,actionCompleted=restDone,optionCount=options.Count,enabledCount=options.Count(option=>option.IsEnabled)};
    }
    private static string EventOptionText(EventModel eventModel, LocString? text)
    {
        if(text==null) return "";
        // EventOption's constructor already adds owner details and
        // IsMultiplayer to its description. Match NEventOptionButton._Ready
        // here by adding the event's current dynamic variables to both title
        // and description before formatting them.
        eventModel.DynamicVars.AddTo(text);
        return Text(text);
    }
    private string CardText(CardModel c)=>$"{c.Title} · {c.EnergyCost.GetWithModifiers(CostModifiers.All)} 能量 · {Clean(c.GetDescriptionForPile(c.Pile?.Type??PileType.None))}";
    private void ShowCards(IReadOnlyList<CardModel> cards) {if(cards.Count==0)Say("空");for(int i=0;i<cards.Count;i++)Say($"{i+1}. {CardText(cards[i])}");}
    private void Catalog(string query)
    {
        var cards=ModelDb.Character<Ironclad>().CardPool.AllCards.Concat(ModelDb.Character<Ironclad>().StartingDeck).DistinctBy(c=>c.Id).Where(c=>c.Id.Entry.Contains(query,StringComparison.OrdinalIgnoreCase)||c.Title.Contains(query)).ToList();
        Say($"战士卡牌 · {cards.Count} 张");
        foreach(var c in cards) Say($"{c.Id.Entry} · {CardText(c)}");
    }
    private void Inspect(string[] a)
    {
        if(a.Length<2) throw new CommandError("inspect 手牌编号 或 inspect 卡牌ID");
        CardModel? c=int.TryParse(a[1],out int n)?player?.PlayerCombatState?.Hand.Cards.ElementAtOrDefault(n-1):ModelDb.AllCards.FirstOrDefault(c=>c.Id.Entry.Equals(a[1],StringComparison.OrdinalIgnoreCase)||c.Title==a[1]);
        if(c==null)throw new CommandError("未找到卡牌。");Say(CardText(c));if(c.IsUpgradable)Say("升级后："+Clean(c.GetDescriptionForUpgradePreview()));
    }
    private void ShowPotions(){for(int i=0;i<player!.MaxPotionCount;i++){var p=player.GetPotionAtSlotIndex(i);Say($"{i+1}. "+(p==null?"空槽":Text(p.Title)+" · "+Text(p.DynamicDescription)));}}
    private void ShowMap()
    {
        if(run==null)return;
        Say($"第 {run.CurrentActIndex+1} 幕 · {Text(run.Act.Title)} · 第 {run.TotalFloor} 层");
        foreach(var row in run.Map.GetAllMapPoints().GroupBy(p=>p.coord.row).OrderByDescending(g=>g.Key))
            Say($"{row.Key,2} │ "+string.Join("  ",row.OrderBy(p=>p.coord.col).Select(p=>$"{p.coord.col}:{p.PointType}"+(p.coord==run.CurrentMapCoord?" ←":""))));
        var next=NextPoints();
        bool canLeave=CanLeave();
        if(next.Count>0)
        {
            if(canLeave)
                for(int i=0;i<next.Count;i++)Say($"move {i+1} → {next[i].PointType} ({next[i].coord.col},{next[i].coord.row})");
            else
            {
                Say("当前房间尚未完成；以下仅为路线预览，暂不能 move。");
                for(int i=0;i<next.Count;i++)Say($"路线 {i+1} → {next[i].PointType} ({next[i].coord.col},{next[i].coord.row})");
            }
        }
        if(next.Count==0&&run.CurrentRoom is CombatRoom {RoomType:RoomType.Boss})
            Say(canLeave?"输入 proceed 继续。":"首领房间尚未完成结算，暂不能 proceed。");
    }
    private void ShowShop()
    {
        if(run?.CurrentRoom is not MerchantRoom m)throw new CommandError("当前不在商店。");
        var inventory=m.GetLocalInventory();RefreshHeadlessMerchantInventory(inventory);
        var all=inventory.AllEntries.ToList();for(int i=0;i<all.Count;i++)Say($"{i+1}. {EntryName(all[i])} · {all[i].Cost} 金币"+(all[i].IsStocked?"":" · 已售罄"));
    }
    private void RefreshHeadlessMerchantInventory(MerchantInventory inventory)
    {
        if(player is { RunState: { } state } currentPlayer&&inventory.CardRemovalEntry is { } removal&&!Hook.ShouldAllowMerchantCardRemoval(state,currentPlayer)) removal.SetUsed();
    }
    private static string EntryName(MerchantEntry e)=>e switch {MerchantCardEntry c=>c.CreationResult?.Card.Title??"卡牌（已售罄）",MerchantRelicEntry r=>r.Model is { } relic?Text(relic.Title):"遗物（已售罄）",MerchantPotionEntry p=>p.Model is { } potion?Text(potion.Title):"药水（已售罄）",_=>"移除卡牌"};
    private void Describe()
    {
        if(run==null){Say(Prompt());return;}
        Say($"战士 HP {player!.Creature.CurrentHp}/{player.Creature.MaxHp} · 格挡 {player.Creature.Block} · 金币 {player.Gold}");
        Say(Prompt());
    }
    private string Prompt()
    {
        if(failed)return "适配错误，请重开旅程";
        if(Won)return "胜利 · new ironclad 开始下一次旅程";
        if(Dead)return "你倒下了。new ironclad 开始下一次旅程";
        if(CurrentChoice is { } choice)return ChoicePrompt(choice);
        if(rewardCard is { } cardReward)
        {
            bool canSkip=CardRewardAlternative.Generate(cardReward).Any(alternative=>alternative.OptionId.Equals("Skip",StringComparison.OrdinalIgnoreCase));
            string skipText=canSkip?" / skip 跳过":"";
            return rewardStageChoice==null?"选择卡牌奖励：choose 编号（包含原版替代选项）"+skipText+" / back 返回奖励列表":"原版奖励效果正在等待后续选择：choose 编号"+skipText;
        }
        if(Rewards is { } rewardSet)return rewardSet.DisallowSkipping?"战利品：take 编号领取（本组不可跳过）":"战利品：take 编号 / skip 跳过剩余奖励";
        if(Playing)return "play 手牌编号 敌人编号 · end 结束回合";
        if(run?.CurrentRoom is EventRoom e)
        {
            var eventModel=e.LocalMutableEvent;
            if(EventInitializationPending(e))return "事件正在初始化，请稍候 · status 查看状态";
            if(CanLeave())return "事件已完成：move 编号前进 · map 查看路线";
            if(CM.IsInProgress)return "事件内战斗尚未结束，请先完成战斗 · status 查看状态";
            if(Busy||Choosing)return "事件效果仍在结算，请稍候 · status 查看状态";
            if(eventModel.IsFinished)return "事件已结束，但原版规则暂不允许离开 · status 查看状态";
            return eventModel.CurrentOptions.Count==0?"事件正在结算，请稍候 · status 查看状态":"choose 编号处理事件选项 · map 预览路线";
        }
        if(run?.CurrentRoom is CombatRoom { RoomType:RoomType.Boss } && NextPoints().Count==0)
            return CanLeave()
                ? (run.CurrentActIndex>=run.Acts.Count-1?"proceed 进入终局事件":"proceed 进入下一幕")
                : "首领战奖励或结算尚未完成，请先处理完当前选择";
        if(run?.CurrentRoom is RestSiteRoom restSite)
        {
            if(!restDone)return restSite.Options.Any(option=>option.IsEnabled)?"休息处：choose 编号使用行动；成功后可离开":"休息处当前没有可用行动。";
            return restSite.Options.Any(option=>option.IsEnabled)?"已完成一项休息处行动；可 choose 编号继续，或 move 编号离开":"休息处行动已完成：move 编号离开 · proceed 查看路线";
        }
        if(run?.CurrentRoom is TreasureRoom)
            return !treasureOpened?"open 开箱并领取原版金币和附加奖励":!treasureDone?"choose 编号领取遗物 · skip 跳过遗物":"move 编号前进 · proceed 查看路线";
        if(run?.CurrentRoom is MerchantRoom)return "buy 编号购买商品 · proceed 离开商店 · move 编号也可直接前进 · shop 查看清单";
        return run==null?(SaveManager.Instance.HasRunSave?"continue 恢复存档 · abandon 删除存档":"new ironclad 开始旅程"):"map 查看路线 · move 编号前进";
    }
    private static object[] CardHoverTips(CardModel card)
    {
        try
        {
            List<object> tips=[];
            foreach(HoverTip tip in card.HoverTips.OfType<HoverTip>())
            {
                string title=Clean(tip.Title??"");
                string description=Clean(tip.Description);
                if(!string.IsNullOrWhiteSpace(title)&&!string.IsNullOrWhiteSpace(description))
                    tips.Add(new {title,description});
            }
            return tips.ToArray();
        }
        catch(Exception) { return []; }
    }
    private object CardView(CardModel c,int i,string? command=null,bool multiSelect=false)=>new {index=i+1,id=c.Id.Entry,name=c.Title,cost=c.EnergyCost.GetWithModifiers(CostModifiers.All),description=Clean(c.GetDescriptionForPile(c.Pile?.Type??PileType.None)),type=Text(c.Type.ToLocString()),hoverTips=CardHoverTips(c),targetType=c.TargetType.ToString(),command,multiSelect};
    private object[] RewardCardOptions(CardReward reward)
    {
        List<CardModel> cards=reward.Cards.ToList();
        var cardOptions=cards.Select((card,index)=>(object)CardView(card,index,$"choose {index+1}"));
        var alternativeOptions=CardRewardAlternative.Generate(reward).Select((alternative,index)=>(object)new
        {
            index=cards.Count+index+1,
            name=Text(alternative.Title),
            description=Text(alternative.Title),
            kind="alternative",
            command=$"choose {cards.Count+index+1}"
        });
        return cardOptions.Concat(alternativeOptions).ToArray();
    }
    private object[] ChoiceActions()
    {
        List<object> actions=[];
        if(CurrentChoice is CardListChoice cards)
        {
            if(cards.MinSelect==0)actions.Add(new {label="不选牌",command="skip"});
            if(cards.Cancelable)actions.Add(new {label="取消选牌",command="back"});
        }
        else if(rewardCard is { } cardReward)
        {
            if(CardRewardAlternative.Generate(cardReward).Any(alternative=>alternative.OptionId.Equals("Skip",StringComparison.OrdinalIgnoreCase)))
                actions.Add(new {label="跳过奖励",command="skip"});
            if(rewardStageChoice==null)actions.Add(new {label="返回奖励列表",command="back"});
        }
        else if(Rewards is { DisallowSkipping:false })actions.Add(new {label="跳过剩余奖励",command="skip"});
        else if(run?.CurrentRoom is TreasureRoom&&treasureOpened&&!treasurePicking&&!treasureDone&&RM.TreasureRoomRelicSynchronizer.CurrentRelics!=null)
            actions.Add(new {label="跳过遗物",command="skip"});
        else if(run?.CurrentRoom is MerchantRoom && CanLeave())
            actions.Add(new {label="离开商店",command="proceed"});
        else if(run?.CurrentRoom is CombatRoom { RoomType:RoomType.Boss } && NextPoints().Count==0 && CanLeave())
            actions.Add(new {label=run.CurrentActIndex>=run.Acts.Count-1?"进入终局事件":"进入下一幕",command="proceed"});
        return actions.ToArray();
    }
    private object[] Options()
    {
        if(CurrentChoice is { } choice)return choice.Views(this);
        if(rewardCard!=null)return RewardCardOptions(rewardCard);
        if(Rewards!=null)return Rewards.Rewards.Where(r=>!r.SuccessfullySelected).Select((r,i)=>(object)new {index=i+1,name=Text(r.Description),description="",command="take "+(i+1)}).ToArray();
        if(run?.CurrentRoom is EventRoom e)return e.LocalMutableEvent.CurrentOptions.Select((o,i)=>(object)new {index=i+1,name=EventOptionText(e.LocalMutableEvent,o.Title),description=EventOptionText(e.LocalMutableEvent,o.Description),disabled=o.IsLocked,command="choose "+(i+1)}).ToArray();
        if(run?.CurrentRoom is RestSiteRoom r)return r.Options.Select((o,i)=>(object)new {index=i+1,id=o.OptionId,name=Text(o.Title),description=Text(o.Description),disabled=!o.IsEnabled,command="choose "+(i+1)}).ToArray();
        if(run?.CurrentRoom is TreasureRoom&&!treasureOpened)return [new {index=1,name="开启宝箱",description="",command="open"}];
        if(run?.CurrentRoom is TreasureRoom&&treasureOpened&&!treasureDone)return RM.TreasureRoomRelicSynchronizer.CurrentRelics?.Select((o,i)=>(object)new {index=i+1,name=Text(o.Title),description=Text(o.DynamicDescription),command="choose "+(i+1)}).ToArray()??[];
        if(run?.CurrentRoom is MerchantRoom merchant)
        {
            MerchantInventory inventory=merchant.GetLocalInventory();
            RefreshHeadlessMerchantInventory(inventory);
            return inventory.AllEntries.Select((entry,index)=>
            {
                bool stocked=entry.IsStocked;
                bool enoughGold=entry.EnoughGold;
                return (object)new {index=index+1,id=entry is MerchantCardRemovalEntry?"CARD_REMOVAL":entry.GetType().Name,name=EntryName(entry),description=EntryDescription(entry),cost=entry.Cost,costLabel="金币",disabled=!stocked||!enoughGold,type=!stocked?"已售罄":!enoughGold?"金币不足":"",command="buy "+(index+1)};
            }).ToArray();
        }
        return [];
    }
    private static string EntryDescription(MerchantEntry entry)=>entry switch
    {
        MerchantCardEntry card when card.CreationResult?.Card is { } model=>Clean(model.GetDescriptionForPile(PileType.None)),
        MerchantRelicEntry relic when relic.Model is { } model=>Text(model.DynamicDescription),
        MerchantPotionEntry potion when potion.Model is { } model=>Text(model.DynamicDescription),
        _=>""
    };
    private object? MapView()
    {
        if(run==null)return null;
        var nextPoints=NextPoints();
        var routeIndexes=new Dictionary<MapCoord,int>();
        for(int i=0;i<nextPoints.Count;i++)routeIndexes[nextPoints[i].coord]=i+1;
        IEnumerable<MapPoint> sourcePoints=run.Map.GetAllMapPoints()
            .Append(run.Map.StartingMapPoint)
            .Append(run.Map.BossMapPoint);
        if(run.Map.SecondBossMapPoint is { } secondBoss)sourcePoints=sourcePoints.Append(secondBoss);
        var points=sourcePoints.GroupBy(p=>p.coord).Select(g=>g.First())
            .OrderBy(p=>p.coord.row).ThenBy(p=>p.coord.col).ToArray();
        var visited=run.VisitedMapCoords.ToHashSet();
        var current=run.CurrentMapCoord;
        return new {
            act=run.CurrentActIndex+1,
            current=current.HasValue?new {col=current.Value.col,row=current.Value.row}:null,
            visitedPath=run.VisitedMapCoords.Select(c=>new {col=c.col,row=c.row}).ToArray(),
            points=points.Select(p=>new {
                col=p.coord.col,row=p.coord.row,type=p.PointType.ToString(),
                current=current.HasValue&&p.coord==current.Value,
                visited=visited.Contains(p.coord),
                start=p.coord==run.Map.StartingMapPoint.coord,
                boss=p.coord==run.Map.BossMapPoint.coord||(run.Map.SecondBossMapPoint is { } second&&p.coord==second.coord),
                routeIndex=routeIndexes.TryGetValue(p.coord,out int routeIndex)?routeIndex:0,
                children=p.Children.OrderBy(c=>c.coord.row).ThenBy(c=>c.coord.col)
                    .Select(c=>new {col=c.coord.col,row=c.coord.row}).ToArray()
            }).ToArray()
        };
    }
    private object? CombatView()
    {
        if(run?.CurrentRoom is not CombatRoom room || (!CM.IsInProgress && !CM.IsStarting)) return null;
        return new
        {
            type=room.RoomType.ToString(),
            isBoss=room.RoomType==RoomType.Boss,
            name=Text(room.Encounter.Title)
        };
    }
    private void Publish()
    {
        try
        {
            var pcs=player?.PlayerCombatState;
            IReadOnlyList<Creature> activeEnemies=CM.IsInProgress||CM.IsStarting?Enemies:Array.Empty<Creature>();
            var enemyViews=activeEnemies.Select((e,i)=>
            {
                EnemyIntentView[] intents=[];
                try { intents=EnemyIntentViews(e); }
                catch(Exception) { }
                string name="敌人";
                try { name=e.Name; }
                catch(Exception) { }
                string[] powers=[];
                try { powers=e.Powers.Select(p=>Text(p.Title)+" "+p.Amount).ToArray(); }
                catch(Exception) { }
                object[] powerDetails=[];
                try { powerDetails=PowerViews(e); }
                catch(Exception) { }
                return new {index=i+1,name,hp=e.CurrentHp,maxHp=e.MaxHp,block=e.Block,powers,powerDetails,intent=string.Join(" · ",intents.Select(intent=>intent.label)),intents};
            }).ToArray();
            var snapshot=new {
                prompt=Prompt(),messages=messages.ToArray(),messageError,phase=failed?"error":Won?"victory":Dead?"defeat":Choosing?"choice":Playing?"combat":run?.CurrentRoom?.RoomType.ToString()??"ready",engineMode=TestMode.IsOn?"TestMode/headless":"normal",hasRunSave=SaveManager.Instance.HasRunSave,
                seed,act=run==null?0:run.CurrentActIndex+1,actCount=run?.Acts.Count??0,floor=run?.TotalFloor??0,location=run==null?"旅程尚未开始":Text(run.Act.Title),
                player=player==null?null:new {name="战士",hp=player.Creature.CurrentHp,maxHp=player.Creature.MaxHp,block=player.Creature.Block,gold=player.Gold,energy=pcs?.Energy??0,maxEnergy=pcs?.MaxEnergy??player.MaxEnergy,turn=pcs?.TurnNumber??0,deck=player.Deck.Cards.Count,draw=pcs?.DrawPile.Cards.Count??0,discard=pcs?.DiscardPile.Cards.Count??0,exhaust=pcs?.ExhaustPile.Cards.Count??0,powers=player.Creature.Powers.Select(p=>Text(p.Title)+" "+p.Amount).ToArray(),relics=player.Relics.Select(r=>new{name=Text(r.Title),description=Text(r.DynamicDescription)}).ToArray(),potions=player.PotionSlots.Select(p=>p==null?"空槽":Text(p.Title)).ToArray()},
                hand=pcs?.Hand.Cards.Select((card,index)=>CardView(card,index)).ToArray()??[],
                combat=CombatView(),
                enemies=enemyViews,
                options=Options(),actions=ChoiceActions(),selection=CurrentChoice is CardListChoice cardSelection?new {min=cardSelection.MinSelect,max=cardSelection.MaxSelect}:null,eventText=run?.CurrentRoom is EventRoom er?EventDescription(er.LocalMutableEvent):"",eventState=run?.CurrentRoom is EventRoom eventRoom?EventState(eventRoom):null,restState=run?.CurrentRoom is RestSiteRoom restSite?RestState(restSite):null,
                routes=run==null?[]:NextPoints().Select((p,i)=>new{index=i+1,name=p.PointType.ToString(),col=p.coord.col,row=p.coord.row}).ToArray(),map=MapView(),canLeave=CanLeave(),busy=Busy&&!Choosing
            };
            System.Console.WriteLine("@@SPIRE@@"+JsonSerializer.Serialize(snapshot));
        }
        catch(Exception ex){System.Console.Error.WriteLine(ex);System.Console.WriteLine("@@SPIRE@@"+JsonSerializer.Serialize(new{phase="error",messages=new[]{"显示状态失败："+ex.Message},messageError=true,prompt="status 重试"}));}
    }
    private static bool IsReadOnly(string input)
    {
        string cmd=input.Split(' ',StringSplitOptions.RemoveEmptyEntries|StringSplitOptions.TrimEntries).FirstOrDefault()?.ToLowerInvariant()??"";
        return cmd is "status" or "状态" or "look" or "map" or "cards" or "inspect" or "relics" or "potions" or "hand" or "deck" or "draw" or "discard" or "exhaust" or "shop";
    }
    private abstract class PendingChoice
    {
        public abstract object[] Views(Main owner);
        public abstract void Cancel();
    }

    private sealed class CardListChoice(List<CardModel> options,int minSelect,int maxSelect,bool cancelable):PendingChoice
    {
        public List<CardModel> Options {get;}=options;
        public int MinSelect {get;}=minSelect;
        public int MaxSelect {get;}=maxSelect;
        public bool Cancelable {get;}=cancelable;
        public TaskCompletionSource<IEnumerable<CardModel>> Completion {get;}=new();
        public override object[] Views(Main owner)=>Options.Select((card,index)=>owner.CardView(card,index,$"choose {index+1}",MaxSelect>1)).ToArray();
        public override void Cancel()=>Completion.TrySetCanceled();
    }

    private sealed class BundleChoice(ChoiceAdapters.BundleContext context):PendingChoice
    {
        public List<IReadOnlyList<CardModel>> Options {get;}=context.Bundles.Select(bundle=>(IReadOnlyList<CardModel>)bundle.ToList()).ToList();
        public List<CardModel> Representatives {get;}=context.Representatives;
        public TaskCompletionSource<IEnumerable<CardModel>> Completion {get;}=new();
        public override object[] Views(Main owner)=>Options.Select((bundle,index)=>(object)new
        {
            index=index+1,
            name=$"组合 {index+1}",
            description=string.Join(" · ",bundle.Select(card=>$"{card.Title} [{card.Id.Entry}]")),
            command=$"choose {index+1}"
        }).ToArray();
        public override void Cancel()=>Completion.TrySetCanceled();
    }

    private sealed class RelicListChoice(IReadOnlyList<RelicModel> options):PendingChoice
    {
        public List<RelicModel> Options {get;}=options.ToList();
        public TaskCompletionSource<RelicModel?> Completion {get;}=new();
        public override object[] Views(Main owner)=>Options.Select((relic,index)=>(object)new
        {
            index=index+1,
            name=Text(relic.Title),
            description=Text(relic.DynamicDescription),
            command=$"choose {index+1}"
        }).ToArray();
        public override void Cancel()=>Completion.TrySetCanceled();
    }

    private sealed class CommandError(string message):Exception(message);
    private const string Help="""
开始旅程  new ironclad 种子 进阶0–10（种子和进阶可省略）/ continue 恢复原版存档
查看状态  status / hand / deck / draw / discard / exhaust / relics / potions
出牌      play 手牌编号 敌人编号（需指定目标的牌；例：play 1 2）
结束回合  end
选择      choose 编号（多选时可跟多个编号）
奖励      take 编号 / skip / back（back 返回奖励列表或取消原版可取消的选牌）
地图      map / move 路线编号 / proceed
商店      shop / buy 商品编号
药水      potion 槽位 敌人编号（需指定目标的药水）/ discard-potion 槽位
查阅      inspect 手牌编号或卡牌ID / cards 名称或ID
放弃      abandon（删除原版当前旅程存档）
界面      clear / help
所有编号从 1 开始，以当前显示为准。
""";
}
