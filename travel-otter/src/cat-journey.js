import { routePhotoScene } from "./assets.js";
import { travelContent } from "./data.js";

// The cat keeps the same destination rules as the otter, but each route has
// its own voice and postcard titles. This makes changing the protagonist a
// content choice, not a string replacement in the return screen.
const CAT_TRAVEL_COPY = [
  {
    hint: "小猫沿着湖岸画下云影，也把每一阵山风收进了旅行手记。",
    routes: [
      {
        name: "猫步湖畔",
        moment:
          "小猫沿着木栈道轻轻走着，尾巴被湖风吹成了一面小旗。它在水边画了几笔，等云影慢慢落回湖心。",
        letter:
          "湖面今天像一张没写字的纸。我用爪印在地图上圈了个小地方，等你下次也来看看。",
        photos: [
          {
            title: "尾巴吹向湖面",
            caption: "小猫把地图压在栈道边，先让风替它决定下一站。",
            quote: "风把尾巴吹向湖面，也把我带到了更远的地方。",
          },
          {
            title: "地图上的小蓝点",
            caption:
              "小猫找到一处能看见整片湖的地方，在地图上留下了一个小蓝点。",
            quote: "记下一个地方，就像和它约好了下次再见。",
          },
        ],
      },
      {
        name: "山风追影",
        moment:
          "小猫背着相机爬到山腰，追着一片被风吹远的云，看见山下的小屋只剩一盏灯那么大。",
        letter:
          "山上的风比想象中大。我追着云跑了一小段，回头时发现小屋还在原来的方向。",
        photos: [
          {
            title: "风把尾巴吹起来",
            caption: "山口的风来得突然，小猫只好按住围巾，顺便拍下这阵风。",
            quote: "站稳以后再看，远方就没有那么高了。",
          },
          {
            title: "从山腰看小屋",
            caption: "小屋缩成窗边的一点暖色，小猫却一眼就认出了回家的方向。",
            quote: "走远一点，才看得见家有多亮。",
          },
        ],
      },
      {
        name: "芦苇听铃",
        moment:
          "芦苇把小路藏得严严实实，小猫蹲在水边听铃，直到一只水鸟替它翻动了叶尖。",
        letter:
          "我在芦苇湾坐到天快黑，听见水鸟从身边经过。它没有留下名字，只留下一阵沙沙声。",
        photos: [
          {
            title: "芦苇里的耳朵",
            caption: "小猫的耳朵从芦苇间探出来，刚好听见水面轻轻响了一声。",
            quote: "安静下来，湖边会把许多小事告诉你。",
          },
          {
            title: "一盏晚风小灯",
            caption: "天色变成金色以后，小猫把灯影和晚风一起画进了明信片。",
            quote: "今天的路不长，刚好够把心情晾干。",
          },
        ],
      },
    ],
  },
  {
    hint: "海风会把小猫的围巾吹得很高，贝壳和灯塔则负责记住这一天。",
    routes: [
      {
        name: "潮线拾贝",
        moment:
          "退潮后的沙滩露出一条亮晶晶的小路，小猫沿着贝壳走到了海风最软的地方。",
        letter:
          "海浪今天送来一枚小贝壳。我挑了最像月亮的那一枚，放进挎包里带回家。",
        photos: [
          {
            title: "海风里的小贝壳",
            caption: "小猫蹲在潮线边，认真挑了一枚带着海水光泽的贝壳。",
            quote: "海水退开以后，沙滩把秘密都亮给我看。",
          },
          {
            title: "追着浪花退一步",
            caption: "浪花碰到爪尖又退回去，小猫也笑着往后跳了一步。",
            quote: "海边的风，总是把人吹得比平时勇敢。",
          },
        ],
      },
      {
        name: "灯塔看船",
        moment: "灯塔的影子从坡顶一直伸到海边，小猫坐在影子里看船慢慢变小。",
        letter: "我找到一个能看见整片海的地方。灯塔每转一圈，海面就亮一下。",
        photos: [
          {
            title: "灯塔替我留灯",
            caption: "小猫坐在灯塔坡边，看一束光把海面切成两种颜色。",
            quote: "有灯的地方，远行就不会真的迷路。",
          },
          {
            title: "船驶向蓝色以外",
            caption: "船帆只剩一个白点，小猫把它画在明信片的最远处。",
            quote: "我也想把风装进背包，带回家给你。",
          },
        ],
      },
      {
        name: "贝壳小集",
        moment:
          "海边小集上挂满了贝壳风铃，小猫挑了很久，最后只带走了一枚最安静的。",
        letter:
          "集市上的风铃都在唱歌。我挑的这一枚声音最轻，适合挂在窗边陪你听雨。",
        photos: [
          {
            title: "贝壳风铃在唱歌",
            caption: "小猫在小集里逛了很久，最后被一串最轻的风铃留住了脚步。",
            quote: "每个小摊都有自己的海，我逛了好久才舍得离开。",
          },
          {
            title: "海边茶杯的热气",
            caption: "店主递来一杯热茶，小猫的胡须也沾上了一点海风的味道。",
            quote: "在陌生地方被好好招待，也是一种幸运。",
          },
        ],
      },
    ],
  },
  {
    hint: "森林里藏着栗子、苔痕和会在傍晚亮起来的小路。",
    routes: [
      {
        name: "栗树下的午后",
        moment:
          "栗子从树上落下来时，小猫正好走过。它捡起一颗最亮的，决定把森林的秋天带回家。",
        letter:
          "森林今天下了一场栗子雨。我捡了一颗放在挎包里，走路时它一直轻轻碰着地图。",
        photos: [
          {
            title: "栗子落在尾巴旁",
            caption:
              "小猫在落叶堆里找到了最圆的一颗栗子，旁边还有一枚晒暖的松果。",
            quote: "森林的礼物不大，却会在口袋里陪你走很久。",
          },
          {
            title: "秋天的橘色小路",
            caption: "落叶把小路铺成了橘色，小猫踩过时，整片森林都沙沙作响。",
            quote: "走慢一点，脚下的秋天才不会被错过。",
          },
        ],
      },
      {
        name: "苔溪慢慢走",
        moment:
          "小猫顺着苔痕走到溪边，发现水里的每一块石头都像一张不同颜色的小地图。",
        letter:
          "溪水把石头冲得很亮。我在一块苔痕旁坐了好久，连背包里的铃铛都变得安静了。",
        photos: [
          {
            title: "苔痕上的小地图",
            caption:
              "小猫把爪子放在湿润的石头上，发现苔藓画出了一条弯弯的小路。",
            quote: "低头看一看，溪边也有一张通往远方的地图。",
          },
          {
            title: "溪水替我洗亮石头",
            caption: "清亮的水流从脚边过去，把每一颗小石头都擦出了光。",
            quote: "有些风景不用带走，看过就已经被收好了。",
          },
        ],
      },
      {
        name: "萤光空地",
        moment:
          "天色暗下来，小猫跟着几粒萤光走到林间空地，在草叶上发现一颗会发亮的种子。",
        letter:
          "我跟着小小的光走了一段，差点忘了时间。放心，我记得回家的路，明天再把故事讲给你听。",
        photos: [
          {
            title: "萤火落在围巾上",
            caption: "一粒萤火停在小猫的围巾边，像给夜色别上了一枚小小的胸针。",
            quote: "天黑以后，森林只是换了一种发光的说法。",
          },
          {
            title: "空地尽头的月亮",
            caption: "小猫在林间空地抬头，月亮刚好从树梢后面探出了脸。",
            quote: "看见月亮的时候，就知道这段路快要走完了。",
          },
        ],
      },
    ],
  },
  {
    hint: "雨桥小镇有热茶、纸灯，还有适合小猫慢慢观察的每一扇窗。",
    routes: [
      {
        name: "桥檐躲雨",
        moment:
          "雨点落在旧桥的瓦檐上，小猫找到一个不漏雨的角落，和路过的人一起听雨。",
        letter:
          "桥下的雨声像一首很长的歌。我没有赶路，等爪边的水洼映出天空以后才继续走。",
        photos: [
          {
            title: "桥檐下的雨帘",
            caption: "小猫把挎包抱在怀里，安静地看雨线把桥外的风景织成薄帘。",
            quote: "今天的目的地，是一处刚好不会淋湿的屋檐。",
          },
          {
            title: "水洼里有一座桥",
            caption:
              "小猫低头看见水洼里的旧桥，赶紧把这座倒过来的风景画了下来。",
            quote: "低头看一看，街道也有另一种风景。",
          },
        ],
      },
      {
        name: "茶铺窗边",
        moment:
          "茶铺门口挂着一串木牌，风吹过时轻轻相碰，小猫捧着热茶坐在窗边。",
        letter:
          "店主送了我一小包茶叶。它闻起来像晒过太阳的木头，很适合下雨天陪你看明信片。",
        photos: [
          {
            title: "窗边的一杯热茶",
            caption: "热气从杯口升起来，小猫的眼睛里也映着茶铺的暖灯。",
            quote: "一杯热茶的时间，足够认识一条小巷。",
          },
          {
            title: "木牌碰出小声音",
            caption:
              "风把门口的木牌碰在一起，小猫抬头记住了这个不急不慢的声音。",
            quote: "小镇的声音不大，却每一句都有人回应。",
          },
        ],
      },
      {
        name: "灯影街尾",
        moment: "天色暗下来，纸灯一盏接一盏亮起，小猫跟着灯光走到了街的尽头。",
        letter:
          "小镇的灯亮得很早。我在灯下买了一张手绘卡片，背面留给你写下一次想去的地方。",
        photos: [
          {
            title: "纸灯替街道点亮",
            caption: "一串纸灯把湿漉漉的街道照成了金色，小猫也在灯下停了下来。",
            quote: "天黑以后，小镇反而更像一个温暖的家。",
          },
          {
            title: "橱窗里的下一站",
            caption: "橱窗里摆着许多小卡片，小猫从中挑出一张还没有走过的路。",
            quote: "下次也许可以换一条路回家。",
          },
        ],
      },
    ],
  },
];

export function catTravelContent(place) {
  const placeIndex =
    Number.isInteger(place) && place >= 0 && place < 4 ? place : 0;
  const base = travelContent(placeIndex);
  const copy = CAT_TRAVEL_COPY[placeIndex];
  return {
    ...base,
    hint: copy.hint,
    routes: base.routes.map((route, routeIndex) => {
      const routeCopy = copy.routes[routeIndex] || {};
      return {
        ...route,
        name: routeCopy.name || route.name,
        moment: routeCopy.moment || route.moment.replaceAll("阿獭", "小猫"),
        letter: routeCopy.letter || route.letter.replaceAll("阿獭", "小猫"),
        photos: route.photos.map((photo, photoIndex) => ({
          ...photo,
          ...(routeCopy.photos?.[photoIndex] || {}),
          id: `cat-${photo.id}`,
          scene: routePhotoScene(photo, "cat"),
          characterId: "cat",
        })),
      };
    }),
  };
}
