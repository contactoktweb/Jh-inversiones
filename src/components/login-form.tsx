"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import Logo from "./logo";
import { getSupabaseBrowser } from "@/lib/client/supabase";
import { hasSupabaseConfig } from "@/lib/config";

type Role = "user" | "admin";
type Mode = "login" | "signup" | "forgot";
const safeNext = (value: string | null) => value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : null;

function InnerForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [role,setRole] = useState<Role>(params.get("rol")==="admin"?"admin":"user");
  const [mode,setMode] = useState<Mode>("login");
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState(params.get("error")?"El enlace no es válido o ya expiró. Si confirmaste tu cuenta, inicia sesión; si querías cambiar tu contraseña, pide un enlace nuevo.":"");
  const [error,setError]=useState(Boolean(params.get("error")));
  const next = safeNext(params.get("next"));
  const signup = mode==="signup" && role==="user";

  function callbackUrl(target: string) {
    const url=new URL("/auth/callback",window.location.origin);
    url.searchParams.set("next",target);
    return url.toString();
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setMessage("");setError(false);
    try {
      const supabase=getSupabaseBrowser();
      if(!supabase) throw new Error("El acceso aún no está configurado: faltan las claves de Supabase.");
      if(mode==="forgot"){
        const {error: authError}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:callbackUrl("/restablecer")});
        if(authError) throw authError;
        setMessage("Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.");
        return;
      }
      if(signup){
        const {data,error: authError}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callbackUrl(next||"/dashboard")}});
        if(authError) throw authError;
        if(data.session){router.push(next||"/dashboard");router.refresh();return;}
        setMessage("Cuenta creada. Revisa tu correo y confirma tu cuenta para entrar.");setMode("login");
        return;
      }
      const {data,error: authError}=await supabase.auth.signInWithPassword({email,password});
      if(authError) throw new Error(authError.message==="Invalid login credentials"?"Correo o contraseña incorrectos.":authError.message==="Email not confirmed"?"Confirma tu correo antes de iniciar sesión.":authError.message);
      // El rol real lo decide el servidor (profiles.role o ADMIN_EMAILS); /admin redirige si no corresponde.
      const {data: profile}=await supabase.from("profiles").select("role").eq("id",data.user.id).maybeSingle();
      router.push(role==="admin"||profile?.role==="admin"?"/admin":next||"/dashboard");
      router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"No se pudo completar la operación.");setError(true)}
    finally{setBusy(false)}
  }

  const title=mode==="forgot"?"Recupera tu acceso.":signup?"Crea tu cuenta.":role==="admin"?"Panel de administración.":"Bienvenido de nuevo.";
  return <div className="auth-layout"><aside className="auth-left"><Logo/><div className="auth-quote"><span className="auth-tag">INVIERTE EN DÓLARES</span><h1>Tu espacio.<br/>Tu visión.<br/><span>Tu movimiento.</span></h1><p>Consulta tu inversión, tus ganancias diarias y el plazo mínimo de un mes desde un solo lugar.</p></div><div className="auth-left-footer">JH INVERSIONES / TU PRÓXIMO PASO</div></aside>
  <main className="auth-right"><div className="auth-form"><Link className="auth-back" href="/"><ArrowLeft size={16}/> Volver al inicio</Link>
    {!hasSupabaseConfig&&<div className="auth-config-warning" role="alert"><TriangleAlert size={18}/><span>Falta configurar Supabase: agrega <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en las variables de entorno.</span></div>}
    {mode!=="forgot"&&<div className="auth-role-tabs" role="tablist" aria-label="Tipo de cuenta">
      <button type="button" role="tab" aria-selected={role==="user"} className={role==="user"?"active":""} onClick={()=>setRole("user")}><UserRound size={16}/> Usuario</button>
      <button type="button" role="tab" aria-selected={role==="admin"} className={role==="admin"?"active":""} onClick={()=>{setRole("admin");setMode("login")}}><ShieldCheck size={16}/> Administrador</button>
    </div>}
    <h2>{title}</h2>
    <p>{mode==="forgot"?"Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.":role==="admin"?"Configura la ganancia diaria y gestiona los retiros de la plataforma.":"Entra para consultar tu inversión, tus ganancias y el tiempo restante de tu plazo."}</p>
    <form onSubmit={submit}>
      <label htmlFor="email">Correo electrónico</label>
      <div className="auth-input-shell"><Mail size={19}/><input required id="email" autoComplete="email" type="email" placeholder="tu@correo.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      {mode!=="forgot"&&<><label htmlFor="password">Contraseña</label>
      <div className="auth-input-shell"><KeyRound size={19}/><input required id="password" minLength={8} autoComplete={signup?"new-password":"current-password"} type="password" placeholder={signup?"Mínimo 8 caracteres":"••••••••"} value={password} onChange={e=>setPassword(e.target.value)} /></div></>}
      <button className="auth-submit" disabled={busy} type="submit">{busy?"Procesando…":mode==="forgot"?"Enviar enlace":signup?"Crear cuenta":"Iniciar sesión"}<ArrowRight size={19}/></button>
      {message&&<div className={`auth-message ${error?"error":""}`} role="status">{message}</div>}
    </form>
    <div className="auth-links">
      {mode==="login"&&<button type="button" className="auth-switch" onClick={()=>{setMode("forgot");setMessage("")}}>¿Olvidaste tu contraseña?</button>}
      {mode==="forgot"&&<button type="button" className="auth-switch" onClick={()=>{setMode("login");setMessage("")}}>Volver a iniciar sesión</button>}
      {role==="user"&&mode!=="forgot"&&<button type="button" className="auth-switch" onClick={()=>{setMode(signup?"login":"signup");setMessage("")}}>{signup?"¿Ya tienes cuenta? Inicia sesión":"¿No tienes cuenta? Regístrate"}</button>}
    </div>
  </div></main></div>;
}

export default function LoginForm(){ return <InnerForm/>; }
