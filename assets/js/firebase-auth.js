import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { auth } from "./firebase.js";

await setPersistence(auth, browserLocalPersistence);

export {
  auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged
};

export function authErrorMessage(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta no PULSO.",
    "auth/weak-password": "A senha precisa ter pelo menos 8 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
    "auth/popup-closed-by-user": "A janela de login foi fechada.",
    "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups para o PULSO.",
    "auth/operation-not-allowed": "Este método de login ainda não foi habilitado no Firebase.",
    "auth/expired-action-code": "Este link expirou. Solicite outro link de recuperação.",
    "auth/invalid-action-code": "Este link não é mais válido. Solicite um novo link."
  };
  return map[code] || error?.message || "Não foi possível concluir a operação agora.";
}

export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function signUpEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await sendEmailVerification(result.user, {
    url: "https://tal1725.github.io/pulso/entrar.html"
  });
  return result;
}
