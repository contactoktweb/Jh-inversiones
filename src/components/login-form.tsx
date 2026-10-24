"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck, UserRound, Zap } from "lucide-react";
import Logo from "./logo";
import { getSupabaseBrowser } from "@/lib/client/supabase";
import { isDemoMode } from "@/lib/config";

type Role = "user" | "admin";
const quickLogin = process.env.NEXT_PUBLIC_QUICK_LOGIN !== "false";

function InnerForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [role,setRole] = useState<Role>(params.get("rol")==="admin"?"admin":"user");
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  const signup = mode==="signup" && role==="user";

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError(false);
    try {
      const supabase=getSupabaseBrowser();
      if(!supabase || isDemoMode) throw new Error("El acceso con cuenta aún no está configurado. Usa los botones de acceso rápido.");
      if(signup){
        const redirectTo=new URL("/auth/callback",window.location.origin);
        const {error: authError}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo.toString()}});
        if(authError) throw authError;
        setMessage("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");setMode("login");
        return;
      }
      const {data,error: authError}=await supabase.auth.signInWithPassword({email,password});
      if(authError) throw new Error(authError.message==="Invalid login credentials"?"Correo o contraseña incorrectos.":authError.message);
      const {data: profile}=await supabase.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
      const actual: Role=profile?.role==="admin"?"admin":"user";
      if(role==="admin"&&actual!=="admin"){await supabase.auth.signOut();throw new Error("Esta cuenta no tiene permisos de administrador.");}
      const next=params.get("next");
      router.push(actual==="admin"?"/admin":next&&next.startsWith("/")&&!next.startsWith("//")?next:"/dashboard");
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"No se pudo iniciar sesión.");setError(true)}
    finally{setBusy(false)}
  }

  return <div className="auth-layout"><aside className="auth-left"><Logo/><div className="auth-quote"><span className="auth-tag">INVIERTE DESDE 50 USD</span><h1>Tu espacio.<br/>Tu visión.<br/><span>Tu movimiento.</span></h1><p>Consulta tu inversión, tus ganancias diarias y el plazo mínimo de un mes desde un solo lugar.</p></div><div className="auth-left-footer">JH INVERSIONES / TU PRÓXIMO PASO</div></aside>
  <main className="auth-right"><div className="auth-form"><Link className="auth-back" href="/"><ArrowLeft size={16}/> Volver al inicio</Link>
    {quickLogin&&<section className="auth-quick" aria-labelledby="auth-quick-title">
      <div className="auth-quick-head"><Zap size={16}/><span id="auth-quick-title">Ver la plataforma (acceso rápido)</span></div>
      <div className="auth-quick-buttons">
        <form method="POST" action="/api/demo-login"><input type="hidden" name="role" value="user"/><button type="submit" className="user"><span className="auth-quick-icon"><UserRound size={22}/></span><span><strong>Ver como usuario</strong><small>Inversión, ganancias y retiros</small></span><ArrowRight size={18}/></button></form>
        <form method="POST" action="/api/demo-login"><input type="hidden" name="role" value="admin"/><button type="submit" className="admin"><span className="auth-quick-icon"><ShieldCheck size={22}/></span><span><strong>Ver como administrador</strong><small>Ganancia diaria y desembolsos</small></span><ArrowRight size={18}/></button></form>
      </div>
      <p>Entra sin contraseña con datos de demostración.</p>
    </section>}
    {quickLogin&&<div className="auth-divider"><span>o inicia sesión con tu cuenta</span></div>}
    <div className="auth-role-tabs" role="tablist" aria-label="Tipo de cuenta">
      <button type="button" role="tab" aria-selected={role==="user"} className={role==="user"?"active":""} onClick={()=>setRole("user")}><UserRound size={16}/> Usuario</button>
      <button type="button" role="tab" aria-selected={role==="admin"} className={role==="admin"?"active":""} onClick={()=>{setRole("admin");setMode("login")}}><ShieldCheck size={16}/> Administrador</button>
    </div>
    <h2>{signup?"Crea tu cuenta.":role==="admin"?"Panel de administración.":"Bienvenido de nuevo."}</h2>
    <p>{role==="admin"?"Configura la ganancia diaria y supervisa las inversiones de la plataforma.":"Entra para consultar tu inversión, tus ganancias y el tiempo restante de tu plazo."}</p>
    <form onSubmit={submit}>
      <label htmlFor="email">Correo electrónico</label>
      <div className="auth-input-shell"><Mail size={19}/><input required id="email" autoComplete="email" type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <label htmlFor="password">Contraseña</label>
      <div className="auth-input-shell"><KeyRound size={19}/><input required id="password" minLength={8} autoComplete={signup?"new-password":"current-password"} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <button className="auth-submit" disabled={busy} type="submit">{busy?"Procesando…":signup?"Crear cuenta":"Iniciar sesión"}<ArrowRight size={19}/></button>
      {message&&<div className={`auth-message ${error?"error":""}`} role="status">{message}</div>}
    </form>
    {role==="user"&&<button type="button" className="auth-switch" onClick={()=>{setMode(signup?"login":"signup");setMessage("")}}>{signup?"¿Ya tienes cuenta? Inicia sesión":"¿No tienes cuenta? Regístrate"}</button>}
  </div></main></div>;
}

export default function LoginForm(){ return <InnerForm/>; }
