import{firebaseAuth,firebaseDb}from'./assets/js/firebase-config.js';
import{collection,doc,getDoc,setDoc,addDoc,updateDoc,query,where,getDocs,orderBy,limit}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import{onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let user=null,current=null,chosen=null,unsub=false;

async function profile(uid){
 try{const s=await getDoc(doc(firebaseDb,'Perfis',uid));if(s.exists())return s.data();const q=await getDocs(query(collection(firebaseDb,'Perfis'),where('user_id','==',uid),limit(1)));return q.empty?{}:q.docs[0].data();}catch(e){return{}}
}
function msg(t,ok=false){const el=$('#status');if(!el)return;el.textContent=t;el.className='status '+(ok?'ok':'');}
function renderChoices(options,counts){
 const box=$('#choices');box.innerHTML=options.map((o,i)=>'<button class="choice '+(chosen===o.id?'selected':'')+'" data-id="'+esc(o.id)+'"><div class="num">'+String(i+1).padStart(2,'0')+'</div><h3>'+esc(o.title)+'</h3><p>'+esc(o.description)+'</p><div class="bar"><span style="width:'+Math.min(100,(counts[o.id]||0)/Math.max(1,Math.max(...Object.values(counts),1))*100)+'%"></span></div><div class="vote">'+(counts[o.id]||0)+' votos · '+(chosen===o.id?'Seu voto':'Escolher este caminho')+'</div></button>').join('');
 box.querySelectorAll('.choice').forEach(b=>b.onclick=()=>vote(b.dataset.id));
}
async function load(id){
 current=await getDoc(doc(firebaseDb,'Correntes',id));
 if(!current.exists()){msg('Corrente não encontrada.');return}
 const c=current.data();const oq=await getDocs(query(collection(firebaseDb,'CorrenteOpcoes'),where('corrente_id','==',id)));const options=oq.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.position||0)-(b.position||0));
 const vq=await getDocs(query(collection(firebaseDb,'CorrenteVotos'),where('corrente_id','==',id)));const counts={};vq.docs.forEach(d=>{const x=d.data();counts[x.opcao_id]=(counts[x.opcao_id]||0)+1;if(x.user_id===user?.uid)chosen=x.opcao_id});
 const p=await profile(c.user_id);
 $('#originName').textContent=p.display_name||'Criador PULSO';$('#originHandle').textContent=p.username?'@'+p.username:'';$('#originCaption').textContent=c.caption||'';$('#originTag').textContent=c.status==='closed'?'CORRENTE ENCERRADA':'IDEIA ORIGINAL · AO VIVO';
 $('#totalVotes').textContent=vq.size+' votos';$('#choicesTitle').textContent=options.length+' caminhos disponíveis';renderChoices(options,counts);
 if(c.winner_opcao_id){$('#winner').textContent=options.find(x=>x.id===c.winner_opcao_id)?.title||'Caminho escolhido';}
}
async function vote(opcaoId){
 if(!user){location.href='entrar.html?next=pulso-corrente.html';return}
 try{
  const id=current.id+'_'+user.uid;await setDoc(doc(firebaseDb,'CorrenteVotos',id),{corrente_id:current.id,opcao_id:opcaoId,user_id:user.uid,created_at:new Date().toISOString()},{merge:true});
  chosen=opcaoId;msg('Seu voto foi registrado no PULSO.','ok');await load(current.id);
 }catch(e){console.error(e);msg('Não foi possível registrar seu voto. Verifique sua conexão ou as permissões do Firestore.')}
}
async function createDemo(){
 if(!user)return;
 const ref=await addDoc(collection(firebaseDb,'Correntes'),{user_id:user.uid,caption:'Crie uma ideia que possa continuar pela comunidade.',status:'open',created_at:new Date().toISOString()});
 for(const [i,x] of ['Primeiro caminho','Segundo caminho','Terceiro caminho'].entries())await addDoc(collection(firebaseDb,'CorrenteOpcoes'),{corrente_id:ref.id,title:x,description:'A comunidade decide qual será a próxima continuação.',position:i});
 history.replaceState({},'',location.pathname+'?id='+ref.id);await load(ref.id);msg('Corrente criada. Agora ela já existe no Firestore.','ok');
}
onAuthStateChanged(firebaseAuth,async u=>{user=u;if(!u){msg('Entre no PULSO para participar.');return}const id=new URLSearchParams(location.search).get('id');if(id)await load(id);else{const q=await getDocs(query(collection(firebaseDb,'Correntes'),where('status','==','open'),orderBy('created_at','desc'),limit(1)));if(!q.empty)await load(q.docs[0].id);else await createDemo();}});
window.pulsoCorrente={vote,createDemo};