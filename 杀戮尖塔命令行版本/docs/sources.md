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
- 各幕生成、奖励、商店价格、事件与解锁的规则。
- 伤害取整、各类触发排序、战斗结束边界与死亡处理。
- 同版本原版回放或可重复的逐步对照。

目前没有任何完整玩法模块被核验为 1:1。

## 已锁定的版本

用户指定 Build `23811903`。

- [官方 Steam 公告：Major Update #2 - v0.107.1](https://steamcommunity.com/games/2868840/announcements/detail/710026912607505281)：已确认标题；本次网页读取未返回公告正文。
- [SteamDB 补丁索引](https://steamdb.info/patchnotes/23811903/)及[分支索引](https://steamdb.info/app/2868840/depots/)将此 Build 对应到 `v0.107.1` / `public`。SteamDB 是第三方，仅用于版本定位，不作为独立的官方玩法证据。
- 第三方转载的公告提示该版涉及随机数算法和战士卡牌调整；这些细节需以官方公告正文或对应游戏文件核实后才可进入实现。
