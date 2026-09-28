using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Godot;
using MegaCrit.Sts2.Core.Assets;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Entities.CardRewardAlternatives;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Rewards;
using MegaCrit.Sts2.Core.Events.Custom.CrystalSphereEvent;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Nodes.Events.Custom.CrystalSphere;
using MegaCrit.Sts2.Core.Nodes.Screens.Overlays;
using MegaCrit.Sts2.Core.Rewards;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Saves;
using MegaCrit.Sts2.Core.TestSupport;

public static class ChoiceAdapters
{
    private static Main? current;
    private static BundleContext? activeBundleContext;

    internal static void Attach(Main main) => current = main;

    internal static void Detach(Main main)
    {
        if (ReferenceEquals(current, main)) current = null;
        if (activeBundleContext?.Owner == main) activeBundleContext = null;
    }

    public static NCrystalSphereScreen? ShowCrystalSphere(CrystalSphereMinigame minigame)
    {
        if (TestMode.IsOn)
        {
            Main main = current ?? throw new InvalidOperationException("水晶球占卜适配器尚未连接到网页终端。");
            main.RegisterCrystalSphere(minigame);
            return null;
        }

        // Preserve the original graphical path outside the bridge's TestMode.
        NCrystalSphereScreen screen = PreloadManager.Cache
            .GetScene("res://scenes/events/custom/crystal_sphere/crystal_sphere_screen.tscn")
            .Instantiate<NCrystalSphereScreen>(PackedScene.GenEditState.Disabled);
        FieldInfo entityField = typeof(NCrystalSphereScreen).GetField("_entity", BindingFlags.Instance | BindingFlags.NonPublic)
            ?? throw new MissingFieldException(typeof(NCrystalSphereScreen).FullName, "_entity");
        entityField.SetValue(screen, minigame);
        (NOverlayStack.Instance ?? throw new InvalidOperationException("原版水晶球界面栈尚未初始化。")).Push(screen);
        return screen;
    }

    public static async Task<IEnumerable<CardModel>> SelectBundle(
        Player player,
        IReadOnlyList<IReadOnlyList<CardModel>> bundles)
    {
        if (!TestMode.IsOn)
            throw new NotSupportedException("命令式组合选择适配只针对本桥接器启用的 TestMode；正常图形模式仍走原版选择屏。");
        if (CombatManager.Instance.IsEnding || bundles.Count == 0)
            return Array.Empty<CardModel>();

        Main main = current ?? throw new InvalidOperationException("组合选择适配器尚未连接到命令终端。");
        ICardSelector selector = CardSelectCmd.Selector ?? throw new InvalidOperationException("原版 ICardSelector 尚未注册。");
        if (bundles.Any(bundle => bundle.Count == 0))
            throw new InvalidOperationException("原版组合包含空候选项，当前命令呈现无法表达该组合。");

        List<CardModel> representatives = bundles.Select(bundle => bundle[0]).ToList();
        for (int i = 0; i < representatives.Count; i++)
            for (int j = i + 1; j < representatives.Count; j++)
                if (ReferenceEquals(representatives[i], representatives[j]))
                    throw new InvalidOperationException("原版卡牌组合使用了重复代表卡，无法无歧义地映射回组合。");

        // This mirrors CardSelectCmd's TestMode path: reserve an id, then ask the
        // registered selector, without sending a multiplayer choice result.
        RunManager.Instance.PlayerChoiceSynchronizer.ReserveChoiceId(player);
        var context = new BundleContext(main, bundles, representatives);
        BundleContext? previous = activeBundleContext;
        activeBundleContext = context;
        Task<IEnumerable<CardModel>> selectedTask;
        try
        {
            selectedTask = selector.GetSelectedCards(representatives, 1, 1);
        }
        finally
        {
            activeBundleContext = previous;
        }

        CardModel? representative = (await selectedTask).SingleOrDefault();
        if (representative == null) return Array.Empty<CardModel>();
        int selectedIndex = representatives.FindIndex(candidate => ReferenceEquals(candidate, representative));
        if (selectedIndex < 0)
            throw new InvalidOperationException("选择器返回了不属于原版组合的卡牌。");
        return bundles[selectedIndex];
    }

    public static async Task<RelicModel?> SelectRelic(Player player, IReadOnlyList<RelicModel> relics)
    {
        if (!TestMode.IsOn)
            throw new NotSupportedException("命令式遗物选择适配只针对本桥接器启用的 TestMode；正常图形模式仍走原版选择屏。");
        if (!LocalContext.IsMe(player) || RunManager.Instance.NetService.Type == NetGameType.Replay)
            throw new NotSupportedException("当前原版遗物选择不是本地单人选择，命令桥未接管该模式。");

        Main main = current ?? throw new InvalidOperationException("遗物选择适配器尚未连接到命令终端。");
        uint choiceId = RunManager.Instance.PlayerChoiceSynchronizer.ReserveChoiceId(player);
        foreach (RelicModel relic in relics) SaveManager.Instance.MarkRelicAsSeen(relic);
        RelicModel? selected = await main.QueueRelicChoice(relics);
        RunManager.Instance.PlayerChoiceSynchronizer.SyncLocalChoice(
            player,
            choiceId,
            PlayerChoiceResult.FromIndex(relics.ToList().IndexOf(selected!)));
        return selected;
    }

    public static IReadOnlyList<CardRewardAlternative> WrapRewardAlternatives(
        IReadOnlyList<CardRewardAlternative> alternatives,
        CardReward reward)
    {
        Main? main = current;
        if (main == null || !TestMode.IsOn || alternatives.Count == 0) return alternatives;
        return alternatives.Select(alternative =>
            alternative.AfterSelected == PostAlternateCardRewardAction.DoNothing
                ? new CardRewardAlternative(
                    alternative.OptionId,
                    () => main.RunCardRewardAlternative(reward, alternative),
                    alternative.AfterSelected)
                : alternative).ToArray();
    }

    internal static bool TryGetBundleContext(
        Main owner,
        IReadOnlyList<CardModel> options,
        out BundleContext context)
    {
        context = activeBundleContext!;
        BundleContext? active = activeBundleContext;
        if (active == null || !ReferenceEquals(active.Owner, owner) || options.Count != active.Representatives.Count)
        {
            context = null!;
            return false;
        }
        for (int i = 0; i < options.Count; i++)
        {
            if (!ReferenceEquals(options[i], active.Representatives[i]))
            {
                context = null!;
                return false;
            }
        }
        context = active;
        return true;
    }

    internal sealed class BundleContext(
        Main owner,
        IReadOnlyList<IReadOnlyList<CardModel>> bundles,
        List<CardModel> representatives)
    {
        internal Main Owner { get; } = owner;
        internal IReadOnlyList<IReadOnlyList<CardModel>> Bundles { get; } = bundles;
        internal List<CardModel> Representatives { get; } = representatives;
    }
}
