using Godot;
using MegaCrit.Sts2.Core.Helpers;
using System.Text.Json;
using System.Text.RegularExpressions;
using MegaCrit.Sts2.Core.TestSupport;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Characters;
using MegaCrit.Sts2.Core.Saves;
using MegaCrit.Sts2.Core.Localization;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.TreasureRelicPicking;
using MegaCrit.Sts2.Core.Entities.Potions;
using MegaCrit.Sts2.Core.Entities.CardRewardAlternatives;
using MegaCrit.Sts2.Core.Entities.Merchant;
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

public partial class Main : Node, ICardSelector
{
    private RunState? run;
    private Player? player;
    private Task? operation;
    private readonly List<string> messages = [];
    private readonly List<Task> background = [];
    private readonly Queue<PendingChoice> pendingChoices = new();
    private readonly Stack<(RewardsSet set, TaskCompletionSource done)> rewardStack = new();
    private CardReward? rewardCard;
    private TaskCompletionSource? rewardStageChoice;
    private bool rewardSelectionPending;
    private int rewardSelectionIndex;
    private bool restDone, treasureOpened, treasurePicking, treasureDone, gameWon;
    private bool treasureAwardHandlerAttached;
    private string seed = "";
    private bool failed;
    private bool TestHooksEnabled => System.Environment.GetEnvironmentVariable("SPIRECLI_ENABLE_TEST_HOOKS") == "1";
    private static RunManager RM => RunManager.Instance;
    private static CombatManager CM => CombatManager.Instance;
    private List<Creature> Enemies => player?.Creature.CombatState?.Enemies.Where(e => e.IsAlive).ToList() ?? [];
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
            Say("终端已就绪。输入 new ironclad 开始，输入 help 查看命令。\n规则来源：本机原版程序集；命令界面处于验证阶段。");
            Publish();
            while (true)
            {
                string? input = await Task.Run(System.Console.ReadLine);
                if (input == null) break;
                messages.Clear();
                try
                {
                    await Dispatch(input.Trim());
                    await Settle();
                }
                catch (CommandError ex) { Say(ex.Message); }
                catch (Exception ex)
                {
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
        catch (Exception ex) { System.Console.Error.WriteLine(ex); Say("初始化失败：" + ex.GetBaseException().Message); Publish(); }
        GetTree().Quit();
    }

    public override void _ExitTree() => ChoiceAdapters.Detach(this);

    private void Track(Task task) => background.Add(task);
    private void Start(Task task) { operation = task; }
    private async Task Settle()
    {
        for (int i = 0; i < 600; i++)
        {
            await ToSignal(GetTree(), SceneTree.SignalName.ProcessFrame);
            if (operation?.IsFaulted == true) await operation;
            foreach (var task in background.Where(t => t.IsFaulted).ToArray()) await task;
            background.RemoveAll(t => t.IsCompleted);
            if (Choosing || (!Busy && !EngineBusy && (!CM.IsInProgress || Playing || Dead))) return;
        }
        throw new CommandError("仍在结算。输入 status 获取状态；不要重复上一条操作。");
    }

    private async Task Dispatch(string input)
    {
        string[] a = input.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (a.Length == 0) return;
        string cmd = a[0].ToLowerInvariant();
        if (cmd is "help" or "帮助") { Say(Help); return; }
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
            if(cmd=="__test_select")
            {
                if(a.Length!=2) throw new CommandError("测试入口用法错误。");
                Start(TestSelectCards(a[1])); return;
            }
            if(cmd=="__test_nested") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestNestedCards()); return; }
            if(cmd=="__test_bundle") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestBundleChoice()); return; }
            if(cmd=="__test_relic") { if(a.Length!=1) throw new CommandError("测试入口用法错误。"); Start(TestRelicChoice()); return; }
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
                restDone=false;treasureOpened=false;treasurePicking=false;treasureDone=false;
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
        var unlocks=SaveManager.Instance.GenerateUnlockStateFromProgress();
        int maxAscension=SaveManager.Instance.Progress.GetOrCreateCharacterStats(ModelDb.Character<Ironclad>().Id).MaxAscension;
        int acceptedAscension=Math.Min(asc,maxAscension);
        if(acceptedAscension!=asc) Say($"原版角色选择会将进阶限制为已解锁的 {acceptedAscension}。" );
        asc=acceptedAscension;
        player=Player.CreateForNewRun<Ironclad>(unlocks,1);
        // Same seed stream as StartRunLobby; default profile keeps original unlock restrictions.
        var acts=ActModel.GetRandomList(new Rng((uint)StringHelper.GetDeterministicHashCode(seed), "act_selection"),unlocks,false).Select(a=>a.ToMutable()).ToArray();
        run=RunState.CreateForNewRun([player],acts,[],GameMode.Standard,asc,seed);
        RM.SetUpNewSingleplayer(run,true);
        AttachTreasureAwardHandler();
        await RM.FinalizeStartingRelics();RM.Launch();
        await RM.EnterAct(0,doTransition:false);
        Say($"战士 · 种子 {seed} · 进阶 {asc}\n{Text(run.Act.Title)}，旅程开始。");
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
        bool ok=await RM.RewardsSetSynchronizer.SelectLocalReward(reward);
        if(!ok) Say("未领取该奖励，请检查药水槽等条件。");
        CompleteRewardSet();
    }
    private void CompleteRewardSet()
    {
        if(Rewards!=null&&RM.RewardsSetSynchronizer.IsRewardsSetCompleted(Rewards)) {var done=rewardStack.Pop();done.done.SetResult();}
    }
    private async Task ChooseRest(int idx)
    {
        if(await RM.RestSiteSynchronizer.ChooseLocalOption(idx)) restDone=true;
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
        bool success=await e.OnTryPurchaseWrapper(i);
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
        var choice=new CardListChoice(cards,minSelect,Math.Min(maxSelect,cards.Count));
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
        CardListChoice cards=>$"原版效果要求选择 {cards.MinSelect}–{cards.MaxSelect} 张牌：choose 编号"+(cards.MaxSelect>1?"（多个编号以空格分隔）":"")+(cards.MinSelect==0?"；也可 skip":""),
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
        return run.CurrentRoom switch {CombatRoom c=>c.IsPreFinished, EventRoom e=>e.LocalMutableEvent.IsFinished,RestSiteRoom=>restDone,TreasureRoom=>treasureDone,_=>true};
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
        catch(Exception) { return Clean(s.GetRawText()); }
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
        var next=NextPoints(); for(int i=0;i<next.Count;i++)Say($"move {i+1} → {next[i].PointType} ({next[i].coord.col},{next[i].coord.row})");
        if(next.Count==0&&run.CurrentRoom is CombatRoom {RoomType:RoomType.Boss})Say("输入 proceed 继续。");
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
        if(rewardCard!=null)return rewardStageChoice==null?"选择卡牌奖励：choose 编号（包含原版替代选项） / skip / back":"原版奖励效果正在等待后续选择：choose 编号 / skip";
        if(Rewards!=null)return "战利品：take 编号 / skip";
        if(Playing)return "play 手牌编号 敌人编号 · end 结束回合";
        if(run?.CurrentRoom is EventRoom e)return e.LocalMutableEvent.IsFinished?"proceed 继续 · map 查看路线":"choose 编号选择事件选项 · map 查看路线";
        if(run?.CurrentRoom is RestSiteRoom restSite)
            return restSite.Options.Count>0?"choose 编号选择休息处行动；proceed 或 move 离开":"proceed 或 move 离开休息处";
        if(run?.CurrentRoom is TreasureRoom)
            return !treasureOpened?"open 开箱并领取原版金币和附加奖励":!treasureDone?"choose 编号领取遗物 / skip":"move 编号前进 · proceed 查看路线";
        if(run?.CurrentRoom is MerchantRoom)return "shop 查看商店 · buy 编号购买 · move 编号前进";
        return run==null?(SaveManager.Instance.HasRunSave?"continue 恢复存档 · abandon 删除存档":"new ironclad 开始旅程"):"map 查看路线 · move 编号前进";
    }
    private object CardView(CardModel c,int i)=>new {index=i+1,id=c.Id.Entry,name=c.Title,cost=c.EnergyCost.GetWithModifiers(CostModifiers.All),description=Clean(c.GetDescriptionForPile(c.Pile?.Type??PileType.None)),type=c.Type.ToString(),targetType=c.TargetType.ToString()};
    private object[] RewardCardOptions(CardReward reward)
    {
        List<CardModel> cards=reward.Cards.ToList();
        var cardOptions=cards.Select((card,index)=>(object)CardView(card,index));
        var alternativeOptions=CardRewardAlternative.Generate(reward).Select((alternative,index)=>(object)new
        {
            index=cards.Count+index+1,
            name=Text(alternative.Title),
            description=Text(alternative.Title),
            kind="alternative"
        });
        return cardOptions.Concat(alternativeOptions).ToArray();
    }
    private object[] Options()
    {
        if(CurrentChoice is { } choice)return choice.Views(this);
        if(rewardCard!=null)return RewardCardOptions(rewardCard);
        if(Rewards!=null)return Rewards.Rewards.Where(r=>!r.SuccessfullySelected).Select((r,i)=>(object)new {index=i+1,name=Text(r.Description),description="take "+(i+1)}).ToArray();
        if(run?.CurrentRoom is EventRoom e)return e.LocalMutableEvent.CurrentOptions.Select((o,i)=>(object)new {index=i+1,name=Text(o.Title),description=Text(o.Description),disabled=o.IsLocked}).ToArray();
        if(run?.CurrentRoom is RestSiteRoom r)return r.Options.Select((o,i)=>(object)new {index=i+1,name=Text(o.Title),description=Text(o.Description),disabled=!o.IsEnabled}).ToArray();
        if(run?.CurrentRoom is TreasureRoom&&treasureOpened&&!treasureDone)return RM.TreasureRoomRelicSynchronizer.CurrentRelics?.Select((o,i)=>(object)new {index=i+1,name=Text(o.Title),description=Text(o.DynamicDescription)}).ToArray()??[];
        return [];
    }
    private void Publish()
    {
        try
        {
            var pcs=player?.PlayerCombatState;
            var snapshot=new {
                prompt=Prompt(),messages=messages.ToArray(),phase=failed?"error":Won?"victory":Dead?"defeat":Choosing?"choice":Playing?"combat":run?.CurrentRoom?.RoomType.ToString()??"ready",engineMode=TestMode.IsOn?"TestMode/headless":"normal",hasRunSave=SaveManager.Instance.HasRunSave,
                seed,act=run==null?0:run.CurrentActIndex+1,floor=run?.TotalFloor??0,location=run==null?"旅程尚未开始":Text(run.Act.Title),
                player=player==null?null:new {name="战士",hp=player.Creature.CurrentHp,maxHp=player.Creature.MaxHp,block=player.Creature.Block,gold=player.Gold,energy=pcs?.Energy??0,maxEnergy=pcs?.MaxEnergy??player.MaxEnergy,turn=pcs?.TurnNumber??0,deck=player.Deck.Cards.Count,draw=pcs?.DrawPile.Cards.Count??0,discard=pcs?.DiscardPile.Cards.Count??0,exhaust=pcs?.ExhaustPile.Cards.Count??0,powers=player.Creature.Powers.Select(p=>Text(p.Title)+" "+p.Amount).ToArray(),relics=player.Relics.Select(r=>new{name=Text(r.Title),description=Text(r.DynamicDescription)}).ToArray(),potions=player.PotionSlots.Select(p=>p==null?"空槽":Text(p.Title)).ToArray()},
                hand=pcs?.Hand.Cards.Select(CardView).ToArray()??[],
                enemies=Enemies.Select((e,i)=>new{index=i+1,name=e.Name,hp=e.CurrentHp,maxHp=e.MaxHp,block=e.Block,powers=e.Powers.Select(p=>Text(p.Title)+" "+p.Amount).ToArray(),intent=string.Join(" · ",e.Monster!.NextMove.Intents.Select(it=>Text(it.GetIntentLabel([player!.Creature],e))))}).ToArray(),
                options=Options(),eventText=run?.CurrentRoom is EventRoom er?Text(er.LocalMutableEvent.Description):"",
                routes=run==null?[]:NextPoints().Select((p,i)=>new{index=i+1,name=p.PointType.ToString(),col=p.coord.col,row=p.coord.row}).ToArray(),canLeave=CanLeave(),busy=Busy&&!Choosing
            };
            System.Console.WriteLine("@@SPIRE@@"+JsonSerializer.Serialize(snapshot));
        }
        catch(Exception ex){System.Console.Error.WriteLine(ex);System.Console.WriteLine("@@SPIRE@@"+JsonSerializer.Serialize(new{phase="error",messages=new[]{"显示状态失败："+ex.Message},prompt="status 重试"}));}
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

    private sealed class CardListChoice(List<CardModel> options,int minSelect,int maxSelect):PendingChoice
    {
        public List<CardModel> Options {get;}=options;
        public int MinSelect {get;}=minSelect;
        public int MaxSelect {get;}=maxSelect;
        public TaskCompletionSource<IEnumerable<CardModel>> Completion {get;}=new();
        public override object[] Views(Main owner)=>Options.Select(owner.CardView).ToArray();
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
            description=string.Join(" · ",bundle.Select(card=>$"{card.Title} [{card.Id.Entry}]"))
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
            description=Text(relic.DynamicDescription)
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
奖励      take 编号 / skip / back
地图      map / move 路线编号 / proceed
商店      shop / buy 商品编号
药水      potion 槽位 敌人编号（需指定目标的药水）/ discard-potion 槽位
查阅      inspect 手牌编号或卡牌ID / cards 名称或ID
放弃      abandon（删除原版当前旅程存档）
界面      clear / help
所有编号从 1 开始，以当前显示为准。
""";
}
