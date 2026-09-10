import { icon } from "./icons.js";

export const PHOTO_TYPES = {
  landmark: { label: "名所风景", icon: "album" },
  journey: { label: "途中见闻", icon: "leaf" },
  food: { label: "便当时刻", icon: "rice" },
  tool: { label: "道具助力", icon: "tent" },
  weather: { label: "天气瞬间", icon: "sun" },
  wildlife: { label: "野外邂逅", icon: "rabbit" },
  night: { label: "夜色风物", icon: "moon" },
  rare: { label: "稀有邂逅", icon: "charm" },
};

export const ITEMS = [
  {
    id: "rice",
    name: "梅子饭团",
    icon: icon("rice"),
    type: "food",
    price: 20,
    desc: "简单的便当 · 偏爱山野",
    place: 0,
    routeTags: ["lake", "mountain", "quiet"],
    travelHint: "更容易走湖畔和山腰的小路",
  },
  {
    id: "sandwich",
    name: "海盐三明治",
    icon: icon("sandwich"),
    type: "food",
    price: 35,
    desc: "咸咸的风 · 偏爱海边",
    place: 1,
    routeTags: ["sea", "wind", "open"],
    travelHint: "更容易遇见海风和开阔的地方",
  },
  {
    id: "mushroom",
    name: "蘑菇小面包",
    icon: icon("mushroom"),
    type: "food",
    price: 30,
    desc: "森林的味道 · 偏爱林间",
    place: 2,
    routeTags: ["forest", "quiet", "evening"],
    travelHint: "更容易走进安静的林间小路",
  },
  {
    id: "bento",
    name: "暖心双层便当",
    icon: icon("bento"),
    type: "food",
    price: 45,
    desc: "吃饱走远路 · 偏爱小镇",
    place: 3,
    routeTags: ["town", "warm", "rain"],
    travelHint: "更容易在小镇和雨后的街巷停留",
  },
  {
    id: "camera",
    name: "小小相机",
    icon: icon("camera"),
    type: "tool",
    price: 90,
    desc: "永久使用 · 记录第二个旅途瞬间",
    ability: "photo",
    travelHint: "有机会多寄回一张照片",
  },
  {
    id: "tent",
    name: "露营帐篷",
    icon: icon("tent"),
    type: "tool",
    price: 70,
    desc: "永久使用 · 多带一件沿途小物",
    ability: "souvenir",
    travelHint: "有机会多带回一件沿途小物",
  },
  {
    id: "charm",
    name: "四叶草护符",
    icon: icon("charm"),
    type: "charm",
    price: 15,
    desc: "一次使用 · 好运叶 +25，更容易发现稀有小物",
    ability: "lucky",
    travelHint: "稀有发现的机会会悄悄增加",
  },
];
export const PLACES = [
  {
    name: "青岚山湖",
    pos: "0% 0%",
    gift: "湖畔小石",
    icon: icon("stone"),
    quote: "这里的湖水像一面镜子。我坐了好久，看云慢慢从山那边游过来。",
  },
  {
    name: "风眠海岸",
    pos: "100% 0%",
    gift: "螺旋贝壳",
    icon: icon("shell"),
    quote: "海浪把一枚小贝壳送到脚边。我挑了最好看的那一枚，留给你。",
  },
  {
    name: "栗子森林",
    pos: "0% 100%",
    gift: "森林橡果",
    icon: icon("acorn"),
    quote: "落叶踩起来沙沙响。跟着蘑菇走了一小段，差点忘了回家的路。",
  },
  {
    name: "雨桥小镇",
    pos: "100% 100%",
    gift: "手绘风铃",
    icon: icon("chime"),
    quote: "在桥边躲了一场雨，店主给我一杯热茶。原来下雨也可以是好天气。",
  },
];

// A destination is intentionally described as a small content pack.  New
// places can add routes, conditions, postcards and keepsakes without changing
// the departure/arrival flow in main.js.
export const TRAVEL_CONTENT = [
  {
    place: 0,
    hint: "湖面、山风和一段不必赶路的清晨。",
    routes: [
      {
        id: "lake-boardwalk",
        name: "镜湖栈道",
        tags: ["lake", "quiet", "morning"],
        moment: "阿獭沿着木栈道走了很久，直到云影和湖水变成同一种颜色。",
        letter: "今天的湖面很安静，我把脚边最圆的一颗小石头带回来了。",
        photos: [
          {
            id: "lake-mist",
            title: "雾里的栈桥",
            caption: "湖面刚刚醒来，远处的木桥像漂在云上。",
            quote: "我没有急着走，雾散开以后，湖还在那里。",
          },
          {
            id: "lake-reflection",
            title: "云影落在湖心",
            caption: "一朵慢吞吞的云，正好停在阿獭身后的水面。",
            quote: "原来等一朵云，也是旅行的一部分。",
          },
        ],
      },
      {
        id: "mountain-breeze",
        name: "山腰风口",
        tags: ["mountain", "wind", "open"],
        moment: "山腰的风把围巾吹得鼓起来，阿獭顺着风看见了很远很远的屋顶。",
        letter: "山上的风比想象中大，不过站在高处看河流，心里也跟着变开阔了。",
        photos: [
          {
            id: "mountain-ribbon",
            title: "被风吹起的围巾",
            caption: "红围巾飘向山的另一边，像一面小小的旗。",
            quote: "风知道去哪里的路，我跟着它走了一小段。",
          },
          {
            id: "mountain-rooftops",
            title: "山下的屋顶",
            caption: "站在风口回头看，小屋只剩下一点温暖的颜色。",
            quote: "走远以后才发现，家一直在视线里。",
          },
        ],
      },
      {
        id: "reed-cove",
        name: "芦苇湾",
        tags: ["lake", "quiet", "evening"],
        moment: "芦苇把小路藏了起来，阿獭在水边听见一阵细细的铃声。",
        letter: "我在芦苇湾坐到天快黑，水鸟飞走的时候，带走了一点点晚风。",
        photos: [
          {
            id: "reed-birds",
            title: "芦苇里的水鸟",
            caption: "一只水鸟从芦苇间探出头，又很快把自己藏好了。",
            quote: "安静下来，湖边会把许多小事告诉你。",
          },
          {
            id: "reed-sunset",
            title: "晚风吹过芦苇",
            caption: "夕阳把每一根芦苇都染成了柔软的金色。",
            quote: "今天的路不长，刚好够把心情晾干。",
          },
        ],
      },
    ],
    conditions: [
      {
        id: "lake-mist",
        label: "晨雾初散",
        icon: "moon",
        desc: "湖面像刚翻开的信纸。",
      },
      {
        id: "lake-sun",
        label: "晴光落湖",
        icon: "sun",
        desc: "山影和云一起落进水里。",
      },
      {
        id: "lake-evening",
        label: "晚风起了",
        icon: "leaf",
        desc: "芦苇摇摇晃晃，催人慢慢回家。",
      },
    ],
    souvenirs: [
      {
        id: "lake-round-stone",
        name: "雾湖圆石",
        icon: "stone",
        rarity: "common",
        route: "lake-boardwalk",
        desc: "被湖水磨得很圆，握在手里凉凉的。",
        story: "阿獭说，它像一颗没有落下的月亮。",
      },
      {
        id: "wind-postmark",
        name: "山风邮戳",
        icon: "journal",
        rarity: "rare",
        route: "mountain-breeze",
        desc: "一枚印着远山轮廓的小小邮戳。",
        story: "盖在旅行手记上，纸页也好像变高了一点。",
      },
      {
        id: "reed-bell",
        name: "芦苇小铃",
        icon: "chime",
        rarity: "common",
        route: "reed-cove",
        desc: "轻轻一晃，就会响起很轻的晚风。",
        story: "它的声音不大，刚好不会吵醒湖边的鸟。",
      },
    ],
  },
  {
    place: 1,
    hint: "潮声、灯塔和一条总会通向海边的小路。",
    routes: [
      {
        id: "tide-beach",
        name: "潮汐沙滩",
        tags: ["sea", "open", "morning"],
        moment:
          "退潮后的沙滩露出一条亮晶晶的小路，阿獭沿着贝壳走到了海风最软的地方。",
        letter: "海浪今天送来一枚很漂亮的贝壳，我把它擦干净，放在口袋里了。",
        photos: [
          {
            id: "tide-shells",
            title: "潮水退后的贝壳路",
            caption: "每一枚贝壳都替海浪留下了一点声音。",
            quote: "海水退开以后，沙滩把秘密都亮给我看。",
          },
          {
            id: "tide-steps",
            title: "追着浪花跑",
            caption: "浪花刚碰到脚尖，阿獭就笑着往后退了一步。",
            quote: "海边的风，总是把人吹得比平时勇敢。",
          },
        ],
      },
      {
        id: "lighthouse-slope",
        name: "灯塔坡",
        tags: ["sea", "wind", "open"],
        moment: "灯塔的影子从坡顶一直伸到海边，阿獭坐在影子里看船慢慢变小。",
        letter: "我找到一个能看见整片海的地方。灯塔每转一圈，海面就亮一下。",
        photos: [
          {
            id: "lighthouse-shadow",
            title: "灯塔的长影子",
            caption: "一小团阿獭的影子，正好落在灯塔旁边。",
            quote: "有灯的地方，远行就不会真的迷路。",
          },
          {
            id: "lighthouse-boat",
            title: "船驶向远处",
            caption: "船帆只剩一个白点，还在慢慢往更蓝的地方去。",
            quote: "我也想把风装进背包，带回家给你。",
          },
        ],
      },
      {
        id: "shell-market",
        name: "贝壳小集",
        tags: ["sea", "warm", "town"],
        moment:
          "海边小集上挂满了贝壳风铃，阿獭挑了很久，最后只带走了一枚最安静的。",
        letter: "集市上的风铃都在唱歌。我挑的这一枚声音最轻，适合挂在窗边。",
        photos: [
          {
            id: "shell-market",
            title: "风铃小集",
            caption: "贝壳在屋檐下碰出细碎的光。",
            quote: "每个小摊都有自己的海，我逛了好久才舍得离开。",
          },
          {
            id: "shell-tea",
            title: "海边的热茶",
            caption: "店主递来一杯热茶，杯口还留着海风的味道。",
            quote: "在陌生地方被好好招待，也是一种幸运。",
          },
        ],
      },
    ],
    conditions: [
      {
        id: "sea-breeze",
        label: "海风正软",
        icon: "sun",
        desc: "浪花把脚边的沙子擦得发亮。",
      },
      {
        id: "sea-tide",
        label: "潮声渐远",
        icon: "moon",
        desc: "退潮后，海边的小路出现了。",
      },
      {
        id: "sea-lamp",
        label: "灯塔亮起",
        icon: "chime",
        desc: "天色变蓝，远处的灯一盏盏亮了。",
      },
    ],
    souvenirs: [
      {
        id: "tide-shell",
        name: "潮汐贝壳",
        icon: "shell",
        rarity: "common",
        route: "tide-beach",
        desc: "壳面有一道像浪花一样的白线。",
        story: "贴近耳朵时，里面还藏着一点海声。",
      },
      {
        id: "lighthouse-glass",
        name: "灯塔蓝玻璃",
        icon: "stone",
        rarity: "rare",
        route: "lighthouse-slope",
        desc: "被海水磨圆的蓝色玻璃。",
        story: "对着光看，像把一小块海带回了家。",
      },
      {
        id: "shell-chime",
        name: "贝壳风铃片",
        icon: "chime",
        rarity: "common",
        route: "shell-market",
        desc: "风吹过时，会响起很远的潮声。",
        story: "挂在窗边以后，小屋也有了海边的下午。",
      },
    ],
  },
  {
    place: 2,
    hint: "松果、溪水和一条会在暮色里发光的林间小路。",
    routes: [
      {
        id: "pine-path",
        name: "松果小径",
        tags: ["forest", "quiet", "morning"],
        moment: "松果从树上咚地落下来，阿獭抬头看了看，决定先把它放进背包。",
        letter: "林子里的路铺满了松果，走一步就会发出沙沙的声音，很好听。",
        photos: [
          {
            id: "pine-path",
            title: "松果铺成的小路",
            caption: "阳光从树叶缝里落下，给小路点了许多金色的点。",
            quote: "森林不催我走快，它只是在旁边陪着。",
          },
          {
            id: "pine-squirrel",
            title: "树梢上的小影子",
            caption: "树梢晃了一下，像是谁把尾巴藏在了叶子后面。",
            quote: "我好像遇见了一个很会躲猫猫的朋友。",
          },
        ],
      },
      {
        id: "moss-creek",
        name: "苔藓溪流",
        tags: ["forest", "quiet", "rain"],
        moment: "溪水从苔藓下面绕出来，阿獭蹲下来听了很久，听见山在小声说话。",
        letter:
          "溪边的石头都长着软软的绿色绒毛。我坐在那里，鞋尖被水花打湿了一点。",
        photos: [
          {
            id: "moss-creek",
            title: "苔藓和小溪",
            caption: "水流绕过石头，带走了几片刚落下的叶子。",
            quote: "小溪走得很慢，却一直知道自己要去哪里。",
          },
          {
            id: "moss-feet",
            title: "踩过浅浅的水",
            caption: "阿獭把脚放进水里，水面立刻荡开一圈圈笑意。",
            quote: "凉一点也没关系，山里的水会把心情洗干净。",
          },
        ],
      },
      {
        id: "firefly-clearing",
        name: "萤火林隙",
        tags: ["forest", "evening", "open"],
        moment:
          "暮色落下以后，林间空地亮起一颗、两颗，最后像有人撒了一把小星星。",
        letter: "我看见萤火虫了。它们没有带我走远，只在原地亮了一会儿。",
        photos: [
          {
            id: "firefly-clearing",
            title: "林间的小星星",
            caption: "萤火虫停在阿獭身边，像一盏盏很小的灯。",
            quote: "有些风景不用带走，记住它亮过就够了。",
          },
          {
            id: "firefly-leaf",
            title: "叶尖的一点光",
            caption: "一颗萤火落在叶尖，刚好照亮了圆圆的露珠。",
            quote: "夜里也有小小的路标，指向安静的地方。",
          },
        ],
      },
    ],
    conditions: [
      {
        id: "forest-light",
        label: "林间薄光",
        icon: "sun",
        desc: "树影把阳光剪成了细细的形状。",
      },
      {
        id: "forest-rain",
        label: "叶声沙沙",
        icon: "leaf",
        desc: "雨停后，整片森林都在轻轻呼吸。",
      },
      {
        id: "forest-firefly",
        label: "暮色萤火",
        icon: "moon",
        desc: "天黑下来，林隙里亮起了小星星。",
      },
    ],
    souvenirs: [
      {
        id: "pine-acorn",
        name: "林间橡果",
        icon: "acorn",
        rarity: "common",
        route: "pine-path",
        desc: "带着松香，放在掌心里很轻。",
        story: "松鼠栗栗看见以后，说它很适合藏在窗台边。",
      },
      {
        id: "moss-stone",
        name: "苔痕小石",
        icon: "stone",
        rarity: "common",
        route: "moss-creek",
        desc: "石缝里的绿色还没有完全干。",
        story: "它把溪边的安静带回了小屋。",
      },
      {
        id: "firefly-seed",
        name: "萤光种子",
        icon: "leaf",
        rarity: "rare",
        route: "firefly-clearing",
        desc: "看起来像一粒会在夜里发亮的种子。",
        story: "先收进收藏柜吧，阿獭说也许春天会发生什么。",
      },
    ],
  },
  {
    place: 3,
    hint: "旧桥、热茶和雨后街灯照亮的小镇日常。",
    routes: [
      {
        id: "old-bridge",
        name: "旧桥檐下",
        tags: ["town", "rain", "quiet"],
        moment:
          "雨点落在旧桥的瓦檐上，阿獭找了一个不漏雨的角落，和路过的人一起听雨。",
        letter: "桥下的雨声像一首很长的歌。我没有赶路，等雨停以后才继续走。",
        photos: [
          {
            id: "old-bridge",
            title: "桥檐听雨",
            caption: "雨线把桥外的风景织成了一层薄薄的帘子。",
            quote: "今天的目的地，是一处刚好不会淋湿的屋檐。",
          },
          {
            id: "bridge-puddle",
            title: "水洼里的桥",
            caption: "小小的水洼里，也装下了一座完整的旧桥。",
            quote: "低头看一看，街道也有另一种风景。",
          },
        ],
      },
      {
        id: "tea-alley",
        name: "茶铺巷口",
        tags: ["town", "warm", "quiet"],
        moment:
          "茶铺门口挂着一串木牌，风吹过时轻轻相碰，阿獭捧着热茶坐在门边。",
        letter:
          "店主送了我一小包茶叶。它闻起来像晒过太阳的木头，很适合下雨天。",
        photos: [
          {
            id: "tea-alley",
            title: "茶铺门口的午后",
            caption: "热气从杯口升起来，把巷子的颜色变得柔软。",
            quote: "一杯热茶的时间，足够认识一条小巷。",
          },
          {
            id: "tea-sign",
            title: "风里的木牌",
            caption: "木牌晃来晃去，好像在替店主招呼每一个路人。",
            quote: "小镇的声音不大，却每一句都有人回应。",
          },
        ],
      },
      {
        id: "lantern-street",
        name: "纸灯小街",
        tags: ["town", "warm", "evening"],
        moment: "天色暗下来，纸灯一盏接一盏亮起，阿獭跟着灯光走到了街的尽头。",
        letter:
          "小镇的灯亮得很早。我在灯下买了一张手绘卡片，想留给下一个好天气。",
        photos: [
          {
            id: "lantern-street",
            title: "纸灯亮起来了",
            caption: "一串纸灯把湿漉漉的街道照成了金色。",
            quote: "天黑以后，小镇反而更像一个温暖的家。",
          },
          {
            id: "lantern-card",
            title: "手绘卡片铺",
            caption: "橱窗里的小卡片，画着每一条阿獭还没走过的路。",
            quote: "下次也许可以换一条路回家。",
          },
        ],
      },
    ],
    conditions: [
      {
        id: "town-rain",
        label: "雨丝轻落",
        icon: "leaf",
        desc: "屋檐下的雨声把脚步放慢了。",
      },
      {
        id: "town-clear",
        label: "雨后放晴",
        icon: "sun",
        desc: "石板路上还留着一小片天空。",
      },
      {
        id: "town-lamp",
        label: "街灯初上",
        icon: "chime",
        desc: "每一盏灯都像在等晚归的人。",
      },
    ],
    souvenirs: [
      {
        id: "bridge-rain-token",
        name: "桥檐雨签",
        icon: "journal",
        rarity: "common",
        route: "old-bridge",
        desc: "一枚记录过雨声的小木签。",
        story: "挂在窗边，就能想起那场没有赶路的雨。",
      },
      {
        id: "tea-leaf-packet",
        name: "小镇茶包",
        icon: "leaf",
        rarity: "common",
        route: "tea-alley",
        desc: "打开时有晒过木头的温暖香气。",
        story: "适合在下一次等待远方消息时泡上一杯。",
      },
      {
        id: "lantern-card",
        name: "纸灯手绘卡",
        icon: "album",
        rarity: "rare",
        route: "lantern-street",
        desc: "画着一条还没有走过的小路。",
        story: "卡片背面写着：下次见。",
      },
    ],
  },
];

export function travelContent(place) {
  return TRAVEL_CONTENT[place] || TRAVEL_CONTENT[0];
}
