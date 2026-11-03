"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import Logo from "./logo";
import { getSupabaseBrowser } from "@/lib/client/supabase";

/** Se llega aquí desde el enlace del correo de recuperación (la sesión ya la creó /auth/callback). */
export default function ResetPasswordForm() {
  const router = useRouter();
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setMessage("");setError(false);
    if(password!==confirm){setMessage("Las contraseñas no coinciden.");setError(true);return;}
    setBusy(true);
    try{
      const supabase=getSupabaseBrowser();
      if(!supabase)throw new Error("Supabase no está configurado.");
      const {error:authError}=await supabase.auth.updateUser({password});
      if(authError)throw new Error(authError.message.includes("session")?"El enlace expiró. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».":authError.message);
      setMessage("Contraseña actualizada. Entrando a tu panel…");
      setTimeout(()=>{router.push("/dashboard");router.refresh();},1200);
    }catch(e){setMessage(e instanceof Error?e.message:"No se pudo actualizar la contraseña.");setError(true)}
    finally{setBusy(false)}
  }
  return <div className="auth-layout"><aside className="auth-left"><Logo/><div className="auth-quote"><span className="auth-tag">RECUPERA TU ACCESO</span><h1>Una nueva<br/><span>contraseña.</span></h1></div><div className="auth-left-footer">JH INVERSIONES</div></aside>
  <main className="auth-right"><div className="auth-form"><h2>Crea tu nueva contraseña.</h2><p>Usa al menos 8 caracteres.</p>
    <form onSubmit={submit}>
      <label htmlFor="password">Nueva contraseña</label>
      <div className="auth-input-shell"><KeyRound size={19}/><input required id="password" minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></div>
      <label htmlFor="confirm">Repite la contraseña</label>
      <div className="auth-input-shell"><KeyRound size={19}/><input required id="confirm" minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
      <button className="auth-submit" disabled={busy} type="submit">{busy?"Guardando…":"Guardar contraseña"}<ArrowRight size={19}/></button>
      {message&&<div className={`auth-message ${error?"error":""}`} role="status">{message}</div>}
    </form>
    <div className="auth-links"><Link className="auth-switch" href="/acceso">Volver a iniciar sesión</Link></div>
  </div></main></div>;
}
