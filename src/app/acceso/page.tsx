import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/login-form";
export const metadata: Metadata = { title: "Acceder", robots: { index: false, follow: false } };
export default function AccessPage() {return <Suspense fallback={<div style={{minHeight:"100vh",background:"#0c131c"}}/>}><LoginForm/></Suspense>;}
