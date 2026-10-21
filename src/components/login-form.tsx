"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, LockKeyhole, Mail, Sparkles } from "lucide-react";
import Logo from "./logo";
import { getSupabaseBrowser } from "@/lib/client/supabase";
import { isDemoMode } from "@/lib/config";

function InnerForm() {
  const params = useSearchParams();
  const [email,setEmail] = useState(""); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  const plan=params.get("plan")||"";
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError(false);
    try {
      const supabase=getSupabaseBrowser();
      if(!supabase || isDemoMode) throw new Error("El acceso real aún no está configurado. Usa el panel de demostración.");
      const redirectTo=new URL("/auth/callback",window.location.origin);
      redirectTo.searchParams.set("next",plan?`/dashboard?plan=${encodeURIComponent(plan)}`:"/dashboard");
      const {error: authError}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo.toString()}});
      if(authError) throw authError;
      setMessage("Revisa tu correo: enviamos un enlace para acceder. También verifica la carpeta de spam.");
    }catch(e){setMessage(e instanceof Error?e.message:"No se pudo iniciar sesión.");setError(true)}
    finally{setBusy(false)}
  }
  return <div className="auth-layout"><aside className="auth-left"><Logo/><div className="auth-quote"><span className="auth-tag">TU PRÓXIMA PERSPECTIVA</span><h1>Tu espacio.<br/>Tu visión.<br/><span>Tu movimiento.</span></h1><p>Una manera intuitiva de mantener cada detalle de tu experiencia a la vista.</p></div><div className="auth-left-footer">JH INVERSIONES / TU PRÓXIMO PASO</div></aside><main className="auth-right"><div className="auth-form"><Link className="auth-back" href="/"><ArrowLeft size={16}/> Volver al inicio</Link><h2>Bienvenido de nuevo.</h2><p>Entra a tu espacio privado para consultar tus planes, periodos y solicitudes.</p><form onSubmit={submit}><label htmlFor="email">Correo electrónico</label><div className="auth-input-shell"><Mail size={19}/><input required id="email" autoComplete="email" type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value)} /></div><button className="auth-submit" disabled={busy||isDemoMode} type="submit">{busy?"Enviando enlace…":"Continuar con mi correo"}<ArrowRight size={19}/></button>{message&&<div className={`auth-message ${error?"error":""}`} role="status">{message}</div>}</form><div className="auth-demo"><p>{isDemoMode?"La autenticación está en modo demostración.":"¿Quieres conocer la experiencia antes de entrar?"}</p><Link href={isDemoMode?"/dashboard":"/#planes"}>{isDemoMode?"Explorar el panel de demostración":"Volver a explorar los planes"} <ArrowUpRight size={18}/></Link></div></div></main></div>;
}

export default function LoginForm(){ return <InnerForm/>; }
