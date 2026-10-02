import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    if (!user) return;
    // Platform staff land in the Backoffice; access is still enforced there.
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const staff = (data ?? []).some((r) =>
          ["platform_admin", "platform_operator", "platform_auditor", "country_cto"].includes(r.role),
        );
        navigate({ to: staff ? "/platform" : "/dashboard" });
      });
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
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth",
      },
    });
    setLoading(false);
    if (error) return toast.error("Google sign-in failed");
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

            {/* Homologation phase: there is no public sign-up. Workspace
                creation is gated server-side by an approved pilot request, so
                this CTA is the only legitimate entry path for a new company. */}
            <div className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                UBoardAsia operates controlled access during its Homologation Pilot Program.
                New organizations join by approved application only.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to="/ph">Apply — Philippines</Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/id">Apply — Indonesia</Link>
                </Button>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Already invited? Ask your organization administrator for your credentials.
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
