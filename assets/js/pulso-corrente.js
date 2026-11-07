import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{collection,doc,getDoc,setDoc,addDoc,updateDoc,query,where,getDocs,limit}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import{onAuthStateChanged}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

const $=s=>document.querySelector(s), CLOUD='zzllchy7', PRESET='pulso_publico';
let user=null,activeId=null,activeData=null,options=[],votes=[],myVote=null,loading=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=(s,ok=false)=>{const el=$('#status');if(el){el.textContent=s;el.className='status'+(ok?' ok':'')}};
const coll=n=>collection(firebaseDb,n);
async function uploadVideo(file,folder){
 if(!file)return null;
 if(!file.type.startsWith('video/'))throw Error('Selecione um arquivo de vídeo.');
 if(file.size>50*1024*1024)throw Error('O vídeo deve ter até 50 MB.');
 const form=new FormData();form.append('file',file);form.append('upload_preset',PRESET);form.append('folder','pulso/'+user.uid+'/'+folder);
 const r=await fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/video/upload',{method:'POST',body:form});
 const d=await r.json().catch(()=>({}));if(!r.ok||!d.secure_url)throw Error(d?.error?.message||'Falha ao enviar o vídeo.');
 return d.secure_url;
}
async function create(){
 if(!user){status('Entre na sua conta para criar uma Corrente.');return}
 const caption=$('#idea').value.trim(),titles=[1,2,3].map(i=>$('#o'+i).value.trim()),file=$('#openingVideo').files[0];
 if(!caption){status('Escreva a ideia inicial.');return}
 if(titles.some(x=>!x)){status('Preencha os três caminhos para a comunidade escolher.');return}
 const b=$('#createBtn');b.disabled=true;b.textContent='Publicando...';
 try{
  const media=await uploadVideo(file,'corrente-inicial');
  const ref=await addDoc(coll('Correntes'),{user_id:user.uid,caption,media_url:media||null,status:'open',created_at:new Date().toISOString(),vote_count:0,version:1});
  for(let i=0;i<3;i++)await addDoc(coll('CorrenteOpcoes'),{corrente_id:ref.id,title:titles[i],description:'Caminho '+(i+1),position:i,created_at:new Date().toISOString()});
  history.replaceState({},'',location.pathname+'?id='+ref.id);$('#createPanel').classList.add('hidden');await load(ref.id);status('Sua Corrente foi criada e já está disponível para receber votos.','ok');
 }catch(e){console.error('[Corrente create]',e);status('Não foi possível criar: '+(e.message||e))}
 finally{b.disabled=false;b.textContent='Publicar Corrente'}
}
async function load(id){
 activeId=id;const snap=await getDoc(doc(firebaseDb,'Correntes',id));
 if(!snap.exists()){status('Essa Corrente não foi encontrada.');return}
 activeData=snap.data();
 const [os,vs,es]=await Promise.all([
  getDocs(query(coll('CorrenteOpcoes'),where('corrente_id','==',id))),
  getDocs(query(coll('CorrenteVotos'),where('corrente_id','==',id))),
  getDocs(query(coll('CorrenteElos'),where('corrente_id','==',id)))
 ]);
 options=os.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.position||0)-(b.position||0));
 votes=vs.docs.map(d=>({id:d.id,...d.data()}));myVote=votes.find(v=>v.user_id===user?.uid)||null;
 const counts={};votes.forEach(v=>counts[v.opcao_id]=(counts[v.opcao_id]||0)+1);
 $('#createPanel').classList.add('hidden');$('#currentPanel').classList.remove('hidden');
 $('#ideaView').textContent=activeData.caption||'';
 $('#state').textContent=activeData.status==='closed'?'VOTAÇÃO ENCERRADA':'VOTAÇÃO ABERTA';
 $('#voteCount').textContent=votes.length+' voto(s) registrado(s)';
 $('#openingMedia').innerHTML=activeData.media_url?'<video controls playsinline preload="metadata" style="width:100%;max-height:360px;border-radius:14px;margin-top:12px" src="'+esc(activeData.media_url)+'"></video>':'';
 $('#voteOptions').innerHTML=options.map(o=>{const n=counts[o.id]||0,pct=votes.length?Math.round(n/votes.length*100):0;return '<div class="voteitem"><h3>'+esc(o.title)+'</h3><p>'+n+' voto(s) · '+pct+'%</p><div class="bar"><span style="width:'+pct+'%"></span></div><button class="btn '+(myVote?.opcao_id===o.id?'':'secondary')+'" data-vote="'+esc(o.id)+'" '+(activeData.status!=='open'||!user?'disabled':'')+'>'+(myVote?.opcao_id===o.id?'✓ Seu voto':'Votar neste caminho')+'</button></div>'}).join('');
 document.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>vote(b.dataset.vote));
 const isOwner=user?.uid===activeData.user_id;
 $('#ownerActions').classList.toggle('hidden',!isOwner||activeData.status!=='open');
 const winner=options.find(o=>o.id===activeData.winner_opcao_id);
 $('#winnerView').classList.toggle('hidden',!winner);
 if(winner)$('#winnerView').textContent='🏆 Caminho vencedor: '+winner.title;
 const already=es.docs.length>0;
 $('#continuePanel').classList.toggle('hidden',activeData.status!=='closed'||already||!user);
 $('#continueBtn').disabled=activeData.status!=='closed'||already;
 $('#chain').innerHTML=es.docs.map(d=>{const x=d.data();return '<div class="chainitem"><b>Continuação publicada</b><p>'+esc(x.caption||'')+'</p>'+(x.media_url?'<video controls playsinline preload="metadata" src="'+esc(x.media_url)+'"></video>':'')+'<div class="small">Elo da Corrente · '+new Date(x.created_at).toLocaleString('pt-BR')+'</div></div>'}).join('');
 if(!user)status('Entre no PULSO para votar ou publicar uma continuação.');
}
async function vote(optionId){
 if(!user||!activeId)return;
 if(activeData.status!=='open'){status('A votação já foi encerrada.');return}
 const b=document.querySelector('[data-vote="'+CSS.escape(optionId)+'"]');if(b)b.disabled=true;
 try{
  const voteId=activeId+'_'+user.uid;
  await setDoc(doc(firebaseDb,'CorrenteVotos',voteId),{corrente_id:activeId,opcao_id:optionId,user_id:user.uid,created_at:new Date().toISOString()});
  status('Voto registrado! Você pode alterar seu voto enquanto a votação estiver aberta.','ok');await load(activeId);
 }catch(e){console.error('[Corrente vote]',e);status('Falha ao registrar o voto: '+(e.message||e))}
}
async function closeVote(){
 if(!user||user.uid!==activeData?.user_id)return;
 if(!confirm('Encerrar a votação agora? O caminho com mais votos será escolhido.'))return;
 try{
  const counts={};votes.forEach(v=>counts[v.opcao_id]=(counts[v.opcao_id]||0)+1);
  const winner=[...options].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0))[0];
  if(!winner||!votes.length){status('Ainda não há votos. Aguarde a comunidade participar.');return}
  await updateDoc(doc(firebaseDb,'Correntes',activeId),{status:'closed',winner_opcao_id:winner.id,winner_title:winner.title,closed_at:new Date().toISOString()});
  await load(activeId);status('Votação encerrada. O caminho vencedor foi definido!','ok');
 }catch(e){console.error('[Corrente close]',e);status('Não foi possível encerrar: '+(e.message||e))}
}
async function continueChain(){
 if(!user||activeData?.status!=='closed'||!activeData.winner_opcao_id)return;
 const caption=$('#continueText').value.trim(),file=$('#continueVideo').files[0];
 if(!caption&&!file){status('Escreva algo ou selecione um vídeo para continuar.');return}
 const b=$('#continueBtn');b.disabled=true;b.textContent='Publicando...';
 try{
  const exists=await getDocs(query(coll('CorrenteElos'),where('corrente_id','==',activeId),limit(1)));
  if(!exists.empty)throw Error('Esta Corrente já recebeu uma continuação.');
  const media=await uploadVideo(file,'corrente-continuacao');
  const post=await addDoc(coll('Posts'),{user_id:user.uid,caption,media_type:media?'video':'text',media_url:media,video_url:media,created_at:new Date().toISOString(),corrente_id:activeId,corrente_parent_id:activeData.last_post_id||null,corrente_winner_opcao_id:activeData.winner_opcao_id});
  await addDoc(coll('CorrenteElos'),{corrente_id:activeId,post_id:post.id,user_id:user.uid,caption,media_url:media||null,parent_post_id:activeData.last_post_id||null,created_at:new Date().toISOString()});
  await updateDoc(doc(firebaseDb,'Correntes',activeId),{last_post_id:post.id,last_user_id:user.uid,continuation_count:(activeData.continuation_count||0)+1,status:'continued'});
  await load(activeId);status('Continuação publicada no feed e vinculada à Corrente!','ok');
 }catch(e){console.error('[Corrente continuation]',e);status('Não foi possível publicar a continuação: '+(e.message||e))}
 finally{b.disabled=false;b.textContent='Publicar continuação'}
}
$('#createBtn').addEventListener('click',create);
$('#closeVoteBtn').addEventListener('click',closeVote);
$('#continueBtn').addEventListener('click',continueChain);
onAuthStateChanged(firebaseAuth,async u=>{
 user=u;
 const id=new URLSearchParams(location.search).get('id');
 if(id){try{await load(id)}catch(e){console.error(e);status('Erro ao abrir Corrente: '+(e.message||e))}}
 else if(!u){status('Entre na sua conta PULSO para criar uma Corrente ou abrir um link compartilhado.')}
});
