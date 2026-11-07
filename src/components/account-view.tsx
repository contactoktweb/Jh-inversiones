"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, ShieldAlert, UserRound } from "lucide-react";
import AppShell from "./app-shell";
import { formatDate } from "@/lib/finance";
import { getSupabaseBrowser } from "@/lib/client/supabase";

type Profile = { fullName: string; phone: string; country: string; payoutDetails: string };

function useSubmit() {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState(false);
  async function run(task:()=>Promise<string>){setBusy(true);setMessage("");setError(false);try{setMessage(await task());}catch(e){setMessage(e instanceof Error?e.message:"Error desconocido");setError(true);}finally{setBusy(false)}}
  return {busy,message,error,run};
}

export default function AccountView({ email, profile, memberSince, suspended }: {email:string;profile:Profile;memberSince:string|null;suspended:boolean}) {
  const router=useRouter();
  const [form,setForm]=useState(profile);
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState("");
  const save=useSubmit(); const pass=useSubmit();
  const set=(key:keyof Profile)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm({...form,[key]:e.target.value});

  return <AppShell variant="user" email={email} eyebrow="MI CUENTA" title="Tus datos." subtitle={memberSince?`Cliente desde el ${formatDate(memberSince)}`:undefined}>
    {suspended&&<div className="withdraw-alert" role="alert"><ShieldAlert size={18}/><span><strong>Tu cuenta está suspendida.</strong> Contacta a soporte.</span></div>}
    <div className="dash-body-grid">
      <section className="dash-panel"><div className="panel-heading"><h2>Datos personales</h2><span><UserRound size={15}/> Visibles para la administración</span></div>
        <form className="form-grid" onSubmit={e=>{e.preventDefault();save.run(async()=>{const res=await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await res.json();if(!res.ok)throw new Error(data.error);router.refresh();return data.message;});}}>
          <label>Correo<input value={email} disabled/></label>
          <label>Nombre completo<input required minLength={3} maxLength={120} value={form.fullName} onChange={set("fullName")} autoComplete="name"/></label>
          <label>Teléfono / WhatsApp<input maxLength={40} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+57 300 123 4567"/></label>
          <label>País<input maxLength={60} value={form.country} onChange={set("country")} autoComplete="country-name"/></label>
          <label className="span-2">¿Dónde quieres recibir tus retiros?<textarea className="field-textarea" rows={4} maxLength={1000} value={form.payoutDetails} onChange={set("payoutDetails")} placeholder="Banco, tipo y número de cuenta, titular y documento. O tu billetera / correo de PayPal."/></label>
          <div className="span-2 form-actions"><button className="rate-primary" disabled={save.busy||suspended}><Save size={16}/>{save.busy?"Guardando…":"Guardar datos"}</button>{save.message&&<p role="status" className={`claim-feedback ${save.error?"error":""}`}>{save.message}</p>}</div>
        </form>
      </section>
      <section className="dash-panel"><div className="panel-heading"><h2>Contraseña</h2><span><KeyRound size={15}/> Seguridad</span></div>
        <form className="form-grid single" onSubmit={e=>{e.preventDefault();pass.run(async()=>{if(password!==confirm)throw new Error("Las contraseñas no coinciden.");const supabase=getSupabaseBrowser();if(!supabase)throw new Error("Supabase no está configurado.");const {error}=await supabase.auth.updateUser({password});if(error)throw new Error(error.message);setPassword("");setConfirm("");return "Contraseña actualizada.";});}}>
          <label>Nueva contraseña<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
          <label>Repite la contraseña<input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
          <div className="form-actions"><button className="rate-primary" disabled={pass.busy}><KeyRound size={16}/>{pass.busy?"Guardando…":"Cambiar contraseña"}</button>{pass.message&&<p role="status" className={`claim-feedback ${pass.error?"error":""}`}>{pass.message}</p>}</div>
        </form>
      </section>
    </div>
  </AppShell>;
}
