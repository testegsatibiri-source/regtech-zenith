import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — UBoardAsia RegTech Platform" },
      {
        name: "description",
        content:
          "Secure sign-in for UBoardAsia. Access to the compliance platform is invite-only for corporate users.",
      },
      { property: "og:title", content: "Sign in — UBoardAsia RegTech Platform" },
      {
        property: "og:description",
        content: "Secure, invite-only access to the UBoardAsia compliance platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Mode = "signin" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function requestReset() {
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    // Generic response: never reveal whether the address exists.
    toast.success("If that address has an account, a reset link is on its way.");
    setMode("signin");
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) return toast.error("Google sign-in failed");
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-hero px-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          UBoard<span className="text-accent">Asia</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {mode === "signin" ? "Sign in" : "Reset your password"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "signin" ? (
              <div className="space-y-3">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="Password" value={password} onChange={setPassword} type="password" />
                <Button className="w-full" onClick={signIn} disabled={loading}>
                  Sign in
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot your password?
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Button className="w-full" onClick={requestReset} disabled={loading}>
                  Send reset link
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Back to sign in
                </button>
              </div>
            )}

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continue with Google
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Access is invite-only. Ask your organization administrator for an invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
