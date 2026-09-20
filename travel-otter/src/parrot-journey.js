import { routePhotoScene } from "./assets.js";
import { travelContent } from "./data.js";

// The parrot follows the same destination and item rules as the other
// protagonists, while its letters and postcard captions keep a distinct
// voice: it notices sounds, colors, and the small things worth carrying home.
const PARROT_TRAVEL_COPY = [
  {
    hint: "小鹦鹉沿着湖岸听风，把清晨的水声和山色都记进了小本子。",
    routes: [
      {
        name: "湖面学会回声",
        moment:
          "晨雾还没有散尽，小鹦鹉站在木栈道边学着湖水的声音，一开口，远处的山也像回了一句。",
        letter:
          "今天的湖面很安静，只有我的声音被山谷轻轻送回来。我把这句回声装进了明信片里。",
        photos: [
          {
            title: "栈道上的第一声歌",
            caption: "小鹦鹉站在湖边，把刚刚学会的水声唱给还没醒来的树林听。",
            quote: "有些歌不用写下来，风会替我记住。",
          },
          {
            title: "云影停在羽毛上",
            caption: "湖面亮起来的时候，小鹦鹉的蓝绿色羽毛也被云影染得柔柔的。",
            quote: "今天的颜色很轻，我小心地把它带回来了。",
          },
        ],
      },
      {
        name: "山风托起羽毛",
        moment:
          "小鹦鹉飞到山腰的风口，展开翅膀让风托住自己，看见河流在山下弯成一条银线。",
        letter:
          "山风比想象中更有力。我只张开翅膀站了一会儿，就看见了很远的屋顶。",
        photos: [
          {
            title: "风把翅膀吹开",
            caption: "山口的风把羽毛一根根吹亮，小鹦鹉顺势看向了更远的地方。",
            quote: "风知道远方在哪里，我只要听清它的方向。",
          },
          {
            title: "银色河流在脚下",
            caption: "从山腰回头看，河流像一条细细的歌，穿过所有屋顶和树林。",
            quote: "飞高一点，回家的路也会变得更清楚。",
          },
        ],
      },
      {
        name: "芦苇里的晚唱",
        moment:
          "芦苇把小路藏得严严实实，小鹦鹉在水边听了很久，终于分辨出风和水鸟的不同声音。",
        letter:
          "我在芦苇湾收集了三种声音：水声、风声，还有一只不肯露面的鸟声。下次唱给你听。",
        photos: [
          {
            title: "芦苇替我伴奏",
            caption: "小鹦鹉站在芦苇边轻轻哼唱，叶尖摇晃着给它打节拍。",
            quote: "安静一点，湖边就会自己唱起歌来。",
          },
          {
            title: "晚风的蓝色尾巴",
            caption: "夕阳落下去以后，小鹦鹉把最后一点蓝色留在了明信片角落。",
            quote: "天快黑了，不过这首歌还没有唱完。",
          },
        ],
      },
    ],
  },
  {
    hint: "海风会把小鹦鹉的尾羽吹得很高，灯塔和贝壳替它记住了潮声。",
    routes: [
      {
        name: "潮线拾光",
        moment:
          "退潮后的沙滩露出一条亮晶晶的小路，小鹦鹉沿着潮线走，捡到一枚会发光的贝壳。",
        letter:
          "海浪把一枚贝壳推到我脚边。我对着它说了一句谢谢，它好像把声音也留在里面了。",
        photos: [
          {
            title: "贝壳里的海声",
            caption: "小鹦鹉把贝壳贴近耳边，认真听着里面还没有散去的浪花。",
            quote: "海把声音藏得很深，我还是找到了。",
          },
          {
            title: "尾羽追着潮线",
            caption: "潮水退开一小步，小鹦鹉也跟着走一小步，蓝色尾羽擦过湿沙。",
            quote: "海边的路会移动，所以每一步都算新风景。",
          },
        ],
      },
      {
        name: "灯塔听风",
        moment:
          "灯塔的光一圈圈扫过海面，小鹦鹉站在坡顶听风，数着远处帆船经过的次数。",
        letter:
          "灯塔每转一圈，海面就亮一下。我数到第七圈时，刚好有一只船驶过。",
        photos: [
          {
            title: "灯塔替海面留灯",
            caption: "小鹦鹉站在灯塔坡边，等一束光把海面照成温柔的金色。",
            quote: "有灯的地方，远行的歌就不会走丢。",
          },
          {
            title: "帆船在歌声尽头",
            caption: "小鹦鹉把一只白色帆船画在海的尽头，像给远方留了一个逗号。",
            quote: "我没有飞过去，不过已经和它打过招呼了。",
          },
        ],
      },
      {
        name: "贝壳小集",
        moment:
          "海边小集挂满了贝壳风铃，小鹦鹉被最轻的一串声音吸引，停在摊边听了很久。",
        letter:
          "我挑了一枚最安静的贝壳。它不抢着唱歌，挂在窗边时刚好能听见雨声。",
        photos: [
          {
            title: "贝壳风铃在唱歌",
            caption: "小鹦鹉歪着脑袋听风铃，像是在分辨每一颗贝壳的音色。",
            quote: "每一枚贝壳都有自己的小声音。",
          },
          {
            title: "茶杯上的海风",
            caption: "店主递来一杯热茶，小鹦鹉的羽毛也沾上了一点暖暖的水汽。",
            quote: "在陌生地方被好好招待，是一段很轻的旅行。",
          },
        ],
      },
    ],
  },
  {
    hint: "森林里藏着栗子、溪水和会在傍晚亮起来的声音。",
    routes: [
      {
        name: "栗叶间的歌",
        moment:
          "栗子从树上落下来时，小鹦鹉正停在枝头。它挑了一颗最亮的，准备把森林的秋天带回家。",
        letter:
          "今天的森林下了一场栗子雨。我捡了一颗放在挎包里，走路时它会轻轻敲着指南针。",
        photos: [
          {
            title: "栗子落在翅膀旁",
            caption: "小鹦鹉在落叶堆里找到一颗圆栗子，旁边还有一枚晒暖的松果。",
            quote: "森林的礼物不大，却会在口袋里陪你很久。",
          },
          {
            title: "橘色树梢的风",
            caption: "秋风穿过树梢，小鹦鹉把金色叶片和蓝色尾羽一起收进了画面。",
            quote: "风吹过树叶时，整座森林都在换气。",
          },
        ],
      },
      {
        name: "溪水调音",
        moment:
          "小鹦鹉顺着苔痕来到溪边，发现水流敲过每块石头时，都有不一样的音高。",
        letter:
          "我在溪边听了好久，给三块石头分别取了名字。它们的歌，比我唱得还要整齐。",
        photos: [
          {
            title: "苔痕上的小乐谱",
            caption: "溪水绕过长满苔藓的石头，小鹦鹉低头记住了这段弯弯的旋律。",
            quote: "低头看一看，水边也有一首写好的歌。",
          },
          {
            title: "溪水把石头擦亮",
            caption: "清亮的水流从脚边过去，把一颗颗石头擦出了像星星一样的光。",
            quote: "有些风景不用带走，听过就已经被收好了。",
          },
        ],
      },
      {
        name: "萤光练习曲",
        moment:
          "天色暗下来，小鹦鹉跟着几粒萤光飞到林间空地，学着夜色把声音放得很轻。",
        letter:
          "我跟着小光飞了一段，差点忘了时间。放心，我认得月亮，也记得回家的方向。",
        photos: [
          {
            title: "萤火停在尾羽上",
            caption: "一粒萤火停在小鹦鹉的尾羽边，像给夜色别上一枚小小胸针。",
            quote: "天黑以后，森林只是换了一种发光的说法。",
          },
          {
            title: "月亮听完了歌",
            caption: "小鹦鹉在空地唱完最后一个音，月亮刚好从树梢后面探出了脸。",
            quote: "有人听见就很好，哪怕听众只有月亮。",
          },
        ],
      },
    ],
  },
  {
    hint: "雨桥小镇有热茶、纸灯，还有适合小鹦鹉慢慢听的每一条巷子。",
    routes: [
      {
        name: "桥檐听雨",
        moment:
          "雨点落在旧桥的瓦檐上，小鹦鹉找到一个不漏雨的角落，和路过的人一起听了很久。",
        letter:
          "桥下的雨声像一首很长的歌。我没有急着飞，等水洼映出天空以后才继续走。",
        photos: [
          {
            title: "桥檐下的雨帘",
            caption: "小鹦鹉收拢翅膀，看雨线把桥外的风景织成一层薄薄的帘子。",
            quote: "今天的目的地，是一处刚好不会淋湿的屋檐。",
          },
          {
            title: "水洼里有一座桥",
            caption: "小鹦鹉低头发现倒影里的旧桥，赶紧把这座倒过来的风景记下来。",
            quote: "低头看一看，街道也有另一种风景。",
          },
        ],
      },
      {
        name: "茶铺窗边",
        moment:
          "茶铺门口挂着一串木牌，风吹过时轻轻相碰，小鹦鹉捧着热茶坐在窗边听。",
        letter:
          "店主送了我一小包茶叶。它闻起来像晒过太阳的木头，适合下雨天陪你看明信片。",
        photos: [
          {
            title: "窗边的一杯热茶",
            caption: "热气从杯口升起来，小鹦鹉的眼睛里也映着茶铺的暖灯。",
            quote: "一杯热茶的时间，足够认识一条小巷。",
          },
          {
            title: "木牌碰出小声音",
            caption: "风把门口的木牌碰在一起，小鹦鹉抬头记住了这个不急不慢的声音。",
            quote: "小镇的声音不大，却每一句都有人回应。",
          },
        ],
      },
      {
        name: "灯影街尾",
        moment:
          "天色暗下来，纸灯一盏接一盏亮起，小鹦鹉跟着灯光飞到了街的尽头。",
        letter:
          "小镇的灯亮得很早。我在灯下买了一张手绘卡片，背面留给你写下一次想听的声音。",
        photos: [
          {
            title: "纸灯替街道点亮",
            caption: "一串纸灯把湿漉漉的街道照成金色，小鹦鹉也在灯下收起了翅膀。",
            quote: "天黑以后，小镇反而更像一个温暖的家。",
          },
          {
            title: "橱窗里的下一站",
            caption: "橱窗里摆着许多小卡片，小鹦鹉挑出一张还没有听过的远方。",
            quote: "下次也许可以换一条路，把新的歌带回家。",
          },
        ],
      },
    ],
  },
];

export function parrotTravelContent(place) {
  const placeIndex =
    Number.isInteger(place) && place >= 0 && place < 4 ? place : 0;
  const base = travelContent(placeIndex);
  const copy = PARROT_TRAVEL_COPY[placeIndex];
  return {
    ...base,
    hint: copy.hint,
    routes: base.routes.map((route, routeIndex) => {
      const routeCopy = copy.routes[routeIndex] || {};
      return {
        ...route,
        name: routeCopy.name || route.name,
        moment: routeCopy.moment || route.moment.replaceAll("阿獭", "小鹦鹉"),
        letter: routeCopy.letter || route.letter.replaceAll("阿獭", "小鹦鹉"),
        photos: route.photos.map((photo, photoIndex) => ({
          ...photo,
          ...(routeCopy.photos?.[photoIndex] || {}),
          id: "parrot-" + photo.id,
          scene: routePhotoScene(photo, "parrot"),
          characterId: "parrot",
        })),
      };
    }),
  };
}
