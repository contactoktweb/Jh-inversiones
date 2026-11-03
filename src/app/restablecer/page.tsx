import type { Metadata } from "next";
import ResetPasswordForm from "@/components/reset-password-form";
export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <ResetPasswordForm />; }
