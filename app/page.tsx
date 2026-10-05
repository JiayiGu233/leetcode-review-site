"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import { problems as builtIn, type Problem } from "@/lib/problems";
import { effectiveMastery } from "@/lib/mastery";
import { approaches } from "@/lib/approaches";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProgressRow = { problemId:string; solved:boolean; mastery:number; dueAt:number|null; lastReviewedAt:number|null; reviewCount:number };
type ActivityRow = { date:string; kind:"learn"|"review"; count:number };
type CustomRow = { id:string; number:string; title:string; url:string };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
const randomFrom = <T,>(items:T[], except?:T|null) => { const pool=items.filter(x=>x!==except); return pool[Math.floor(Math.random()*pool.length)]||items[0]||null; };

export default function Home() {
  const [progress,setProgress]=useState<ProgressRow[]>([]), [activity,setActivity]=useState<ActivityRow[]>([]), [custom,setCustom]=useState<CustomRow[]>([]);
  const [reviewPick,setReviewPick]=useState<Problem|null>(null), [learnPick,setLearnPick]=useState<Problem|null>(null);
  const [allowHard,setAllowHard]=useState(false);
  const [ratingTarget,setRatingTarget]=useState<{problem:Problem;kind:"learn"|"review"}|null>(null);
  const [search,setSearch]=useState(""), [filter,setFilter]=useState<"all"|"learned"|"new">("all"), [loading,setLoading]=useState(true), [dialogOpen,setDialogOpen]=useState(false);
  const load=useCallback(async()=>{const r=await fetch("/api/state");if(!r.ok)throw new Error();const d=await r.json();setProgress(d.progress);setActivity(d.activity);setCustom(d.custom);setLoading(false)},[]);
  useEffect(()=>{load().catch(()=>{setLoading(false);alert("进度读取失败，请刷新重试。")})},[load]);
  const allProblems=useMemo<Problem[]>(()=>[...builtIn,...custom.map(p=>({...p,chinese:"自定义题目",day:0,difficulty:"Medium" as const,custom:true}))],[custom]);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),60000);return()=>clearInterval(timer)},[]);
  const progressMap=useMemo(()=>new Map(progress.map(r=>[r.problemId,{...r,mastery:r.solved?effectiveMastery(r.mastery,r.lastReviewedAt,clock):0}])),[progress,clock]);
  const learned=allProblems.filter(p=>progressMap.get(p.id)?.solved), unlearned=allProblems.filter(p=>!progressMap.get(p.id)?.solved);
  const shuffleReview=()=>{const due=learned.filter(p=>{const r=progressMap.get(p.id);return !r?.dueAt||r.dueAt<=Date.now()});const source=due;if(!source.length){alert("所有旧题都已安排稍后复习，今天可以学一道新题。");return;}setReviewPick(randomFrom(source,reviewPick));setRatingTarget(null)};
  const shuffleLearn=()=>{const source=allowHard?unlearned:unlearned.filter(p=>p.difficulty!=="Hard");if(!source.length){alert("当前难度范围内已经没有未学题目了。");return;}setLearnPick(randomFrom(source,learnPick));setRatingTarget(null)};
  const changeAllowHard=(checked:boolean)=>{setAllowHard(checked);if(!checked&&learnPick?.difficulty==="Hard"){setLearnPick(null);setRatingTarget(null)}};
  const rate=async(mastery:number)=>{if(!ratingTarget)return;const response=await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"rate",problemId:ratingTarget.problem.id,kind:ratingTarget.kind,mastery,date:today()})});if(!response.ok){alert("保存失败，请重试");return;}ratingTarget.kind==="learn"?setLearnPick(null):setReviewPick(null);setRatingTarget(null);await load()};
  const reviewToday=activity.filter(a=>a.date===today()&&a.kind==="review").reduce((n,a)=>n+Number(a.count),0);
  useEffect(()=>{const c=(document as Document&{modelContext?:{registerTool?:Function}}).modelContext;if(!c?.registerTool)return;const ctrl=new AbortController();Promise.resolve(c.registerTool({name:"get_practice_summary",title:"Get practice summary",description:"Read learned, remaining, and today's review counts.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({learned:learned.length,remaining:unlearned.length,reviewsToday:reviewToday})},{signal:ctrl.signal})).catch(()=>{});return()=>ctrl.abort()},[learned.length,unlearned.length,reviewToday]);
  const filtered=allProblems.filter(p=>{const match=`${p.number} ${p.title} ${p.chinese}`.toLowerCase().includes(search.toLowerCase()),solved=!!progressMap.get(p.id)?.solved;return match&&(filter==="all"||(filter==="learned"?solved:!solved))});
  return <main className="min-h-screen bg-[#07111f] text-[#e9f1fb]"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 lg:px-10">
    <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 font-mono text-sm font-semibold uppercase tracking-[.18em] text-[#75e6a8]">LeetCode review deck</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">今天复习哪一题？</h1></div><div className="grid grid-cols-3 gap-3 text-center"><Stat value={learned.length} label="已学"/><Stat value={unlearned.length} label="未学"/><Stat value={`${Math.min(reviewToday,3)}/3`} label="今日复习"/></div></header>
    <section className="grid gap-5 lg:grid-cols-2"><PracticeCard type="review" problem={reviewPick} onShuffle={shuffleReview} onRate={()=>reviewPick&&setRatingTarget({problem:reviewPick,kind:"review"})} empty={loading?"正在载入进度…":"随机抽一道旧题，优先安排该复习的内容。"}/><PracticeCard type="learn" problem={learnPick} onShuffle={shuffleLearn} onRate={()=>learnPick&&setRatingTarget({problem:learnPick,kind:"learn"})} empty={loading?"正在载入题单…":allowHard?"从全部未学题目中随机抽一道。":"只从 Easy 和 Medium 中随机抽题。"} allowHard={allowHard} onAllowHardChange={changeAllowHard}/></section>
    {ratingTarget&&<section className="rating-panel"><div><p className="text-sm text-slate-400">刚才这题掌握得怎么样？</p><p className="font-semibold">{ratingTarget.problem.number}. {ratingTarget.problem.title}</p></div><div className="flex flex-wrap gap-2">{[1,3,5].map(s=><button key={s} onClick={()=>rate(s)} className="score-button">{s}<span>{({1:"很不熟练",3:"不太熟练",5:"很熟练"} as Record<number,string>)[s]}</span></button>)}</div></section>}
    <ContributionGraph activity={activity}/>
    <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0c192a]"><div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-bold">题库与熟练度</h2><p className="mt-1 text-sm text-slate-400">评分：1 很不熟练 · 3 不太熟练 · 5 很熟练。每满 30 天降 1，最低为 0。</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索题号或题名" className="w-full border-white/10 bg-[#07111f] pl-9 sm:w-56"/></label><div className="flex rounded-lg border border-white/10 bg-[#07111f] p-1">{(["all","learned","new"]as const).map(v=><button key={v} onClick={()=>setFilter(v)} className={`rounded-md px-3 py-1.5 text-sm ${filter===v?"bg-white/10 text-white":"text-slate-400"}`}>{v==="all"?"全部":v==="learned"?"已学":"未学"}</button>)}</div><AddProblem open={dialogOpen} setOpen={setDialogOpen} onAdded={load}/></div></div>
      <div className="max-h-[560px] overflow-auto"><Table><TableHeader className="sticky top-0 z-10 bg-[#0c192a]"><TableRow className="border-white/10 hover:bg-transparent"><TableHead>题目</TableHead><TableHead>计划</TableHead><TableHead>状态</TableHead><TableHead className="min-w-40">熟练度</TableHead><TableHead>复习次数</TableHead></TableRow></TableHeader><TableBody>{filtered.map(p=>{const r=progressMap.get(p.id),score=r?.mastery||0;return <TableRow key={p.id} className="border-white/5 hover:bg-white/[.035]"><TableCell><a href={p.url} target="_blank" rel="noreferrer" className="group font-medium text-slate-100 hover:text-[#75e6a8]">{p.number}. {p.title}<ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-50"/></a><div className="mt-1 text-xs text-slate-500">{p.chinese}</div><div className="mt-2 flex flex-wrap gap-2"><DifficultyBadge difficulty={p.difficulty}/><span className="method-tag">{approaches[p.number] || "解法待补充"}</span></div></TableCell><TableCell className="text-slate-400">{p.custom?"自定义":`Day ${p.day}`}</TableCell><TableCell><span className={r?.solved?"status learned":"status new"}>{r?.solved?"已学":"未学"}</span></TableCell><TableCell><div className="flex items-center gap-2"><div className="flex gap-1">{[1,2,3,4,5].map(n=><span key={n} className={`h-2.5 w-5 rounded-sm ${n<=score?"bg-[#75e6a8]":"bg-white/10"}`}/>)}</div><span className="font-mono text-xs text-slate-500">{score}/5</span></div></TableCell><TableCell className="font-mono text-slate-400">{r?.reviewCount||0}<button className="ml-3 text-sm text-[#67b7ff] underline" onClick={()=>{setRatingTarget({problem:p,kind:r?.solved?"review":"learn"});window.scrollTo({top:0,behavior:"smooth"})}}>记录评分</button></TableCell></TableRow>})}</TableBody></Table></div>
    </section></div></main>;
}
function Stat({value,label}:{value:string|number;label:string}){return <div className="min-w-20 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3"><div className="font-mono text-xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>}
function DifficultyBadge({difficulty}:{difficulty:Problem["difficulty"]}){const color=difficulty==="Easy"?"border-emerald-400/25 bg-emerald-400/10 text-emerald-300":difficulty==="Hard"?"border-rose-400/25 bg-rose-400/10 text-rose-300":"border-amber-400/25 bg-amber-400/10 text-amber-300";return <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${color}`}>{difficulty}</span>}
function PracticeCard({type,problem,onShuffle,onRate,empty,allowHard=false,onAllowHardChange}:{type:"review"|"learn";problem:Problem|null;onShuffle:()=>void;onRate:()=>void;empty:string;allowHard?:boolean;onAllowHardChange?:(checked:boolean)=>void}){const review=type==="review";return <article className={`practice-card ${review?"review-card":"learn-card"}`}><div className="flex items-start justify-between gap-4"><div><p className={`eyebrow ${review?"text-[#67b7ff]":"text-[#75e6a8]"}`}>{review?"Shuffle review":"Learn a new one"}</p><h2 className="mt-1 text-2xl font-bold">{review?"复习旧题":"学习新题"}</h2></div>{review?<RefreshCw className="h-6 w-6 text-[#67b7ff]"/>:<div className="flex flex-col items-end gap-3"><Sparkles className="h-6 w-6 text-[#75e6a8]"/><label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"><span>允许 Hard</span><Switch checked={allowHard} onCheckedChange={onAllowHardChange} aria-label="允许随机抽到 Hard 题" className="data-[state=checked]:bg-rose-500"/></label></div>}</div><div className="my-7 min-h-28">{problem?<><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm text-slate-500">DAY {problem.day||"CUSTOM"} · #{problem.number}</p><DifficultyBadge difficulty={problem.difficulty}/></div><a href={problem.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-start gap-2 text-2xl font-semibold leading-tight hover:underline">{problem.title}<ExternalLink className="mt-1 h-4 w-4 shrink-0"/></a><p className="mt-2 text-slate-400">{problem.chinese}</p></>:<p className="max-w-sm pt-4 text-slate-400">{empty}</p>}</div><div className="flex flex-wrap gap-3"><Button onClick={onShuffle} className={review?"bg-[#1478c9] hover:bg-[#1b88df]":"bg-[#2a9d62] hover:bg-[#32ae70]"}>{problem?"换一题":"随机抽一题"}</Button>{problem&&<Button variant="outline" onClick={onRate} className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white">做完了，评分</Button>}</div></article>}
function ContributionGraph({activity}:{activity:ActivityRow[]}) {
  const totals = new Map<string,{learn:number;review:number}>();
  activity.forEach(a => { const v=totals.get(a.date)||{learn:0,review:0}; v[a.kind]+=Number(a.count); totals.set(a.date,v); });
  const dateToday=today();
  const [year,month]=dateToday.split("-").map(Number);
  const alpha=(n:number)=>n===0?.06:Math.min(.28+n*.18,1);
  return <section className="mt-8 rounded-2xl border border-white/10 bg-[#0c192a] p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">练习频率</h2>
      <p className="text-sm text-slate-400"><span className="text-[#75e6a8]">左绿：新学</span> · <span className="text-[#67b7ff]">右蓝：复习</span> · 颜色越深，题数越多</p>
    </div>
    <div className="grid gap-6 md:grid-cols-2">{[-1,0].map(offset=>{
      const first=new Date(Date.UTC(year,month-1+offset,1));
      const y=first.getUTCFullYear(),m=first.getUTCMonth();
      const count=new Date(Date.UTC(y,m+1,0)).getUTCDate();
      const leading=(first.getUTCDay()+6)%7;
      const prefix=y+"-"+String(m+1).padStart(2,"0")+"-";
      const records=activity.filter(a=>a.date.startsWith(prefix));
      const sum=(kind:string)=>records.filter(a=>a.kind===kind).reduce((n,a)=>n+Number(a.count),0);
      return <div key={prefix}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{offset===0?"本月":"上个月"} · {y} 年 {m+1} 月</h3><span className="text-sm text-slate-400">新学 {sum("learn")} · 复习 {sum("review")}</span></div>
        <div className="month-grid">{["一","二","三","四","五","六","日"].map(d=><div key={d} className="weekday">{d}</div>)}
          {Array.from({length:leading},(_,i)=><div key={"blank"+i}/>)}
          {Array.from({length:count},(_,i)=>{
            const date=prefix+String(i+1).padStart(2,"0");
            const v=totals.get(date)||{learn:0,review:0};
            const future=date>dateToday;
            const description=date+" · 新学 "+v.learn+" 题 · 复习 "+v.review+" 题"+(future?" · 未到日期":"");
            return <div key={date} tabIndex={0} aria-label={description} title={description} className={"month-day"+(date===dateToday?" is-today":"")+(future?" future":"")}>
              <span className="day-half" style={{backgroundColor:`rgba(53,201,119,${alpha(v.learn)})`}}/>
              <span className="day-half" style={{backgroundColor:`rgba(39,141,229,${alpha(v.review)})`}}/>
              <span className="day-number">{i+1}</span>
              <span className="day-detail">{description}</span>
            </div>
          })}
        </div>
      </div>;
    })}</div>
  </section>;
}
function AddProblem({open,setOpen,onAdded}:{open:boolean;setOpen:(v:boolean)=>void;onAdded:()=>Promise<void>}){const submit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);const response=await fetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",number:f.get("number"),title:f.get("title"),url:f.get("url")})});if(!response.ok){alert("保存失败，请检查输入后重试");return;}setOpen(false);await onAdded()};return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="border-white/10 bg-[#07111f] text-white hover:bg-white/10 hover:text-white"><Plus className="h-4 w-4"/>添加题目</Button></DialogTrigger><DialogContent className="border-white/10 bg-[#0c192a] text-white"><DialogHeader><DialogTitle>添加做过的题</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4"><Input name="number" required placeholder="题号，例如 704" className="border-white/10 bg-[#07111f]"/><Input name="title" required placeholder="题目名称" className="border-white/10 bg-[#07111f]"/><Input name="url" type="url" required placeholder="https://leetcode.com/problems/..." className="border-white/10 bg-[#07111f]"/><Button type="submit" className="w-full bg-[#2a9d62] hover:bg-[#32ae70]">保存题目</Button></form></DialogContent></Dialog>}
