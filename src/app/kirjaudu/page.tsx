import { AuthForm } from "@/components/app/auth-form";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const params = await searchParams; return <AuthForm action="login" invalidLink={params.error === "linkki"} />; }
