
const express=require("express"), http=require("http"), fs=require("fs"), path=require("path");
const {Server}=require("socket.io");
const app=express(), server=http.createServer(app), io=new Server(server,{cors:{origin:"*"}});
app.use(express.static(path.join(__dirname,"public")));
const SIZE=15,CENTER=7,RACK=9,MAX=4;
const WORDS=new Set(JSON.parse(fs.readFileSync(path.join(__dirname,"words.json"),"utf8")));
const BLOCK=new Set("PAT CAPE CAPEK GAK NGGAK GA LO GUE GW LU ELU KOK SIH BGT BANGET ALUH THE AND YOU ARE FOR NOT BUT CAN HELLO DOG CAT CAR WATER COMPUTER".split(/\s+/));
const LETTERS={A:[19,1],N:[9,1],E:[8,1],I:[8,1],U:[5,1],T:[5,1],R:[4,1],O:[3,1],S:[3,1],K:[3,2],M:[3,2],D:[4,3],G:[3,3],L:[3,4],H:[2,4],P:[2,4],B:[4,5],Y:[2,5],F:[1,5],V:[1,5],C:[3,8],W:[1,8],J:[1,10],Z:[1,10],"?":[2,0]};
const PREM={};function mark(t,a){a.forEach(([r,c])=>PREM[`${r-1},${c-1}`]=t)}
mark("tw",[[1,1],[1,8],[1,15],[8,1],[8,15],[15,1],[15,8],[15,15]]);
mark("dw",[[2,2],[3,3],[4,4],[5,5],[8,8],[11,11],[12,12],[13,13],[14,14],[2,14],[3,13],[4,12],[5,11],[11,5],[12,4],[13,3],[14,2]]);
mark("tl",[[2,6],[2,10],[6,2],[6,6],[6,10],[6,14],[10,2],[10,6],[10,10],[10,14],[14,6],[14,10]]);
mark("dl",[[1,4],[1,12],[3,7],[3,9],[4,1],[4,8],[4,15],[7,3],[7,7],[7,9],[7,13],[8,4],[8,12],[9,3],[9,7],[9,9],[9,13],[12,1],[12,8],[12,15],[13,7],[13,9],[15,4],[15,12]]);
const rooms=new Map();
function sh(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function tile(l){return{id:Math.random().toString(36).slice(2),letter:l,points:LETTERS[l][1],blank:l==="?",resolved:null}}
function bag(){let a=[];for(const [l,[n]] of Object.entries(LETTERS))for(let i=0;i<n;i++)a.push(tile(l));return sh(a)}
function board(){return Array.from({length:SIZE},()=>Array(SIZE).fill(null))}
function code(){let c;do{c=Math.random().toString(36).slice(2,6).toUpperCase()}while(rooms.has(c));return c}
function clean(n){return String(n||"Pemain").replace(/[<>]/g,"").slice(0,18)||"Pemain"}
function refill(r,p){while(p.rack.length<RACK&&r.bag.length)p.rack.push(r.bag.pop())}
function pub(r){return{code:r.code,board:r.board,current:r.current,started:r.started,bagCount:r.bag.length,players:r.players.map((p,i)=>({id:p.id,name:p.name,score:p.score,rackCount:p.rack.length,index:i,connected:p.connected})),log:r.log.slice(-8)}}
function send(r){for(const p of r.players)io.to(p.id).emit("state",{...pub(r),yourId:p.id,yourIndex:r.players.findIndex(x=>x.id===p.id),yourRack:p.rack})}
function has(b,r,c){return r>=0&&r<SIZE&&c>=0&&c<SIZE&&b[r][c]}
function neigh(r,c){return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&a<SIZE&&b>=0&&b<SIZE)}
function fixed(b){let n=0;for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(b[r][c])n++;return n}
function word(b,r,c,dr,dc){while(has(b,r-dr,c-dc)){r-=dr;c-=dc}let text="",cells=[];while(has(b,r,c)){let t=b[r][c];text+=t.blank?t.resolved:t.letter;cells.push([r,c]);r+=dr;c+=dc}return{text,cells}}
function valid(w){w=String(w||"").toUpperCase();return /^[A-Z]{2,15}$/.test(w)&&!BLOCK.has(w)&&/[AIUEO]/.test(w)&&!/[^AIUEO]{5,}/.test(w)&&WORDS.has(w)}
function scoreWord(b,fresh,w){let raw=0,mul=1;for(const [r,c]of w.cells){let t=b[r][c],pts=t.points||0;if(fresh.has(`${r},${c}`)){let p=PREM[`${r},${c}`];if(p==="dl")pts*=2;if(p==="tl")pts*=3;if(p==="dw")mul*=2;if(p==="tw")mul*=3}raw+=pts}return raw*mul}
function validate(room,placements,force=false){
 if(!room.started)return{ok:false,msg:"Permainan belum dimulai."};
 if(!Array.isArray(placements)||!placements.length)return{ok:false,msg:"Belum ada huruf baru."};
 let player=room.players[room.current],rack=[...player.rack],tmp=room.board.map(row=>row.map(x=>x?{...x}:null)),fresh=[];
 for(const pl of placements){let r=+pl.r,c=+pl.c,id=String(pl.id||"");if(!(r>=0&&r<SIZE&&c>=0&&c<SIZE))return{ok:false,msg:"Posisi tidak valid."};if(tmp[r][c])return{ok:false,msg:"Kotak sudah terisi."};let i=rack.findIndex(t=>t.id===id);if(i<0)return{ok:false,msg:"Huruf tidak ada di rak."};let t={...rack.splice(i,1)[0]};if(t.blank){let x=String(pl.resolved||"").toUpperCase();if(!/^[A-Z]$/.test(x))return{ok:false,msg:"Blank perlu huruf."};t.resolved=x}tmp[r][c]=t;fresh.push([r,c])}
 let rows=new Set(fresh.map(x=>x[0])),cols=new Set(fresh.map(x=>x[1]));if(rows.size>1&&cols.size>1)return{ok:false,msg:"Huruf baru harus satu baris atau kolom."};
 if(fixed(room.board)===0&&!fresh.some(([r,c])=>r===CENTER&&c===CENTER))return{ok:false,msg:"Kata pertama harus melewati tengah."};
 if(fixed(room.board)>0&&!fresh.some(([r,c])=>neigh(r,c).some(([rr,cc])=>room.board[rr][cc])))return{ok:false,msg:"Kata harus tersambung."};
 let vertical=cols.size===1;if(fresh.length===1){let [r,c]=fresh[0];vertical=has(tmp,r-1,c)||has(tmp,r+1,c);if(!vertical&&!(has(tmp,r,c-1)||has(tmp,r,c+1)))return{ok:false,msg:"Satu huruf harus membentuk kata."}}
 let line=vertical?fresh.map(x=>x[0]):fresh.map(x=>x[1]),fix=vertical?fresh[0][1]:fresh[0][0];for(let i=Math.min(...line);i<=Math.max(...line);i++){let r=vertical?i:fix,c=vertical?fix:i;if(!tmp[r][c])return{ok:false,msg:"Kata tidak boleh terputus."}}
 let words=[],main=word(tmp,fresh[0][0],fresh[0][1],vertical?1:0,vertical?0:1);if(main.text.length>1)words.push(main);for(const [r,c]of fresh){let cr=word(tmp,r,c,vertical?0:1,vertical?1:0);if(cr.text.length>1)words.push(cr)}
 let seen=new Set();words=words.filter(w=>{let k=w.cells.map(x=>x.join(",")).join("|");if(seen.has(k))return false;seen.add(k);return true});
 if(!force)for(const w of words)if(!valid(w.text))return{ok:false,msg:`Ditolak: ${w.text} tidak ada di kamus formal offline.`,words:words.map(x=>x.text)};
 let fs=new Set(fresh.map(x=>x.join(","))),score=words.reduce((a,w)=>a+scoreWord(tmp,fs,w),0);if(fresh.length===RACK)score+=50;
 return{ok:true,temp:tmp,score,words:words.map(w=>w.text),usedIds:placements.map(p=>String(p.id||""))}
}
io.on("connection",s=>{
 s.on("createRoom",({name})=>{let r={code:code(),board:board(),bag:bag(),players:[],current:0,started:false,log:[]};rooms.set(r.code,r);r.players.push({id:s.id,name:clean(name),score:0,rack:[],connected:true});s.join(r.code);s.data.room=r.code;send(r)});
 s.on("joinRoom",({code,name})=>{let r=rooms.get(String(code||"").toUpperCase().trim());if(!r)return s.emit("errorMsg","Room tidak ditemukan.");if(r.started)return s.emit("errorMsg","Game sudah dimulai.");if(r.players.length>=MAX)return s.emit("errorMsg","Room penuh.");r.players.push({id:s.id,name:clean(name),score:0,rack:[],connected:true});s.join(r.code);s.data.room=r.code;send(r)});
 s.on("startGame",()=>{let r=rooms.get(s.data.room);if(!r)return;if(r.players[0]?.id!==s.id)return s.emit("errorMsg","Hanya host bisa mulai.");if(r.players.length<2)return s.emit("errorMsg","Minimal 2 pemain.");r.started=true;r.players.forEach(p=>refill(r,p));r.log.push("Permainan dimulai.");send(r)});
 s.on("playMove",({placements,force})=>{let r=rooms.get(s.data.room);if(!r)return;if(r.players[r.current]?.id!==s.id)return s.emit("errorMsg","Belum giliranmu.");let res=validate(r,placements,!!force);if(!res.ok)return s.emit("moveRejected",res);let p=r.players[r.current];p.score+=res.score;p.rack=p.rack.filter(t=>!res.usedIds.includes(t.id));refill(r,p);r.board=res.temp;r.log.push(`${p.name}: ${res.words.join(", ")} (+${res.score})${force?" manual":""}`);r.current=(r.current+1)%r.players.length;send(r)});
 s.on("passTurn",()=>{let r=rooms.get(s.data.room);if(!r)return;if(r.players[r.current]?.id!==s.id)return s.emit("errorMsg","Belum giliranmu.");r.log.push(`${r.players[r.current].name} lewat.`);r.current=(r.current+1)%r.players.length;send(r)});
 s.on("disconnect",()=>{let r=rooms.get(s.data.room);if(!r)return;let p=r.players.find(x=>x.id===s.id);if(p)p.connected=false;send(r)})
});
server.listen(process.env.PORT||3000,()=>console.log("Running on http://localhost:"+(process.env.PORT||3000)));
