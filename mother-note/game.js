'use strict';
const $=s=>document.querySelector(s), KEY='mothers-note-v1';
const fresh=()=>({version:1,area:'living',day:1,phase:0,sanity:100,food:30,catFood:30,lastFedDay:0,feedCount:0,catMissedDays:0,furLoss:0,ate:0,pet:0,focus:2,insight:0,catCareDays:0,catTrust:0,houseThreat:0,neighborTrust:0,anomaly:null,anomalyHistory:[],clues:['mother'],items:[],events:[],log:[],ending:null,pending:null});
function hydrate(s){const next={...fresh(),...s};if(!Number.isInteger(s.lastFedDay))next.lastFedDay=Number.isInteger(s.fed)?s.fed:0;if(!Number.isInteger(s.feedCount))next.feedCount=Math.max(0,Math.min(next.day,next.lastFedDay));if(!Number.isInteger(next.catMissedDays))next.catMissedDays=0;if(!Number.isInteger(next.furLoss))next.furLoss=0;if(!next.anomaly||typeof next.anomaly!=='object')next.anomaly=null;if(!Array.isArray(next.anomalyHistory))next.anomalyHistory=[];delete next.fed;return next;}
let state=fresh();try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===1&&Number.isInteger(s.day)&&s.day>=1&&s.day<=30&&Array.isArray(s.clues)&&Array.isArray(s.items)&&Array.isArray(s.events)&&Array.isArray(s.log))state=hydrate(s);}catch{}
let pending=false,audioCtx=null,osc=null;
const docs={mother:{title:'妈妈留的纸条',meta:'桌上的纸张 / 已整理可辨认部分',body:`<p>抱歉妈妈要临时出差一个月，这段时间你一个人在家要遵守规则哦，乖乖等妈妈回来 ^_^</p><ol><li>合理分配冰箱里一个月的食物。</li><li>白天有人敲门，先确认门外的人。持续超过五分钟，立刻躲到床底。</li><li>晚上有人敲门，不要看猫眼，无论那是谁的声音。</li><li>确认家中有且只有一个人。</li><li>家中物件持续怪响时，安静走到门口注视猫眼，不要带红色毛线团。</li><li>邻居是中年男性，不会做出任何表情。他若背对着你诡异地笑，关门。</li></ol><p class="red">然后进入衣柜。</p><ol start="7"><li>不要相信暗处看到的一切。</li><li>家在二十九楼，窗外不会有人影。</li><li>钟表是坏的。你需要别的方式确认时间。</li><li>每天给猫猫喂水和罐头，不要喂角落的猫粮，不要取名字，适当抚摸她。</li><li>睡前确认猫猫没有进入房间。</li><li>如果无法驱赶猫猫，开着门窗，整夜保持清醒、注视她。</li></ol><p class="red"><s>如果猫猫不见了，立马从窗户跳下去</s><br>就躲进床底，不要出声。</p><ol start="13"><li>保护猫猫，她会在危急时保护你。</li><li>确认日期和时间，不要迷失。</li><li>任何情况下不要打开或进入衣柜。</li><li>保持洁净。白光出现时，<span class="red">［乱码］躲进衣柜是正确的。</span></li><li>不要让客厅镜子注视你超过三十分钟。</li><li>［整条被划掉］</li><li>妈妈只会在三十天后的上午九点回来。</li><li>没有准时回来的妈妈，不要相信，不要对视，不要让她发现你知道。</li></ol><p class="red">妈妈不会准时回来，妈妈又不是机器。</p><ol start="21"><li>妈妈回来前不要出门！如果必须出门，紧紧抱着猫猫。不要在外面过夜。</li></ol><p>等 待 妈 妈。</p><p class="red">不要逃。</p>`},diary:{title:'衣柜旁的旧日记',meta:'并不是你的字迹',body:`<h3>十二月七日</h3><p>我一直在和小咪玩～它好像讨厌吃猫粮，还把我抓伤了。</p><h3>十二月？日</h3><p>昨晚抱着小咪睡了。它的呼吸好重，毛什么时候变得这么长？我的眼皮好重。</p><p>外面有人敲门，像鱼一样的大叔。床底太挤了，我躲进衣柜，舒服得睡着了。</p><h3>？月？日</h3><p>小咪的毛脱光了，像个婴儿。家里的人都不理我。我望着镜子发呆。我原来……是长这样吗？</p><h3 class="red">十二月三十二日</h3><p>妈妈终于回来了！她给我吃了药，现在我要和妈妈出去玩啦～</p><p class="red">十二月没有三十二日。你合上了日记。</p>`},cat:{title:'猫猫藏起的纸条',meta:'罐头碗的底部 / 字迹潦草',body:`<p>那 个 所谓 的妈妈 □□□□□ 不要相 信它。</p><p>我会失控，□□不要带上我。邻居会真 正 帮助你，你只需要给 他 他 想 要 的。好 好想想。</p><p>邻居 □ □ □　□□。□□ 是好的。相 信 □□。</p><h3>离开这里。</h3><p class="meta">最后四个字非常端正，可能来自另一个书写者。</p>`},exit:{title:'门口贴着的便签',meta:'纸张很新，胶带却已经发黄',body:`<ol><li>出门时确认怀中的猫猫活着，没有大片脱毛。</li><li>确认邻居没有跟着你。</li><li>小心楼道里的镜子。</li><li>在电梯里无视任何人，妈妈也不行。</li><li>不要离开小区。</li><li>应该有两个脚步声，不要让任何人跟着你。</li><li>黄昏前回家，无视家里的异常，锁上房门。</li><li>第二天异常依然存在，<span class="red">打开衣柜，把妈妈所有蓝色上衣扔出去。</span></li><li>拒绝邻居，妈妈才是正确的。</li></ol>`},neighbor:{title:'邻居的交换',meta:'你记下了没有表情的男人说的话 / 改编线索',body:`<p>“红线给我。我能拦它一会儿。”</p><p>“它有形体，也会死。太阳落下去之前，把镜子盖住。用厨房的火，烧掉衣柜外露出的黑丝。不要打开柜门。”</p><p>“等影子断开，再走楼梯。不带猫，它会失控。也不要回头找我。”</p><p class="red">他没有承诺救你。他只是说，会替你争取时间。</p>`}};
const originalMotherNote=`<article class="note-page" aria-label="妈妈留的纸条原文">
<div class="note-copy">
<h3>*妈妈留的纸条</h3>
<p class="note-intro">抱歉妈妈要临时出差一个月，这段时间<br>你一个人在家要遵守 <strong>规则</strong> 哦，乖乖等<br>妈妈回来^_^</p>
<ol class="note-rules">
<li>冰箱里面有一个月的食物，合理分配，<strong>不要提前吃完它</strong>，可以剩下一些。</li>
<li>如果白天有人敲门，你要用猫眼仔细确认门外的生物你是否认识且完好无损，如果不是千万不要开门，若她/他/? 持续敲门超过五分钟，立马躲到底床下。</li>
</ol>
<p class="note-red note-insert">衣柜会保护你　进　入衣　柜</p>
<ol class="note-rules" start="3">
<li>如果是晚上有人敲门，<strong>不要去看猫眼，无论门外传来的声音是谁。</strong></li>
</ol>
<p class="note-red note-insert">晚上你可以躲进衣柜</p>
<ol class="note-rules" start="4">
<li>确认家中有且只有一个人。</li>
<li>如果你听见怪异且连续的声音并且明显属于家中的某个东西，不论你在干什么，立刻停下，不要发出任何声音，走到门口注视猫眼，注意千万不要带着红色毛线团，邻居会来帮你。</li>
<li>邻居是一个中年男性，不要询问他的名字。他不会做出任何表情，若你发现他正在诡异的笑并且背对着望向你时，关上门不要让他进来。然后进入衣柜</li>
<li>不要相信在暗处看到的一切。</li>
<li>家在29楼，窗外不会有人影。</li>
<li>家里的钟表是坏的，不要相信上面的时间。</li>
<li>好好对待家里的猫猫，每天给她喂水和面条，<strong>不要喂给她角落的猫粮。</strong>绝对不可以给猫猫取名字，只能叫她猫猫，每天适当抚摸她，不要过度。<em>它很喜欢猫猫</em></li>
<li>晚上睡觉时请仔细确认猫猫没有进入房间。</li>
<li>当猫猫进入房间并无法驱赶时，当晚不要关掉房门和窗户，<span class="note-red-inline">千万不要睡着，让猫猫在你的视线范围内。</span>如果猫猫不见了，<span class="note-red-inline">立马从窗户跳下去</span>就躲进床底，不要出声，猫猫不会看见你。</li>
<li>一定要保护好猫猫，她是我们的家人，到危机关头她会保护你。</li>
<li>一个月内保持清醒，要确认现在是几号几时。不要迷失。</li>
<li><strong>任何情况下不要打开或进入衣柜，</strong><span class="note-red-inline">无论白天黑夜。</span></li>
<li>保持家中的洁净，不要过于脏乱，它会发现。当你的房间过于脏乱且发现有目光在注视你时。 <span class="note-corrupt">&amp;#1Λ7?<br>2/ £/、我/*€11到它? 销毁。躲进衣柜是正确的。</span></li>
<li>客厅的镜子可以看到整个客厅，不要让它注视你超过三十分钟。<em>当你躲在桌子下时可以</em></li>
<li class="note-crossed"><span class="note-scribble" aria-label="原图中被划掉的文字"></span></li>
<li>妈妈不会提前回来，妈妈只会在三十天后的<span class="note-blue">上午九点</span>回来，无论早回还是晚回，都不要相信。</li>
<li>当妈妈没有准时回来的时候，请极力保持清醒。不要相信那个女人的一言一行，不要吃下她做的饭，不要执行她的任何命令，不要和她对视，不要让她发现你知道，不? /<br><span class="note-corrupt">*[s 要<br>去[]**||a] 并且7aaA€<br>{b#*?。。。</span></li>
</ol>
<p class="note-red note-machine">妈妈不会准时回来。妈妈又不是机器。</p>
<ol class="note-rules" start="21">
<li>家是安全的，外面是危险的，妈妈回来前 <strong class="note-shout">不要出门不要出门不要出门！！！</strong> 如果发生了什么使你一定要出门，请务必带上猫猫，把她紧紧抱在怀里，<strong>不要让她逃走。</strong></li>
</ol>
<p class="note-red note-last">不要在外面过夜</p>
</div>
<div class="note-echoes" aria-hidden="true"><span>等</span><span>着</span><span>妈</span><span>妈</span><span>妈</span><strong>不要逃。</strong></div>
</article>`;
docs.mother.meta='原文截图 / 保留原始错字、涂改与乱码';
docs.mother.body=originalMotherNote;
const catSourceNote=`<article class="note-page source-note note-cat" aria-label="在猫猫的面条中发现的纸条原文">
<header class="note-source-header">
<h3 class="note-heading">*在猫猫的面条中发现的纸条</h3>
<div class="note-meta"><span>1月21日&nbsp;&nbsp;半夜11:49</span><span class="note-tag">未分类 <span aria-hidden="true">▼</span></span></div>
</header>
<div class="note-copy">
<h3 class="note-source-title">*在猫猫的面条中发现的纸条</h3>
<p class="note-subtitle">（字迹异常潦草，勉强能看清部分）</p>
<p class="note-rough">这 么多天你 也 <strong>该发现什么了吧？</strong> 那个<br>所谓　的妈妈□□□□□不要相　信它。<br>我会失控，□□不要带上我。邻居会真<br>正　帮助你，你只需　要给　他　他　想<br>要 的，好 好想想 。我不能 告诉你太<br>多。邻居□　□　□　　□□。□□<br>是 好的。相　　信□□<br>□。</p>
<p class="note-escape"><strong>离开这里</strong><span>（非常端正的字迹）</span></p>
</div>
<footer class="note-attribution"><span>©阿瞳</span><span>半次元 - ACG爱好者社区</span></footer>
</article>`;
const exitSourceNote=`<article class="note-page source-note note-exit" aria-label="门口贴着的便签原文">
<header class="note-source-header">
<h3 class="note-heading">*门口贴着的便签</h3>
<div class="note-meta"><span>今天&nbsp;&nbsp;中午12:29</span><span class="note-tag">未分类 <span aria-hidden="true">▼</span></span></div>
</header>
<div class="note-copy">
<h3 class="note-source-title">*门口贴着的便签</h3>
<p class="note-door-intro">如果你看见了这张便签，那么说明你需要出门了，遵守便签上的规则，<strong>把它握在手里。</strong></p>
<p class="note-crossline" aria-label="原图中被划掉的文字"><span class="note-scribble"></span></p>
<ol class="note-door-rules">
<li>出门时确认怀中的猫猫是活着的，并且没有大片脱毛。</li>
<li>确认邻居没有跟着你。</li>
<li>小心楼道里的镜子。</li>
<li>在电梯里请无视任何人，<strong>妈妈也不行。</strong></li>
<li>不要离开小区。</li>
<li>你在行走时应该有两个脚步声，而不是只有你一个，当然，不要让任何人跟着你。</li>
<li>在黄昏前回到家中，无论家里发生了什么出现了什么，请无视。回到房间锁上门，第二天会好的。</li>
<li>如果第二天房间里的东西依然没有消散，<strong>打开衣柜，找到妈妈所有的<span class="note-blue">蓝色上衣</span>并从阳台扔出去。</strong> 大家不会指责你。</li>
<li>如果邻居提出要帮你，<u>立刻拒绝然后无视他</u>，不要理会他之后说的任何话。<strong>妈妈才是正确的。</strong></li>
</ol>
</div>
<footer class="note-attribution"><span>共 389&nbsp;&nbsp;©阿瞳</span><span>半次元 - ACG爱好者社区</span></footer>
</article>`;
const diarySourceNote=`<article class="note-page source-note note-diary" aria-label="在衣柜边上一个隐藏角落发现的日记原文">
<header class="note-source-header">
<h3 class="note-heading">*在衣柜边上一个隐藏角落发现的日记</h3>
<div class="note-meta"><span>今天&nbsp;&nbsp;中午12:37</span><span class="note-tag">未分类 <span aria-hidden="true">▼</span></span></div>
</header>
<div class="note-copy note-diary-copy">
<h3 class="note-source-title">*在衣柜边上一个隐藏角落发现的日记</h3>
<p class="note-subtitle">（很破旧的日记，看起来有些年头）</p>
<section class="note-diary-entry">
<h4 class="note-diary-date note-blue">十二月二日</h4>
<p><span class="note-blue">今天</span>妈妈出差了呢，要三十天才会回家，还写了一些莫名其妙的规则，完全看不懂(≧﹏≦)</p>
</section>
<section class="note-diary-entry">
<h4 class="note-diary-date note-blue">十二月七日</h4>
<p>这段时间我一直在和小咪玩~小咪真的很乖，只不过它好像讨厌吃猫粮，还把我抓伤了，真是奇怪！</p>
</section>
<section class="note-diary-entry">
<h4 class="note-diary-date">十二月？日</h4>
<p>感觉已经过了很久了呢，妈妈还有多少天回来呢？玩的太开心已经忘了今天多少号了。昨晚晚上小咪来我房间睡觉了！好开心，我抱着小咪一起睡了。但是半夜感觉小咪的呼吸声好重哦，晚上一直不睡，感觉在盯着我，小咪的毛什么时候有这么长? 我的眼皮好重，睁不开。</p>
</section>
<section class="note-diary-entry">
<h4 class="note-diary-date">十二月？日</h4>
<p>刚才有人在敲门！我用猫眼看到门外站着一个长得像鱼的大叔，好奇怪……他一直在不停的敲门，我太害怕了，妈妈说要躲在床下面，但是床下面太挤了，就躲进了衣柜。躲进去没多久外面就没声了，真是太好了！衣柜里面太舒服了我就睡了一觉。</p>
</section>
<section class="note-diary-entry">
<h4 class="note-diary-date">十二月？日</h4>
<p>我好像生病了，最近好像总是出现幻觉。我看到小咪身上的毛脱光了，变得像一个婴儿。偶尔会看见一个阿姨坐在家里的沙发上，她不理我。窗外总是有一个人影，这是29楼啊，一定是假的。我感觉我的脑子越来越不清醒了，可能是发烧了。</p>
</section>
<section class="note-diary-entry note-diary-corrupt">
<h4 class="note-diary-date">? 月? 日</h4>
<p>已经... ...多久 了......? 妈 妈 什么<br>时候才会回来......每天都 会睡好久......<br>小咪不 知 道从 什么 时候开始找 不<br>到了 ?... ...我好 无聊... ...家 里的<br>人们都不理我... ...我 经 常 着镜<br>子发 呆。我原来... ...是长 这样<br>吗? ... ...</p>
</section>
<section class="note-diary-entry">
<h4 class="note-diary-date">十二月三十二日</h4>
<p>好开心！！！妈妈终于回来了！！！妈妈告诉我<span class="note-blue">今天</span>已经是三十二号了，过了这么长时间呀，我跟妈妈讲了这个月我干了什么，妈妈给我吃了药，我已经好多了！现在我要和妈妈出去玩啦~</p>
</section>
</div>
<footer class="note-attribution"><span>共 716&nbsp;&nbsp;©阿瞳</span><span>半次元 - ACG爱好者社区</span></footer>
</article>`;
Object.assign(docs.cat,{title:'*在猫猫的面条中发现的纸条',meta:'1月21日 半夜11:49 / 未分类',body:catSourceNote});
Object.assign(docs.exit,{title:'*门口贴着的便签',meta:'今天 中午12:29 / 未分类',body:exitSourceNote});
Object.assign(docs.diary,{title:'*在衣柜边上一个隐藏角落发现的日记',meta:'今天 中午12:37 / 未分类',body:diarySourceNote});
const sourceNoteIds=new Set(['mother','cat','exit','diary']);
const dailyBeats={
 1:{title:'纸边的温度',text:'桌上纸条的边缘还留着一点温度，像有人刚刚把手移开。',after:'你没有碰那点温度，只把它记在了心里。'},
 2:{title:'门缝的水痕',text:'门缝下多了一道细细的水痕，从楼道一直拖到你的脚边。',after:'水痕在你眨眼后变短了一截。'},
 3:{title:'慢了一分钟',text:'墙上的钟停在 02:17，旧手机的秒针却比昨天慢了一分钟。',after:'你把手机和钟同时拍下来，时间至少还有一个证人。'},
 4:{title:'碗里的黑毛',text:'猫碗里有一根不属于猫猫的黑毛，沾着还没有干的水。',after:'黑毛粘在纸巾上，像一根极细的湿线。'},
 5:{title:'迟来的脚步',text:'你转身以后，门外才响起一串脚步声，停在门前没有继续。',after:'你没有开门，只数清了那串脚步比自己的多一个。'},
 6:{title:'多出来的坐垫',text:'镜子里的沙发比现实多出一个坐垫，坐垫上还有塌下去的痕迹。',after:'你把沙发转向墙壁，镜子里的坐垫却没有消失。'},
 7:{title:'柜中的翻页声',text:'衣柜门缝里传出纸页翻动的声音，翻页间隔正好和你的呼吸一样长。',after:'声音停了，柜门里留下了三下轻轻的敲击。'},
 8:{title:'不看脸的猫',text:'猫猫今天不再看你的脸，只盯着你的肩膀和身后那块空地。',after:'你站到光线里，猫猫的视线仍然没有移开。'},
 9:{title:'面条残渣',text:'猫碗底留着一圈黏住的面条残渣，白色的纸角从里面露出来。',after:'你把碗底擦干净，纸角上出现了一个不像妈妈的字。'},
 10:{title:'少了一位数字',text:'楼道里的门牌少了一位数字，邻居家的门却仍然在原来的位置。',after:'你在记录里写下楼层，写完后数字又变回来了。'},
 11:{title:'重复的云',text:'窗外的云和昨天一模一样，连最薄的边缘都没有移动。',after:'你闭眼数到十再睁开，云才终于换了一个形状。'},
 12:{title:'收音机里的名字',text:'收音机突然吐出你的名字，下一秒又只剩下刺耳的白噪音。',after:'你放下红色毛线，白噪音里短暂出现了一声敲门。'},
 13:{title:'红线的温度',text:'口袋里的红色毛线变得温热，线头朝着门口缓慢垂下。',after:'线头停在门缝前，没有碰到地面。'},
 14:{title:'日记的药味',text:'旧日记的纸页沾着淡淡的药味，刚才还没有这么重。',after:'你把日记合上，药味从衣柜的方向传了过来。'},
 15:{title:'慢半拍的倒影',text:'你抬手时，镜子里的手晚了半拍才抬起来。',after:'你没有再看第二次，只在记录里画了一条横线。'},
 16:{title:'门口等候的猫',text:'猫猫第一次趴在门口等你，听见脚步后却立刻退回客厅。',after:'她的爪印停在门槛内侧，没有越过那条线。'},
 17:{title:'发热的门把手',text:'门把手比墙壁温暖，像刚被谁从外面握过。',after:'你用衣袖碰了一下，门外传来很轻的笑声。'},
 18:{title:'重新排好的灰尘',text:'你刚扫过的灰尘又排成一串脚印，脚尖全部朝向衣柜。',after:'你没有继续打扫，把脚印连同日期一起记了下来。'},
 19:{title:'没有这一天',text:'手机日历短暂地跳到了一个没有名字的日期，随后恢复正常。',after:'你把今天的日期写在手背上，直到它被水洗掉。'},
 20:{title:'床底的呼吸',text:'床底传出缓慢的呼吸声，节奏和猫猫不一样。',after:'你没有低头，床底的呼吸也没有靠近。'},
 21:{title:'方向相反的影子',text:'窗外的影子朝着太阳的方向延伸，和房间里的光完全相反。',after:'你拉上薄纱，影子仍然留在玻璃上。'},
 22:{title:'白光移近',text:'角落的白光比昨天近了一点，像是有人把脸贴到了黑暗里。',after:'你移开视线，白光才退回原来的位置。'},
 23:{title:'蓝色衣角',text:'衣柜门缝里露出一小截蓝色衣角，纸条上没有写过它什么时候出现。',after:'你没有拉开柜门，只记住了那块蓝色的形状。'},
 24:{title:'翻到最后一页',text:'日记自己翻到了最后一页，墨迹还没有干，日期却已经写好了。',after:'你按住纸页，最后一行字在指腹下轻轻动了一下。'},
 25:{title:'枕边的猫毛',text:'你的枕边落着一撮猫毛，比猫猫身上的毛更长，也更湿。',after:'猫猫没有进过房间，但毛上沾着她熟悉的气味。'},
 26:{title:'三声敲门',text:'门外响了三声敲门，间隔像有人在认真等待你回答。',after:'第三声结束后，楼道里多出了一次呼吸。'},
 27:{title:'妈妈的声音',text:'收音机里传来妈妈的声音，她叫了你的昵称，却没有叫猫猫。',after:'你关掉收音机，声音仍从墙后说完了那句话。'},
 28:{title:'第三十二格',text:'日历上多出一个没有数字的格子，格子下面写着“明天”。',after:'你划掉那个格子，笔尖却在纸上留下了三十二。'},
 29:{title:'门外的呼吸',text:'门外有一个人贴得很近，呼吸声隔着门板传进来，却没有脚步声。',after:'你把手机音量调到最大，仍无法确认那是不是人的呼吸。'},
30:{title:'九点以前',text:'手机显示 08:59，墙上的钟却第一次开始走动，指针指向了 02:17。',after:'你握紧手机，等门外的三声敲门。'}
};
const ambientAnomalies=[
 {id:'living-damp',area:'living',stage:0,title:'墙上的湿痕',text:'沙发上方多了一块潮湿的墙皮，边缘像指甲抠过。',after:'你用手背碰了碰墙皮，里面传来一下很轻的回声。'},
 {id:'kitchen-cup',area:'kitchen',stage:0,title:'倒满的水杯',text:'厨房水杯被倒满，杯口却没有水面反光，像里面装的是一块黑玻璃。',after:'你没有喝水，把杯子倒扣在水槽里。杯底传来一声叹气。'},
 {id:'bedroom-pillow',area:'bedroom',stage:0,title:'枕头的温度',text:'床上的枕头还带着刚睡过的温度，可你昨晚一直睡在自己的位置。',after:'你把枕头翻过来，另一面压着一小块潮湿的影子。'},
 {id:'door-lamp',area:'door',stage:0,title:'门外的灯',text:'门缝下的楼道灯亮了一下，亮度和你家客厅的灯完全一样。',after:'你退后半步，门缝下的光也跟着退后半步。'},
 {id:'mirror-lamp',area:'mirror',stage:0,title:'镜中的台灯',text:'镜子里的台灯比现实晚了一秒熄灭，灯罩下像藏着一双眼睛。',after:'你移开视线，灯光在镜面里又亮了起来。'},
 {id:'window-fog',area:'window',stage:0,title:'玻璃上的雾',text:'窗玻璃从里面起了一层雾，雾气上有一条刚写完的横线。',after:'你没有擦掉那条线，雾气却沿着它慢慢向下流。'},
 {id:'cat-extra-fur',area:'cat',stage:0,title:'多出来的猫毛',text:'猫猫身边有一撮比她身上的毛更长的毛，末端沾着水。',after:'你把那撮毛夹进记录本，纸页合上后却变得沉甸甸的。'},
 {id:'wardrobe-scratch',area:'wardrobe',stage:0,title:'柜门里的抓痕',text:'衣柜门缝下多了三道新抓痕，木屑落在门外，排列得像三个数字。',after:'你没有打开柜门，只把那三个数字记了下来。醒来时数字已经变了。'},
 {id:'living-cushion',area:'living',stage:1,title:'第二个坐垫',text:'沙发上多出一个坐垫，凹陷的形状像有人刚刚从你身边起身。',after:'你把坐垫放到地上，客厅里立刻少了一把椅子。'},
 {id:'kitchen-date',area:'kitchen',stage:1,title:'变动的日期',text:'冰箱里的食物标签每天都在换日期，今天那张写着“明天”。',after:'你用旧手机拍下标签，照片里只剩下一片白。'},
 {id:'bedroom-prints',area:'bedroom',stage:1,title:'床底的脚印',text:'床底灰尘里有一串脚印，脚尖朝外，尺寸和你的脚一模一样。',after:'你没有低头确认脚印的终点，只把床单压紧了一些。'},
 {id:'door-number',area:'door',stage:1,title:'缺失的门牌',text:'邻居门上的数字少了一位，剩下的数字正好组成今天的日期。',after:'你眨眼后门牌恢复原样，但猫眼里仍映着那串日期。'},
 {id:'mirror-light',area:'mirror',stage:1,title:'少掉的灯光',text:'镜中的客厅少了一盏灯，黑暗的位置正好落在你身后。',after:'你没有回头。那片黑暗在镜面里向前挪了一格。'},
 {id:'window-shadow',area:'window',stage:1,title:'没有落地的影子',text:'窗外的影子悬在半空，没有对应的身体，也没有落到楼下。',after:'影子向玻璃靠近了一点，像在听你有没有呼吸。'},
 {id:'cat-second-shadow',area:'cat',stage:1,title:'碗边的第二个影子',text:'猫碗旁有两个影子，一个属于猫猫，另一个比她高得多。',after:'你移动碗，第二个影子没有跟着移动。'},
 {id:'wardrobe-blue-thread',area:'wardrobe',stage:1,title:'蓝色线头',text:'衣柜门缝里勾出一根蓝色线头，线的另一端像是通向柜门里面。',after:'你松开线头，它自己缩回了门缝，只留下轻微的摩擦声。'},
 {id:'living-shift',area:'living',stage:2,title:'换位的家具',text:'你离开客厅再回来，沙发和窗户的位置互换了，猫猫却仍坐在原处。',after:'你按住门框确认方向，门框在掌心下像呼吸一样起伏。'},
 {id:'kitchen-hand',area:'kitchen',stage:2,title:'第二只手印',text:'灶台上出现一枚湿手印，五根手指都朝向衣柜的方向。',after:'你擦掉手印，抹布上留下了细小的黑色纤维。'},
 {id:'bedroom-slept',area:'bedroom',stage:2,title:'有人睡过',text:'床单中央塌下一个人的轮廓，凹陷里还有一缕陌生的呼吸。',after:'你站在门口没有进去，床上的轮廓慢慢转向了你。'},
 {id:'door-eye-close',area:'door',stage:2,title:'猫眼后的靠近',text:'猫眼另一侧贴得太近，只剩一片灰白的皮肤，没有眼睛。',after:'你没有看第二次，门板另一侧却响起了三下指甲敲击。'},
 {id:'mirror-extra',area:'mirror',stage:2,title:'镜中多出来的人',text:'镜面里站着一个背对你的身影，肩膀和你一样高，头却垂得很低。',after:'你闭上眼数到十，睁眼时身影已经站在镜子里面。'},
 {id:'window-fingerprint',area:'window',stage:2,title:'二十九楼的指纹',text:'窗外玻璃上有一排从外面留下的指纹，指尖全部朝向室内。',after:'你拉上薄纱，指纹隔着布料仍在一枚一枚增加。'},
 {id:'cat-silent-mouth',area:'cat',stage:2,title:'猫猫没有张嘴',text:'猫猫在叫你，可她的嘴没有张开，声音像从沙发下面传出来。',after:'你蹲下之前停住了。沙发下面有一双和猫猫一样的眼睛。'},
 {id:'wardrobe-thread',area:'wardrobe',stage:2,title:'移动的黑丝',text:'门缝外的黑丝正在缓慢爬行，像一根有方向感的血管。',after:'你退到日光里，黑丝停了一会儿，又朝你的影子伸过来。'}
];
function erosionScore(){return Math.min(100,Math.max(0,(state.day-1)*3+state.houseThreat*8+state.furLoss*5));}
function erosionStage(){const score=erosionScore();return score<24?{rank:0,label:'浅'}:score<58?{rank:1,label:'加深'}:{rank:2,label:'严重'};}
function scheduleAnomaly(){const stage=erosionStage().rank;const history=Array.isArray(state.anomalyHistory)?state.anomalyHistory:[];const recent=history.slice(-5);const freshPool=ambientAnomalies.filter(a=>a.stage===stage&&!recent.includes(a.id));const pool=freshPool.length?freshPool:ambientAnomalies.filter(a=>a.stage===stage);const pick=pool[Math.floor(Math.random()*pool.length)]||ambientAnomalies[0];state.anomaly={...pick,day:state.day,seen:false};state.anomalyHistory=[...history,pick.id].slice(-12);}
function ensureAnomaly(){if(!state.anomaly||state.anomaly.day!==state.day)scheduleAnomaly();}
function inspectAnomaly(){const anomaly=state.anomaly;if(!anomaly||anomaly.seen||state.focus<=0)return;state.focus--;anomaly.seen=true;state.insight++;state.events.push('anomaly'+state.day);log('记录侵蚀：'+anomaly.title);finish(anomaly.after);}
function beatFor(day){return dailyBeats[day]||dailyBeats[30];}
function observeBeat(){const beat=beatFor(state.day);if(done('beat'+state.day)||state.focus<=0)return;state.focus--;state.insight++;state.events.push('beat'+state.day);log('记录异常：'+beat.title);finish(beat.after);}
function catStatus(){if(state.sanity<35)return'毛发正在脱落';if(state.furLoss>=3)return'毛发大片脱落，呼吸声很重';if(state.furLoss>0)return'毛发变得稀疏';if(state.events.includes('event8'))return'呼吸声很重，仍在盯着你';if(state.lastFedDay===state.day)return'安心地蜷着身子';return'安静地望着你';}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{$('#save').textContent='本次进度未能保存';}}
function log(t){state.log.unshift(`第 ${state.day} 天 · ${['上午','下午','夜晚'][state.phase]}｜${t}`);state.log=state.log.slice(0,100);save();}
function update(){ensureAnomaly();const erosion=erosionStage();state.sanity=Math.max(0,Math.min(100,state.sanity));$('#day').textContent=`第 ${String(state.day).padStart(2,'0')} 天`;$('#time').textContent=['上午 · 09:00','下午 · 15:00','夜晚 · 21:00'][state.phase];$('#daybar').style.width=state.day/30*100+'%';$('#sanity').innerHTML=`${state.sanity} <small>/ 100</small>`;$('#cat').textContent=catStatus();$('#cluecount').textContent=String(state.clues.length).padStart(2,'0');$('#scene').classList.toggle('night',state.phase===2);$('#mindbar').style.width=state.sanity+'%';$('.game').classList.toggle('danger',state.sanity<35);$('.game').classList.toggle('eroded',erosion.rank>=1);$('#care').textContent=state.lastFedDay===state.day?'今日已喂食':'今日尚未喂食';$('#focus').textContent=`注意力 ${state.focus}/2`;document.querySelectorAll('.paperpoint').forEach(b=>{b.hidden=state.events.includes('motherRead');});const weather=state.phase===2?'夜深':state.day%3?'阴':'短暂放晴';$('#weather').textContent=`十二月 · ${weather}`;$('#erosion').textContent=`屋况·${erosion.label}`;save();}
function say(t,options,label='此刻'){ $('#narrative').textContent=t;$('#storytype').textContent=label;$('#choices').replaceChildren();$('.story-body').scrollTop=0;for(const [name,fn]of options){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{if(!state.ending&&!b.disabled){b.disabled=true;fn();update();if(state.sanity<=0&&!state.ending)end('lost');}};$('#choices').append(b);}update();}
function modal(html,variant='default'){closeMenu();const dialog=$('#modal');dialog.classList.toggle('note-modal',variant==='note');$('#modalcontent').innerHTML=html;$('#modalcontent').scrollTop=0;if(!dialog.open)dialog.showModal();}
function doc(id){if(!state.clues.includes(id)){state.clues.push(id);log('发现了'+docs[id].title);}modal(`<div class="meta">${docs[id].meta}</div><h2>${docs[id].title}</h2>${docs[id].body}`,sourceNoteIds.has(id)?'note':'default');update();}
const areaNames={living:'客厅',bedroom:'卧室',kitchen:'厨房',door:'门口',wardrobe:'衣柜',mirror:'镜子',window:'窗边',cat:'猫猫'};
const back=()=>act(state.area||'living');
const has=item=>state.items.includes(item);
const done=key=>state.events.includes(key);
function finish(text){act(state.area||'living',text);}
function discover(id){doc(id);finish(`你读完了${docs[id].title}，把它收进纸条档案。`);}
function act(a,result){
 if(state.ending){showEnd();return;}
 if(pending&&a!=='paper'){modal('<h2>先处理眼前的异常</h2><p>声音还没有停。请在画面下方选择你的行动。纸条档案仍然可以查阅。</p>');return;}
 if(a==='paper'){if(!done('motherRead'))state.events.push('motherRead');doc('mother');if(!pending)finish('你把妈妈的纸条收好。需要时可以打开纸条档案再读一遍。');return;}
 if(!areaNames[a])a='living';
 state.area=a;
 ensureAnomaly();
 const parent=({cat:'living',mirror:'living',window:'living'})[a]||a;
 document.querySelectorAll('.places button').forEach(b=>{b.classList.toggle('active',b.dataset.act===parent);b.setAttribute('aria-pressed',String(b.dataset.act===parent));});
 $('#roomname').textContent=areaNames[a];
 let text='',options=[];
 if(a==='living'){
  const beat=beatFor(state.day);
  text=`窗帘没有动。你数了一次自己的呼吸，确认这里仍然只有你一个人。${beat.text}`;
  options=[['留意时间，继续这一天',advance]];
  if(!done('clean'+state.day)&&state.focus>0)options.push(['整理客厅（消耗 1 点注意力）',()=>{state.focus--;state.sanity+=4;state.houseThreat=Math.max(0,state.houseThreat-1);state.events.push('clean'+state.day);finish('你擦去了灰尘，把镜面转向墙壁。熟悉的动作让你安定下来。');}]);
  if(!done('beat'+state.day)&&state.focus>0)options.push([`观察：${beat.title}`,observeBeat]);
 }
 if(a==='cat'){
  const abnormal=state.events.includes('event8');
  const fedToday=state.lastFedDay===state.day;
  const furNotice=state.furLoss>=3?`沙发下积着一层细毛，像是从她身上整片剥落的。${state.catMissedDays>1?`她已经连续 ${state.catMissedDays} 天没有吃东西。`:''}`:state.furLoss>0?`沙发边有新掉下来的毛。${state.catMissedDays>1?`她已经连续 ${state.catMissedDays} 天没有吃东西。`:''}`:'';
  text=(fedToday?(abnormal?'猫猫蜷在沙发上，呼吸声仍然很重。':'猫猫蜷在沙发上，碗里还留着清水。'):(abnormal?'猫猫的眼睛随着你移动，碗是空的，她的呼吸声比昨天更重。':'猫猫的眼睛随着你移动。碗是空的，她没有叫。'))+(furNotice?' '+furNotice:'');
  if(state.day>=9&&abnormal&&!state.clues.includes('cat'))text+=' 碗底粘着一圈面条残渣，白色的纸角从里面露出来。';
  if(!fedToday)options.push(['喂水和罐头',()=>{state.lastFedDay=state.day;state.feedCount++;state.catMissedDays=0;state.catFood--;state.catCareDays++;state.catTrust=Math.min(10,state.catTrust+1);log('给猫猫喂水和罐头。');if(state.day>=9&&state.events.includes('event8')&&!state.clues.includes('cat')){doc('cat');finish('猫猫慢慢吃完了面条。你从碗底抽出一张被浸湿的纸条。');}else finish('猫猫慢慢吃完了罐头，用额头轻轻碰了碰你的手。');}]);
  if(state.pet!==state.day)options.push(['轻轻抚摸',()=>{state.sanity+=5;state.catTrust=Math.min(10,state.catTrust+1);state.pet=state.day;finish('你在她耳后摸了两下就收回手。猫猫发出很轻的呼噜声。');}]);
 }
 if(a==='kitchen'){
  text=`冰箱里还有 ${state.food} 份食物和 ${state.catFood} 份猫罐头。${has('phone')?'旧手机显示着准确的时间。':'旧手机插着充电线。'}${has('matches')?'':'煤气灶旁有一盒火柴。'}`;
  if(state.ate!==state.day)options.push(['吃今天的食物',()=>{state.ate=state.day;state.food--;state.sanity+=3;log('吃了一份食物。');finish('你按日期分配好食物。今天的份额已经吃完了。');}]);
  options.push(['用旧手机核对时间',()=>{if(!has('phone')){state.items.push('phone');log('找到了可靠的时间来源：旧手机。');}finish(`手机显示：第 ${state.day} 天，${['09:00','15:00','21:00'][state.phase]}。墙上的钟却停在 02:17。你记住了正确的时间。`);}]);
  if(!has('matches'))options.push(['收起火柴',()=>{state.items.push('matches');finish('你把干燥的火柴放进口袋。');}]);
 }
 if(a==='bedroom'){
  const diaryReady=state.day>=3||done('event2');
  text='床单平整，床底没有光。'+(!state.clues.includes('diary')?(diaryReady?'衣柜边有一本已经能翻开的旧日记。':'衣柜边有一本旧日记，但纸页被潮气粘在了一起。'):'')+(!has('yarn')&&!has('ally')?'床头有一团红色毛线。':'');
  if(!state.clues.includes('diary')&&diaryReady)options.push(['读旧日记',()=>discover('diary')]);
  if(!has('yarn')&&!has('ally'))options.push(['收起红色毛线',()=>{state.items.push('yarn');finish('毛线温热，像是刚被人握过。你把它放进口袋。');}]);
  if(!done('rest'+state.day))options.push(['躲到床底，整理思绪',()=>{state.sanity+=6;state.events.push('rest'+state.day);finish('床底很拥挤，但没有东西能够伤害你。你默数日期，直到呼吸平稳。');}]);
 }
 if(a==='mirror'){
  text=has('covered')?'旧布盖住了镜子。你只能看见布上的褶皱。':'镜中的客厅比身后更深。你看见一截黑色细丝，从衣柜方向延伸到镜框。'+(state.day>=15?'它正在慢慢向客厅伸长。':'');
  if(!has('covered'))options=[['用旧布盖住镜子',()=>{state.items.push('covered');log('盖住客厅的镜子。');finish('布落下时，镜子里似乎有什么东西慢了一拍。');}],['继续盯着倒影',()=>{state.sanity-=18;log('凝视镜子，开始怀疑自己的面容。');finish('你不知道看了多久。倒影先于你眨了眼。清醒程度下降。');}]];
 }
 if(a==='window'){
  text=state.phase===2?'玻璃外有一个贴得很近的轮廓。这里是二十九楼。':'云后透出一束日光。衣柜旁的影子微微收缩，像是活着。';
  if(!done('curtain'))options.push(['拉上薄纱，不再看',()=>{state.events.push('curtain');finish('你拉上薄纱，轮廓被隔在帘子另一侧。');}]);
  if(!has('sun'))options.push(['记住影子与日光的关系',()=>{state.items.push('sun');log('它依附在太阳光形成的阴影中。');finish('日光消失时，那道黑丝也退回柜子边缘。你记下了这个细节。');}]);
 }
 if(a==='wardrobe'){
  text=`柜门里有指甲划过木板的声音。门缝外垂着一缕黑丝。${state.day>=23?'蓝色衣角已经露出了一小截。':''}你想起纸条：任何情况下，不要打开衣柜。`;
  options=[['打开柜门',()=>{state.sanity-=45;state.houseThreat+=2;log('打开衣柜，失去了几段记忆。');finish('里面的房间，和外面一模一样。你立刻把柜门关上，手心满是冷汗。');}]];
  if(canEscape())options.push(['借日光烧断柜外黑丝',escapeEvent]);
 }
 if(a==='door'){
  const noteReady=state.day>=12||done('event12');
  const neighborReady=state.day>=12||done('event12');
  text=has('ally')?'门外的人收下了红线，正等待你的下一步行动。':'猫眼是一粒很深的黑点。你听见楼道里有衣料摩擦的声音。';
  if(!state.clues.includes('exit')){if(noteReady)options.push(['阅读门口便签',()=>discover('exit')]);else text+=' 门上贴着一张便签，但胶带和湿气把字迹粘住了。';}
  if(neighborReady)options.push(['听门外的动静',()=>{
   if(state.phase===2){finish('没有脚步，只有妈妈的声音在叫你。你决定不看猫眼。');return;}
   if(has('ally')){finish('楼道里没有低语。邻居仍在等你行动，不再索要红线。');return;}
   say('没有表情的中年男人站在外面。他的视线停在你的口袋。',[
    ['隔着门询问他想要什么',()=>say('“红色的线。”他只说了四个字。',[
     ...(has('yarn')?[['从门缝递出红色毛线',()=>{state.items=state.items.filter(i=>i!=='yarn');state.items.push('ally');state.neighborTrust=2;state.insight++;doc('neighbor');finish('门外的人接过红线。走廊另一头的低语停了。你记下了他的提示。');}]]:[]),
     ['停止交谈',()=>finish('你不再说话，留意着门外的声音。')]
    ])],['不理会他',()=>finish('你没有回应，继续留在门口。')]
   ]);
  }]);
  else options.push(['贴近门听一听',()=>finish('门外暂时没有回应。你还没有足够的理由打开这扇门。')]);
 }
 const ambient=state.anomaly;
 if(ambient&&ambient.area===a){text+=` ${ambient.text}`;if(!ambient.seen&&state.focus>0)options.push([`记录侵蚀：${ambient.title}`,inspectAnomaly]);}
 else if(a==='living'&&ambient&&!ambient.seen)text+=` 空气里有一丝异样，似乎从${areaNames[ambient.area]}传来。`;
 say(result||text,options);
}
function canEscape(){return state.day>=12&&state.events.includes('event8')&&['ally','matches','sun','covered'].every(x=>state.items.includes(x))&&state.phase!==2;}
function escapeEvent(){pending=true;state.pending='escape';say('日光落在柜边。黑丝在火焰中蜷缩，门外传来邻居拖住某个东西的声音。猫猫挡在门前，背部开始大片脱毛。',[['独自从楼梯离开，不回头',()=>{pending=false;state.pending=null;end('escape');}],['抱起猫猫一起离开',()=>{pending=false;state.pending=null;end('catfall');}],['留在家里等待',()=>{pending=false;state.pending=null;state.sanity-=10;back();}]],'抉择');}
const events={2:['白天的敲门','门外站着一个脖子歪斜的男人。你已经等了五分钟，敲门声没有停。',['躲进床底','打开衣柜躲进去'],0],5:['夜里的声音','“宝贝，是妈妈。开门呀。”门外的声音很熟悉，但现在是夜晚。',['凑近猫眼确认','安静退回床边'],1],8:['不肯离开的猫猫','猫猫进入卧室，怎么也不肯离开。她的呼吸越来越重。',['开着门窗，清醒地看着她','抱着她关门睡觉'],0],12:['物件的怪响','收音机持续发出尖锐的声音。你想起规则，还摸到了口袋里的红色毛线。',['放下毛线，安静去门口看猫眼','带着毛线去开门'],0],17:['背对着你的人','邻居背对着门。他的脸却朝向你，正在笑。',['请他进来帮忙','关门，退回床底'],1],22:['白光','角落里有一道白光注视着你。纸条上的红字说，衣柜才是正确的。',['进入衣柜','绕开暗处，躲进床底'],1],27:['妈妈回来了','“日历不准，今天已经是第三十二天了。”女人端着饭站在客厅。',['避开视线，回房核对手机','吃饭，听她解释'],0]};
function advance(){if(state.day===30){arrival();return;}if(state.phase<2){state.phase++;if(events[state.day]&&state.phase===([2,12,17,22].includes(state.day)?1:2)&&!state.events.includes('event'+state.day)){runEvent();return;}const beat=beatFor(state.day);say(state.phase===1?`午后的光线缓慢移向衣柜。你还有时间吃饭、照顾猫猫、寻找线索。${beat.text}`:`夜深了。睡前，记得确认猫猫留在客厅。${state.houseThreat>=3?'门缝外的黑影比昨天更近。':''}`,[['继续探索',back],...(state.phase===2?[['确认猫猫在客厅，休息到明天',sleep]]:[['等到夜晚',advance]])]);}else sleep();}
function sleep(){const warnings=[];if(state.lastFedDay!==state.day){state.catMissedDays++;state.furLoss++;if(!state.events.includes('catFur')){state.events.push('catFur');log('猫猫开始掉毛。');}state.sanity-=10;warnings.push(`没有喂猫猫，她掉了一些毛（累计掉毛 ${state.furLoss} 次）`);}if(state.ate!==state.day){state.sanity-=8;warnings.push('饥饿让你难以集中注意');}if(!state.items.includes('phone')){state.sanity-=5;warnings.push('缺少可靠时间，你越来越茫然');}state.focus=2;state.day++;state.phase=0;log('又度过了一夜。');if(state.sanity<=0){end('lost');return;}say(warnings.length?warnings.join('；')+'。新的一天开始了。':'你在手机上记下一道日期。又是一天。猫猫仍然躺在沙发上。',[['开始今天的探索',back],...(state.day===30?[['确认上午九点的敲门声',arrival]]:[])],'新一天');}
function runEvent(){const e=events[state.day];pending=true;state.pending='daily';if(!state.events.includes('event'+state.day))state.events.push('event'+state.day);say(e[1],e[2].map((s,i)=>[s,()=>{pending=false;state.pending=null;const ok=i===e[3];state.sanity+=ok?3:-27;if(ok)state.insight++;else{state.houseThreat++;if(state.day===8)state.catTrust=Math.max(0,state.catTrust-2);}log(`${e[0]}：${s}。`);say(ok?'你没有跟随那句诱人的建议。很久以后，异常消失了。':'周围突然安静下来。你失去了一段记忆，醒来时已经站在床边。清醒程度大幅下降。',[['继续探索当前区域',back]],ok?'平安':'侵蚀');}]),e[0]);}
function arrival(){pending=true;state.pending='arrival';say(`第 30 天，上午九点。门外响起三声敲门。“我回来了。”你握着手机，猫猫安静地坐在你身边。${state.furLoss?'她的毛发比一个月前稀疏了一些，你不知道妈妈会不会注意到。':''}`,[['核对时间与妈妈的样子，再开门',()=>{pending=false;state.pending=null;end(state.items.includes('phone')&&state.sanity>=45&&state.feedCount>=29?'wait':'falsemother');}],['不打开门，继续寻找逃生办法',()=>{pending=false;state.pending=null;back();}]],'最后一天');}
const endings={wait:['归家','你核对了九点的时间。门外的人完整、熟悉，没有诡异的笑容。妈妈抱住你，猫猫走过她的脚边。衣柜里的声音终于停了。','存活结局 · 等待','你守住了清醒，也守住了家里的猫猫。'],escape:['门外的天光','你没有回头。邻居替你挡住了楼道深处的影子，黑丝在日光和火焰中断开。你走下二十九层楼梯，第一次看见没有玻璃隔着的天空。','存活结局 · 逃离','火柴与黑丝的破局方式为本作改编设定。猫猫和妈妈的命运仍未揭晓。'],lost:['十二月三十二日','你忘了在等谁。镜子里的人告诉你，今天是十二月三十二日。你觉得这个日子没有什么不对。','迷失结局','保持清醒：核对手机、按时吃饭、照顾猫猫，警惕矛盾的补充文字。'],catfall:['怀中的陌生人','走到楼梯转角时，怀里的重量变了。猫毛落满你的手臂。你听见一个人贴着你的耳朵说：我告诉过你。','侵蚀结局','逃离前，重新读一遍猫猫藏起的纸条。'],falsemother:['迟来的拥抱','你没能确认时间，或已经太难辨别眼前的人。女人走进门，遮住你手里的纸条。“以后都听妈妈的。”','侵蚀结局','正常的妈妈会准时回来。可靠的时间、足够的清醒和猫猫的状态缺一不可。']};
function end(id){state.ending=id;log('抵达结局：'+endings[id][0]);update();say('这段故事已经结束。你可以回看档案，或重新开始寻找另一条路线。',[],'终章');showEnd();}
function showEnd(){const e=endings[state.ending];modal(`<div class="meta">${e[2]}</div><h2>${e[0]}</h2><p>${e[1]}</p><p class="ending">${e[3]}</p><button class="action" id="again">重新开始</button>`);$('#again').onclick=restart;}
function restart(){modal('<h2>重新翻开这张纸条？</h2><p>当前生存进度将被新的一天替代。</p><button class="action" id="confirmRestart">确认重新开始</button>');$('#confirmRestart').onclick=()=>{state=fresh();pending=false;state.pending=null;$('#modal').close();log('在家中醒来。');back();};}
document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));$('.close').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
$('#archive').onclick=()=>{modal('<div class="meta">已收集的文字 / 请交叉核对</div><h2>纸条档案</h2>'+state.clues.map(id=>`<button class="archive-link" data-doc="${id}">${docs[id].title}</button>`).join('')+`<p class="meta">随身物品：${state.items.map(i=>({phone:'旧手机',matches:'火柴',yarn:'红色毛线',covered:'镜子已遮盖',sun:'日光线索',ally:'邻居的协助'}[i])).join('、')||'暂无'}</p>`);document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>doc(b.dataset.doc));};
$('#journal').onclick=()=>{modal(`<div class="meta">你留下的日期，证明你没有迷失 / 已喂猫 ${state.feedCount} 次 / 已记录异常 ${state.insight} 条</div><h2>生存记录</h2><div id="logs"></div>`);for(const line of state.log){const p=document.createElement('p');p.className='logentry';p.textContent=line;$('#logs').append(p);}if(!state.log.length)$('#logs').textContent='故事才刚刚开始。';};
$('#restart').onclick=restart;$('#help').onclick=()=>modal('<div class="meta">规则怪谈 · 交互小说</div><h2>在这里活下去</h2><p>点击画面中的光点或下方地点，检查物品、发现纸条。通过客厅的“继续这一天”推进上午、下午与夜晚；夜晚休息进入下一天。探索本身不消耗时间。</p><p>每天记得吃饭、喂猫，并找到可靠的计时工具。喂猫次数会累计；漏喂一晚会让猫猫掉毛，并留下越来越明显的异变。客厅每天有两点注意力，可以用来观察当天的异常，或整理客厅降低房屋威胁；注意力会在新的一天恢复。异常事件出现时，请依据线索选择行动。清醒降到零，便会迷失。</p><p>部分文字会随着日期和事件逐步显现：日记至少要等到第 3 天，门口便签要等到第 12 天，猫猫纸条会在经历猫猫异常后的下一次照顾中出现。你可以等到第 30 天；等待结局需要累计喂猫至少 29 次，也可以在第 12 天之后准备一条更早离开的路。</p><p>进度保存在当前浏览器。声音默认关闭。</p><p class="meta">根据用户提供的《妈妈留的纸条》及作者 QA 改编。压缩了部分文字，事件日期与具体逃生仪式为游戏创作。含心理恐怖，无突发跳脸。故事中的危险指令仅属于虚构情境。</p>');
$('#sound').onclick=()=>{if(osc){osc.stop();osc=null;audioCtx.close();audioCtx=null;$('#sound').innerHTML='声音 关 <span>◌</span>';return;}try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();osc=audioCtx.createOscillator();const g=audioCtx.createGain();osc.type='sine';osc.frequency.value=65;g.gain.value=.025;osc.connect(g);g.connect(audioCtx.destination);osc.start();$('#sound').innerHTML='声音 开 <span>◉</span>';}catch{$('#sound').textContent='声音不可用';}};
update();if(state.ending)showEnd();else if(state.pending==='daily')runEvent();else if(state.pending==='escape')escapeEvent();else if(state.pending==='arrival')arrival();else if(state.log.length||state.area!=='living')back();

// Native-style controls: menus never replace a pending story choice.
function closeMenu(){ $('#pause-panel').hidden=true;$('#menu').setAttribute('aria-expanded','false'); }
$('#menu').onclick=()=>{const panel=$('#pause-panel');panel.hidden=!panel.hidden;$('#menu').setAttribute('aria-expanded',String(!panel.hidden));};
$('#close-menu').onclick=closeMenu;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener('pointerdown',e=>{if(!$('#pause-panel').hidden&&!$('#pause-panel').contains(e.target)&&!$('#menu').contains(e.target))closeMenu();});
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();}else{modal('<h2>沉浸游玩</h2><p>当前设备不支持页面全屏。可通过浏览器的分享菜单，将游戏添加到主屏幕后打开。</p>');}}catch{modal('<h2>继续游玩</h2><p>设备未允许进入全屏，当前游戏进度已保留。</p>');}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'退出全屏':'沉浸全屏';});
// Suspend ambience when the game goes into the background.
document.addEventListener('visibilitychange',()=>{if(audioCtx){if(document.hidden)audioCtx.suspend();else audioCtx.resume();}});
// Artwork and points share one plane. Reserve room for the real HUD and dialogue sizes.
function fitScene(){const game=$('.game'),hud=$('.hud').getBoundingClientRect(),bottom=$('.bottom-ui').getBoundingClientRect(),bounds=game.getBoundingClientRect();game.style.setProperty('--scene-top',Math.max(0,hud.bottom-bounds.top+14)+'px');game.style.setProperty('--scene-bottom',Math.max(0,bounds.bottom-bottom.top+8)+'px');}
if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(fitScene);observer.observe($('.hud'));observer.observe($('.bottom-ui'));observer.observe($('.game'));fitScene();}
