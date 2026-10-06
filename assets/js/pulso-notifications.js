import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{addDoc,collection}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

export async function createPulsoNotification({recipientId,actorId= firebaseAuth.currentUser?.uid,postId='',type='activity'}={}){
  if(!recipientId||!actorId||recipientId===actorId)return;
  try{
    await addDoc(collection(firebaseDb,'notifications'),{
      recipient_id:recipientId,
      actor_id:actorId,
      post_id:postId||null,
      type,
      created_at:new Date().toISOString(),
      read_at:null
    });
  }catch(e){
    console.warn('[PULSO notifications] não foi possível criar notificação',e);
  }
}
