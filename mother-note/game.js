'use strict';
const $=s=>document.querySelector(s), KEY='mothers-note-v1';
const fresh=()=>({version:1,day:1,phase:0,sanity:100,food:30,catFood:30,fed:0,ate:0,pet:0,clues:['mother'],items:[],events:[],log:[],ending:null,pending:null});
let state=fresh();try{const s=JSON.parse(localStorage.getItem(KEY));if(s?.version===1&&Number.isInteger(s.day)&&s.day>=1&&s.day<=30&&Array.isArray(s.clues)&&Array.isArray(s.items)&&Array.isArray(s.events)&&Array.isArray(s.log))state={...fresh(),...s};}catch{}
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
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{$('#save').textContent='本次进度未能保存';}}
function log(t){state.log.unshift(`第 ${state.day} 天 · ${['上午','下午','夜晚'][state.phase]}｜${t}`);state.log=state.log.slice(0,100);save();}
function update(){state.sanity=Math.max(0,Math.min(100,state.sanity));$('#day').textContent=`第 ${String(state.day).padStart(2,'0')} 天`;$('#time').textContent=['上午 · 09:00','下午 · 15:00','夜晚 · 21:00'][state.phase];$('#daybar').style.width=state.day/30*100+'%';$('#sanity').innerHTML=`${state.sanity} <small>/ 100</small>`;$('#cat').textContent=state.sanity<35?'毛发正在脱落':state.fed===state.day?'安心地蜷着身子':'安静地望着你';$('#cluecount').textContent=String(state.clues.length).padStart(2,'0');$('#scene').classList.toggle('night',state.phase===2);$('#mindbar').style.width=state.sanity+'%';$('.game').classList.toggle('danger',state.sanity<35);$('#care').textContent=state.fed===state.day?'今日已喂食':'今日尚未喂食';$('#weather').textContent=`十二月 · ${state.phase===2?'夜深':state.day%3?'阴':'短暂放晴'}`;save();}
function say(t,options,label='此刻'){ $('#narrative').textContent=t;$('#storytype').textContent=label;$('#choices').replaceChildren();$('.story-body').scrollTop=0;for(const [name,fn]of options){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{if(!state.ending){fn();update();if(state.sanity<=0&&!state.ending)end('lost');}};$('#choices').append(b);}update();}
function modal(html,variant='default'){closeMenu();const dialog=$('#modal');dialog.classList.toggle('note-modal',variant==='note');$('#modalcontent').innerHTML=html;$('#modalcontent').scrollTop=0;if(!dialog.open)dialog.showModal();}
function doc(id){if(!state.clues.includes(id)){state.clues.push(id);log('发现了'+docs[id].title);}modal(`<div class="meta">${docs[id].meta}</div><h2>${docs[id].title}</h2>${docs[id].body}`,id==='mother'?'note':'default');update();}
const back=()=>act('living');
function act(a){if(state.ending){showEnd();return;}if(pending&&a!=='paper'){modal('<h2>先处理眼前的异常</h2><p>声音还没有停。请在画面下方选择你的行动。纸条档案仍然可以查阅。</p>');return;}
 document.querySelectorAll('.places button').forEach(b=>{b.classList.toggle('active',b.dataset.act===a);b.setAttribute('aria-pressed',String(b.dataset.act===a));});$('#roomname').textContent=({living:'客厅',bedroom:'卧室',kitchen:'厨房',door:'门口',wardrobe:'衣柜',mirror:'镜子',window:'窗边',cat:'猫猫',paper:'纸条'})[a]||'客厅';
 if(a==='paper'){doc('mother');return;}
 if(a==='living')say('窗帘没有动。你数了一次自己的呼吸，确认这里仍然只有你一个人。',[['留意时间，继续这一天',advance],['整理客厅',()=>{state.sanity+=state.events.includes('clean'+state.day)?0:4;state.events.push('clean'+state.day);say('你擦去了灰尘，把镜面转向墙壁。熟悉的动作让你安定下来。',[['回到客厅',back]]);}]]);
 if(a==='cat')say('猫猫的眼睛随着你移动。碗是空的，她没有叫。',[['喂水和罐头',()=>{if(state.fed===state.day)return say('今天已经喂过猫猫。她把爪子搭在碗沿，推开了你的手。',[['回到客厅',back]]);state.fed=state.day;state.catFood--;log('给猫猫喂水和罐头。');if(state.day>=2&&!state.clues.includes('cat')){doc('cat');}say('猫猫慢慢吃完了罐头，用额头轻轻碰了碰你的手。',[['回到客厅',back]]);}],['轻轻抚摸',()=>{if(state.pet!==state.day){state.sanity+=5;state.pet=state.day;}say('你在她耳后摸了两下就收回手。猫猫发出很轻的呼噜声。',[['回到客厅',back]]);}]]);
 if(a==='kitchen')say(`冰箱里还有 ${state.food} 份食物和 ${state.catFood} 份猫罐头。旧手机插着充电线，煤气灶旁有一盒火柴。`,[['吃今天的食物',()=>{if(state.ate!==state.day){state.ate=state.day;state.food--;state.sanity+=3;log('吃了一份食物。');}say('你按日期分配好食物。今天的份额已经吃完了。',[['继续查看厨房',()=>act('kitchen')]]);}],['用旧手机核对时间',()=>{if(!state.items.includes('phone')){state.items.push('phone');log('找到了可靠的时间来源：旧手机。');}say(`手机显示：第 ${state.day} 天，${['09:00','15:00','21:00'][state.phase]}。墙上的钟却停在 02:17。你记住了正确的时间。`,[['回到客厅',back]]);}],['收起火柴',()=>{if(!state.items.includes('matches'))state.items.push('matches');say('你把干燥的火柴放进口袋。',[['回到客厅',back]]);}]]);
 if(a==='bedroom')say('床单平整，床底没有光。衣柜边有一本旧日记，床头有一团红色毛线。',[['读旧日记',()=>doc('diary')],['收起红色毛线',()=>{if(!state.items.includes('yarn'))state.items.push('yarn');say('毛线温热，像是刚被人握过。你把它放进口袋。',[['回到客厅',back]]);}],['躲到床底，整理思绪',()=>{if(!state.events.includes('rest'+state.day)){state.sanity+=6;state.events.push('rest'+state.day);}say('床底很拥挤，但没有东西能够伤害你。你默数日期，直到呼吸平稳。',[['回到客厅',back]]);}]]);
 if(a==='mirror')say('镜中的客厅比身后更深。你看见一截黑色细丝，从衣柜方向延伸到镜框。',[['用旧布盖住镜子',()=>{if(!state.items.includes('covered'))state.items.push('covered');log('盖住客厅的镜子。');say('布落下时，镜子里似乎有什么东西慢了一拍。',[['回到客厅',back]]);}],['继续盯着倒影',()=>{state.sanity-=18;log('凝视镜子，开始怀疑自己的面容。');say('你不知道看了多久。倒影先于你眨了眼。清醒程度下降。',[['马上离开',back]]);}]]);
 if(a==='window')say(state.phase===2?'玻璃外有一个贴得很近的轮廓。这里是二十九楼。':'云后透出一束日光。衣柜旁的影子微微收缩，像是活着。',[['拉上薄纱，不再看',back],['记住影子与日光的关系',()=>{if(!state.items.includes('sun'))state.items.push('sun');log('它依附在太阳光形成的阴影中。');say('日光消失时，那道黑丝也退回柜子边缘。你记下了这个细节。',[['回到客厅',back]]);}]]);
 if(a==='wardrobe')say('柜门里有指甲划过木板的声音。门缝外垂着一缕黑丝。你想起纸条：任何情况下，不要打开衣柜。',[['离开衣柜',back],['打开柜门',()=>{state.sanity-=45;log('打开衣柜，失去了几段记忆。');say('里面的房间，和外面一模一样。你差点走进去。再回神时，你的手心满是冷汗。',[['立刻关上，退到床边',()=>act('bedroom')]]);}],...(canEscape()?[['借日光烧断柜外黑丝',escapeEvent]]:[])]);
 if(a==='door')say('猫眼是一粒很深的黑点。门边贴着一张便签。你听见楼道里有衣料摩擦的声音。',[['阅读门口便签',()=>doc('exit')],['听门外的动静',()=>{if(state.phase===2){say('没有脚步，只有妈妈的声音在叫你。你决定不看猫眼。',[['退回客厅',back]]);return;}say('没有表情的中年男人站在外面。他的视线停在你的口袋。',[['隔着门询问他想要什么',()=>{say('“红色的线。”他只说了四个字。',[...(state.items.includes('yarn')?[['从门缝递出红色毛线',()=>{state.items=state.items.filter(i=>i!=='yarn');if(!state.items.includes('ally'))state.items.push('ally');doc('neighbor');say('门外的人接过红线。走廊另一头的低语停了。你记下了他的提示。',[['回到客厅',back]]);}]]:[]),['离开门口',back]]);}],['不理会他',back]]); }]]);
}
function canEscape(){return ['ally','matches','sun','covered'].every(x=>state.items.includes(x))&&state.phase!==2;}
function escapeEvent(){pending=true;state.pending='escape';say('日光落在柜边。黑丝在火焰中蜷缩，门外传来邻居拖住某个东西的声音。猫猫挡在门前，背部开始大片脱毛。',[['独自从楼梯离开，不回头',()=>{pending=false;state.pending=null;end('escape');}],['抱起猫猫一起离开',()=>{pending=false;state.pending=null;end('catfall');}],['留在家里等待',()=>{pending=false;state.pending=null;state.sanity-=10;back();}]],'抉择');}
const events={2:['白天的敲门','门外站着一个脖子歪斜的男人。你已经等了五分钟，敲门声没有停。',['躲进床底','打开衣柜躲进去'],0],5:['夜里的声音','“宝贝，是妈妈。开门呀。”门外的声音很熟悉，但现在是夜晚。',['凑近猫眼确认','安静退回床边'],1],8:['不肯离开的猫猫','猫猫进入卧室，怎么也不肯离开。她的呼吸越来越重。',['开着门窗，清醒地看着她','抱着她关门睡觉'],0],12:['物件的怪响','收音机持续发出尖锐的声音。你想起规则，还摸到了口袋里的红色毛线。',['放下毛线，安静去门口看猫眼','带着毛线去开门'],0],17:['背对着你的人','邻居背对着门。他的脸却朝向你，正在笑。',['请他进来帮忙','关门，退回床底'],1],22:['白光','角落里有一道白光注视着你。纸条上的红字说，衣柜才是正确的。',['进入衣柜','绕开暗处，躲进床底'],1],27:['妈妈回来了','“日历不准，今天已经是第三十二天了。”女人端着饭站在客厅。',['避开视线，回房核对手机','吃饭，听她解释'],0]};
function advance(){if(state.day===30){arrival();return;}if(state.phase<2){state.phase++;if(events[state.day]&&state.phase===([2,12,17,22].includes(state.day)?1:2)&&!state.events.includes('event'+state.day)){runEvent();return;}say(state.phase===1?'午后的光线缓慢移向衣柜。你还有时间吃饭、照顾猫猫、寻找线索。':'夜深了。睡前，记得确认猫猫留在客厅。',[['继续探索',back],...(state.phase===2?[['确认猫猫在客厅，休息到明天',sleep]]:[['等到夜晚',advance]])]);}else sleep();}
function sleep(){const warnings=[];if(state.fed!==state.day){state.sanity-=10;warnings.push('没有喂猫猫，她的毛发掉落了一些');}if(state.ate!==state.day){state.sanity-=8;warnings.push('饥饿让你难以集中注意');}if(!state.items.includes('phone')){state.sanity-=5;warnings.push('缺少可靠时间，你越来越茫然');}state.day++;state.phase=0;log('又度过了一夜。');if(state.sanity<=0){end('lost');return;}say(warnings.length?warnings.join('；')+'。新的一天开始了。':'你在手机上记下一道日期。又是一天。猫猫仍然躺在沙发上。',[['开始今天的探索',back],...(state.day===30?[['确认上午九点的敲门声',arrival]]:[])],'新一天');}
function runEvent(){const e=events[state.day];pending=true;state.pending='daily';if(!state.events.includes('event'+state.day))state.events.push('event'+state.day);say(e[1],e[2].map((s,i)=>[s,()=>{pending=false;state.pending=null;const ok=i===e[3];state.sanity+=ok?3:-27;log(`${e[0]}：${s}。`);say(ok?'你没有跟随那句诱人的建议。很久以后，异常消失了。':'周围突然安静下来。你失去了一段记忆，醒来时已经站在床边。清醒程度大幅下降。',[['回到客厅',back]],ok?'平安':'侵蚀');}]),e[0]);}
function arrival(){pending=true;state.pending='arrival';say('第 30 天，上午九点。门外响起三声敲门。“我回来了。”你握着手机，猫猫安静地坐在你身边。',[['核对时间与妈妈的样子，再开门',()=>{pending=false;state.pending=null;end(state.items.includes('phone')&&state.sanity>=45&&state.fed>=29?'wait':'falsemother');}],['不打开门，继续寻找逃生办法',()=>{pending=false;state.pending=null;back();}]],'最后一天');}
const endings={wait:['归家','你核对了九点的时间。门外的人完整、熟悉，没有诡异的笑容。妈妈抱住你，猫猫走过她的脚边。衣柜里的声音终于停了。','存活结局 · 等待','你守住了清醒，也守住了家里的猫猫。'],escape:['门外的天光','你没有回头。邻居替你挡住了楼道深处的影子，黑丝在日光和火焰中断开。你走下二十九层楼梯，第一次看见没有玻璃隔着的天空。','存活结局 · 逃离','火柴与黑丝的破局方式为本作改编设定。猫猫和妈妈的命运仍未揭晓。'],lost:['十二月三十二日','你忘了在等谁。镜子里的人告诉你，今天是十二月三十二日。你觉得这个日子没有什么不对。','迷失结局','保持清醒：核对手机、按时吃饭、照顾猫猫，警惕矛盾的补充文字。'],catfall:['怀中的陌生人','走到楼梯转角时，怀里的重量变了。猫毛落满你的手臂。你听见一个人贴着你的耳朵说：我告诉过你。','侵蚀结局','逃离前，重新读一遍猫猫藏起的纸条。'],falsemother:['迟来的拥抱','你没能确认时间，或已经太难辨别眼前的人。女人走进门，遮住你手里的纸条。“以后都听妈妈的。”','侵蚀结局','正常的妈妈会准时回来。可靠的时间、足够的清醒和猫猫的状态缺一不可。']};
function end(id){state.ending=id;log('抵达结局：'+endings[id][0]);update();say('这段故事已经结束。你可以回看档案，或重新开始寻找另一条路线。',[],'终章');showEnd();}
function showEnd(){const e=endings[state.ending];modal(`<div class="meta">${e[2]}</div><h2>${e[0]}</h2><p>${e[1]}</p><p class="ending">${e[3]}</p><button class="action" id="again">重新开始</button>`);$('#again').onclick=restart;}
function restart(){modal('<h2>重新翻开这张纸条？</h2><p>当前生存进度将被新的一天替代。</p><button class="action" id="confirmRestart">确认重新开始</button>');$('#confirmRestart').onclick=()=>{state=fresh();pending=false;state.pending=null;$('#modal').close();log('在家中醒来。');back();};}
document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));$('.close').onclick=()=>$('#modal').close();$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
$('#archive').onclick=()=>{modal('<div class="meta">已收集的文字 / 请交叉核对</div><h2>纸条档案</h2>'+state.clues.map(id=>`<button class="archive-link" data-doc="${id}">${docs[id].title}</button>`).join('')+`<p class="meta">随身物品：${state.items.map(i=>({phone:'旧手机',matches:'火柴',yarn:'红色毛线',covered:'镜子已遮盖',sun:'日光线索',ally:'邻居的协助'}[i])).join('、')||'暂无'}</p>`);document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>doc(b.dataset.doc));};
$('#journal').onclick=()=>{modal('<div class="meta">你留下的日期，证明你没有迷失</div><h2>生存记录</h2><div id="logs"></div>');for(const line of state.log){const p=document.createElement('p');p.className='logentry';p.textContent=line;$('#logs').append(p);}if(!state.log.length)$('#logs').textContent='故事才刚刚开始。';};
$('#restart').onclick=restart;$('#help').onclick=()=>modal('<div class="meta">规则怪谈 · 交互小说</div><h2>在这里活下去</h2><p>点击画面中的光点或下方地点，检查物品、发现纸条。通过客厅的“继续这一天”推进上午、下午与夜晚；夜晚休息进入下一天。探索本身不消耗时间。</p><p>每天记得吃饭、喂猫，并找到可靠的计时工具。异常事件出现时，请依据线索选择行动。清醒降到零，便会迷失。</p><p>你可以等到第 30 天，也可以探索一条更早离开的路。进度保存在当前浏览器。声音默认关闭。</p><p class="meta">根据用户提供的《妈妈留的纸条》及作者 QA 改编。压缩了部分文字，事件日期与具体逃生仪式为游戏创作。含心理恐怖，无突发跳脸。故事中的危险指令仅属于虚构情境。</p>');
$('#sound').onclick=()=>{if(osc){osc.stop();osc=null;audioCtx.close();audioCtx=null;$('#sound').innerHTML='声音 关 <span>◌</span>';return;}try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();osc=audioCtx.createOscillator();const g=audioCtx.createGain();osc.type='sine';osc.frequency.value=65;g.gain.value=.025;osc.connect(g);g.connect(audioCtx.destination);osc.start();$('#sound').innerHTML='声音 开 <span>◉</span>';}catch{$('#sound').textContent='声音不可用';}};
update();if(state.ending)showEnd();else if(state.pending==='daily')runEvent();else if(state.pending==='escape')escapeEvent();else if(state.pending==='arrival')arrival();else if(state.log.length)back();

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
