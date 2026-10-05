import { NextResponse } from "next/server";
import { getRawDb } from "@/db";
import { initiallySolved, problems } from "@/lib/problems";

export async function GET() {
  try {
    const db = getRawDb();
    if (initiallySolved.size > 0) await db.batch([...initiallySolved].map(id => db.prepare("INSERT OR IGNORE INTO progress (problem_id,solved,mastery) VALUES (?,1,0)").bind(id)));
    const [progress, custom, activity] = await Promise.all([
      db.prepare("SELECT problem_id AS problemId, solved, mastery, due_at AS dueAt, last_reviewed_at AS lastReviewedAt, review_count AS reviewCount FROM progress").all(),
      db.prepare("SELECT id,number,title,url FROM custom_problems").all(),
      db.prepare("SELECT activity_date AS date,kind,count(*) AS count FROM activities GROUP BY activity_date,kind").all(),
    ]);
    return NextResponse.json({progress:progress.results,custom:custom.results,activity:activity.results});
  } catch(e) { console.error(e); return NextResponse.json({error:"暂时无法读取进度，请重试。"}, {status:500}); }
}
export async function POST(request:Request) {
  try {
    const b=await request.json(), db=getRawDb(), now=Date.now();
    if(b.action==="add") {
      if(typeof b.title!=="string"||!b.title.trim()||typeof b.number!=="string") return NextResponse.json({error:"请填写题号和名称"},{status:400});
      const url=new URL(b.url);
      if(url.protocol!=="https:"&&url.protocol!=="http:") return NextResponse.json({error:"链接无效"},{status:400});
      const existing=problems.find(p=>p.number===b.number.trim());
      const id=existing?.id || "custom-"+crypto.randomUUID();
      const queries=[];
      if(!existing) queries.push(db.prepare("INSERT INTO custom_problems (id,number,title,url,created_at) VALUES (?,?,?,?,?)").bind(id,b.number.trim(),b.title.trim(),url.href,now));
      queries.push(db.prepare("INSERT INTO progress (problem_id,solved,mastery) VALUES (?,1,0) ON CONFLICT(problem_id) DO UPDATE SET solved=1").bind(id));
      await db.batch(queries);
      return NextResponse.json({id});
    }
    if(b.action==="rate") {
      if(![1,3,5].includes(b.mastery)||typeof b.problemId!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return NextResponse.json({error:"评分无效，请选择 1、3 或 5"},{status:400});
      const current=await db.prepare("SELECT solved FROM progress WHERE problem_id=?").bind(b.problemId).first<{solved:number}>();
      const known=problems.some(p=>p.id===b.problemId)||await db.prepare("SELECT id FROM custom_problems WHERE id=?").bind(b.problemId).first();
      if(!known) return NextResponse.json({error:"题目不存在"},{status:400});
      const kind=current?.solved?"review":"learn";
      const dueAt=now+[1,1,2,4,7,14][b.mastery]*86400000;
      await db.batch([
        db.prepare("INSERT INTO progress (problem_id,solved,mastery,due_at,last_reviewed_at,review_count) VALUES (?,1,?,?,?,?) ON CONFLICT(problem_id) DO UPDATE SET solved=1,mastery=excluded.mastery,due_at=excluded.due_at,last_reviewed_at=excluded.last_reviewed_at,review_count=progress.review_count+excluded.review_count").bind(b.problemId,b.mastery,dueAt,now,kind==="review"?1:0),
        db.prepare("INSERT INTO activities (problem_id,kind,activity_date,created_at) VALUES (?,?,?,?)").bind(b.problemId,kind,b.date,now),
      ]);
      return NextResponse.json({ok:true,dueAt});
    }
    return NextResponse.json({error:"未知操作"},{status:400});
  } catch(e) { console.error(e); return NextResponse.json({error:"保存失败，请重试。"}, {status:500}); }
}
