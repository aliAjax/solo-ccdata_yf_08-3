import React,{useEffect,useState} from 'react';import{createRoot}from'react-dom/client';import'./styles.css';
const seed={name:'暮光边境',system:'D&D 5E',sessions:[{id:1,date:'2024-06-08',title:'第一章：灰港的钟声',summary:'队伍抵达灰港，在失落的钟楼发现了神秘符文。',tag:'主线',color:'#d8a153'},{id:2,date:'2024-06-15',title:'第二章：雾中来客',summary:'与流浪法师伊琳结盟，追踪海雾中的脚印。',tag:'主线',color:'#93b7a6'},{id:3,date:'2024-06-22',title:'支线：深林采药',summary:'帮助村民寻找月光草，获得一枚古老铜币。',tag:'支线',color:'#b9a6d1'}],characters:[{name:'艾德里安',role:'圣骑士',player:'林默',color:'#d8a153'},{name:'瑟琳',role:'游侠',player:'安然',color:'#93b7a6'},{name:'莫尔',role:'术士',player:'周岳',color:'#b9a6d1'}]};
const read=()=>{try{return JSON.parse(localStorage.getItem('campaign-log'))||seed}catch{return seed}};
const TABS=[['timeline','◌','时间线'],['characters','♙','角色与阵营'],['places','⌖','地点图鉴'],['loot','◇','战利品'],['dice','⚄','团队判定']];
const TITLES={timeline:'战役时间线',characters:'角色与阵营',places:'地点图鉴',loot:'战利品',dice:'团队骰子判定台'};
const DIE_SIZES=[4,6,8,10,12,20,100];
const MODES=[['normal','普通'],['advantage','优势'],['disadvantage','劣势']];
// xmur3 字符串哈希 → mulberry32：相同 (种子, 队员序号) 永远生成同一条随机数序列
function hashSeed(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19)}return function(){h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return(h^=h>>>16)>>>0}};
function makeRng(seedText,index){const seed=hashSeed(seedText+'#'+index);let a=seed();return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}};
function parseDie(raw){const m=/^d(\d+)$/i.exec(String(raw||'').trim());if(!m)return null;const s=Number(m[1]);return DIE_SIZES.includes(s)?s:null}
function rollMember(m,index,seedText){const sides=parseDie(m.die);const rng=makeRng(seedText,index);const rolls=m.mode==='normal'?[rng()]:[rng(),rng()];const raw=rolls.map(u=>1+Math.floor(u*sides));let kept;if(m.mode==='normal')kept=raw[0];else if(m.mode==='advantage')kept=Math.max(raw[0],raw[1]);else kept=Math.min(raw[0],raw[1]);const modifier=Number(m.modifier)||0;const total=kept+modifier;
// 暴击/失利：优劣势下需两颗都为极值才计，普通即该骰为极值
const crit=m.mode==='normal'?kept===sides:(raw[0]===sides&&raw[1]===sides);
const fumble=m.mode==='normal'?kept===1:(raw[0]===1&&raw[1]===1);
return{name:m.name.trim()||`队员 ${index+1}`,die:sides,mode:m.mode,modifier,raw,kept,total,crit,fumble}}
function DiceStation(){
const[seedText,setSeedText]=useState('');const[dc,setDc]=useState(10);const[members,setMembers]=useState([]);const[results,setResults]=useState([]);const[error,setError]=useState('');
const presetName=i=>seed.characters[i%seed.characters.length].name;
const add=()=>setMembers(ms=>[...ms,{id:Date.now()+ms.length,name:'',die:'d20',modifier:0,mode:'normal'}]);
const update=(id,key,val)=>setMembers(ms=>ms.map(m=>m.id===id?{...m,[key]:val}:m));
const remove=id=>setMembers(ms=>ms.filter(m=>m.id!==id));
const run=()=>{
if(!seedText.trim()){setError('缺少种子：请先填写判定种子（如章节日期或事件名），种子决定掷骰结果。');setResults([]);return}
if(members.length===0){setError('队伍为空：请至少添加一名队员后再进行判定。');setResults([]);return}
const bad=members.find(m=>parseDie(m.die)===null);
if(bad){setError(`非法骰型：“${bad.name.trim()||'未命名队员'}”的骰型为 ${bad.die||'（空）'}，仅支持 ${DIE_SIZES.map(s=>'d'+s).join('、')}。`);setResults([]);return}
if(!Number.isFinite(Number(dc))){setError('目标值无效：请填写一个整数目标值（DC）。');setResults([]);return}
setError('');
const rolled=members.map((m,i)=>rollMember(m,i,seedText.trim()));
const target=Number(dc);
rolled.forEach(r=>{r.pass=r.total>=target});
const passed=rolled.filter(r=>r.pass).length;
const verdict=passed===rolled.length?['success','全员通过 · 成功']:passed*2>=rolled.length?['marginal','勉强成功（至少半数通过）']:['failure','团队失败（通过不足半数）'];
setResults([{id:Date.now(),seed:seedText.trim(),dc:target,members:rolled,passed,verdict,at:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})},...results].slice(0,6));
};
const modeLabel=m=>({normal:'普通',advantage:'优势',disadvantage:'劣势'})[m];
return<div className="dice-wrap">
<section className="dice-config">
<div className="dice-head"><div><span className="crumb">TEAM CHECK</span><h2>设置一次团队判定</h2><p>相同种子、队员顺序与设置必定还原相同的点数与顺序。</p></div></div>
<div className="dice-global">
<label>判定种子<input value={seedText} onChange={e=>setSeedText(e.target.value)} placeholder="例：2024-06-22 深林采药"/></label>
<label>目标值 DC<input type="number" value={dc} onChange={e=>setDc(e.target.value)}/></label>
</div>
<div className="roster-head"><strong>队员名单（{members.length}）</strong><button className="outline" onClick={add}>＋ 添加队员</button></div>
{members.length===0&&<div className="roster-empty">还没有队员。点击「添加队员」，或快速加入预设角色。
<div className="quick">{seed.characters.map(c=><button key={c.name} className="chip" onClick={()=>setMembers(ms=>[...ms,{id:Date.now()+ms.length,name:c.name,die:'d20',modifier:0,mode:'normal'}])}>＋ {c.name}</button>)}</div></div>}
<div className="roster">
{members.map((m,idx)=><div className="roster-row" key={m.id}>
<input className="r-name" value={m.name} onChange={e=>update(m.id,'name',e.target.value)} placeholder={presetName(idx)}/>
<input className={'r-die '+(m.die&&parseDie(m.die)===null?'bad':'')} value={m.die} onChange={e=>update(m.id,'die',e.target.value)} aria-label="骰型" title="d4 / d6 / d8 / d10 / d12 / d20 / d100"/>
<input className="r-mod" type="number" value={m.modifier} onChange={e=>update(m.id,'modifier',e.target.value)} title="修正值" aria-label="修正值"/>
<select className="r-mode" value={m.mode} onChange={e=>update(m.id,'mode',e.target.value)}>{MODES.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>
<button className="r-del" onClick={()=>remove(m.id)} title="移除队员">×</button>
</div>)}
</div>
{error&&<div className="dice-error">⚠ {error}</div>}
<button className="primary full" onClick={run}>⚄ 开始团队判定</button>
</section>
<section className="dice-results">
{results.length===0?<div className="dice-noresult"><span>⚄</span><h2>等待判定</h2><p>完成判定后，这里会显示每名队员的原始点数、修正后总值、通过状态，以及团队结论。</p></div>:
results.map(rec=><article className="check-card" key={rec.id}>
<div className={'verdict '+rec.verdict[0]}><b>{rec.verdict[1]}</b><span>种子 {rec.seed} · DC {rec.dc} · {rec.passed}/{rec.members.length} 通过 · {rec.at}</span></div>
{rec.members.map((r,i)=><div className={'roll-row '+(r.pass?'pass':'fail')} key={i}>
<div className="roll-who"><strong>{r.name}</strong><small>d{r.die}{r.modifier?` ${r.modifier>0?'+':''}${r.modifier}`:''} · {modeLabel(r.mode)}</small></div>
<div className="roll-dice">
{r.raw.map((v,j)=>{const used=(r.mode==='normal')||(r.mode==='advantage'?v===Math.max(...r.raw)&&r.raw.indexOf(v)===j:v===Math.min(...r.raw)&&r.raw.indexOf(v)===j);return<span key={j} className={'die '+(used?'kept':'dropped')} title={used?'计入点数':'舍弃'}>{v}</span>})}
{r.crit&&<em className="badge crit">暴击</em>}{r.fumble&&<em className="badge fumble">失利</em>}
</div>
<div className={'roll-total '+(r.pass?'pass':'fail')}><b>{r.total}</b><small>{r.pass?'通过':'未达'}</small></div>
</div>)}
</article>)}
</section>
</div>}
function App(){const[data,setData]=useState(read);const[tab,setTab]=useState('timeline');const[active,setActive]=useState(1);const[show,setShow]=useState(false);const[notice,setNotice]=useState('');const[form,setForm]=useState({title:'',date:'2024-07-01',summary:'',tag:'主线'});useEffect(()=>localStorage.setItem('campaign-log',JSON.stringify(data)),[data]);const cur=data.sessions.find(x=>x.id===active)||data.sessions[0];const add=()=>{if(!form.title)return;const s={...form,id:Date.now(),color:'#d8a153'};setData({...data,sessions:[...data.sessions,s]});setActive(s.id);setForm({title:'',date:'2024-07-01',summary:'',tag:'主线'});setShow(false);setNotice('新章节已加入时间线')};const exportData=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='campaign.json';a.click();setNotice('战役记录已导出')};return <div className="shell"><aside><div className="logo"><span>✦</span> CAMPAIGNER</div><div className="campaign"><small>当前战役</small><strong>{data.name}</strong><span>{data.system} · 2024</span></div><nav>{TABS.map(([id,i,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><i>{i}</i>{t}</button>)}</nav><div className="side-bottom"><button>⚙ 偏好设置</button><small>本地存储已开启</small></div></aside><main><header><div><span className="crumb">MY CAMPAIGN / {data.system}</span><h1>{TITLES[tab]}</h1></div><div className="actions"><button onClick={exportData} className="outline">↓ 导出</button><button onClick={()=>setShow(true)} className="primary">＋ 新建章节</button></div></header>{tab==='timeline'&&<div className="timeline-layout"><section className="timeline"><div className="timeline-intro"><div><span>THE CHRONICLE</span><h2>记录每一次冒险</h2></div><span className="count">{data.sessions.length} CHAPTERS</span></div>{data.sessions.map((s,i)=><button className={'chapter '+(active===s.id?'selected':'')} onClick={()=>setActive(s.id)} key={s.id}><div className="date"><b>{new Date(s.date).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})}</b><small>{new Date(s.date).getFullYear()}</small></div><div className="line"><span style={{background:s.color}}></span>{i<data.sessions.length-1&&<i/>}</div><div className="chapter-copy"><div className="tag">{s.tag}</div><h3>{s.title}</h3><p>{s.summary}</p></div><span className="arrow">↗</span></button>)}</section><section className="detail-panel"><div className="detail-cover" style={{background:cur?.color}}><span>CHAPTER {String(data.sessions.findIndex(x=>x.id===active)+1).padStart(2,'0')}</span><i>✦</i></div><div className="detail-body"><span className="tag">{cur?.tag}</span><h2>{cur?.title}</h2><p>{cur?.summary}</p><div className="meta-grid"><div><small>游戏日期</small><strong>{cur?.date}</strong></div><div><small>参与者</small><strong>{data.characters.length} 位玩家</strong></div></div><div className="note"><span>✎</span><div><strong>笔记</strong><p>点击编辑这一章节的剧情细节、重要决定和未解线索。</p></div><button onClick={()=>setNotice('笔记编辑已开启')}>编辑</button></div></div></section></div>}{tab==='characters'&&<section className="cards"><div className="section-note">队伍中有 {data.characters.length} 位冒险者，点击卡片查看角色档案。</div>{data.characters.map(c=><article className="char-card" key={c.name}><div className="avatar" style={{background:c.color}}>{c.name[0]}</div><div><small>{c.role}</small><h3>{c.name}</h3><p>玩家 · {c.player}</p></div><button onClick={()=>setNotice(`${c.name} 的角色档案`)}>↗</button></article>)}</section>}{tab==='places'&&<section className="empty"><div>⌖</div><h2>地点图鉴</h2><p>从章节笔记中收集地点。当前已记录灰港、雾林和失落钟楼。</p><div className="place-list"><span>01　灰港 <b>已探索</b></span><span>02　失落钟楼 <b>已探索</b></span><span>03　雾林 <b>待探索</b></span></div></section>}{tab==='loot'&&<section className="empty"><div>◇</div><h2>战利品清单</h2><p>追踪旅途中获得的装备、遗物和金币。</p><div className="place-list"><span>月光草 × 3 <b>消耗品</b></span><span>古老铜币 × 1 <b>遗物</b></span><span>灰港守卫徽章 × 2 <b>任务物品</b></span></div></section>}{tab==='dice'&&<DiceStation/>}</main>
<div className="mobile-tabs">{TABS.map(([id,i,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><i>{i}</i>{t}</button>)}</div>{show&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW CHAPTER</span><h2>记录新的章节</h2><label>章节标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="例：第三章：月下集市"/></label><label>游戏日期<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>章节摘要<textarea rows="3" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="发生了什么？"/></label><label>章节类型<select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})}><option>主线</option><option>支线</option><option>番外</option></select></label><button className="primary full" onClick={add}>保存章节</button></div></div>}{notice&&<div className="toast">{notice}</div>}</div>};createRoot(document.getElementById('root')).render(<App/>);
