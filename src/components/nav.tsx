"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "./logo";
const links = [
  {href:"/#beneficios",label:"Por qué JH"},
  {href:"/#experiencia",label:"La experiencia"},
  {href:"/#planes",label:"Planes"},
  {href:"/#simulador",label:"Simulador"},
  {href:"/#preguntas",label:"Ayuda"},
];
export default function Nav(){
  const [open,setOpen]=useState(false);
  return <header className="bm-header">
    <div className="bm-nav-container">
      <Logo/>
      <nav className="bm-nav-links" aria-label="Navegación principal">{links.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      <div className="bm-nav-actions"><Link href="/acceso" className="bm-login">Iniciar sesión</Link><Link href="/#planes" className="bm-nav-start">Comenzar <ArrowUpRight size={16}/></Link>
      <button className="bm-nav-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label={open?"Cerrar menú":"Abrir menú"}>{open?<X size={22}/>:<Menu size={22}/>}</button></div>
    </div>
    <AnimatePresence>{open&&<motion.nav className="bm-nav-mobile" initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2}} aria-label="Navegación móvil">{links.map(item=><Link onClick={()=>setOpen(false)} key={item.href} href={item.href}>{item.label}<ArrowUpRight size={15}/></Link>)}<Link onClick={()=>setOpen(false)} href="/acceso">Iniciar sesión <ArrowUpRight size={15}/></Link></motion.nav>}</AnimatePresence>
  </header>;
}
