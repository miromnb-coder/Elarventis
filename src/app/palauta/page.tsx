import { AuthForm } from "@/components/app/auth-form";
export default async function Recovery({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <AuthForm action={mode === "new" ? "update-password" : "recovery"} />;
}
