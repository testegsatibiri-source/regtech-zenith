import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set a new password — UBoardAsia" },
      {
        name: "description",
        content: "Choose a new password for your UBoardAsia compliance platform account.",
      },
      { property: "og:title", content: "Set a new password — UBoardAsia" },
      {
        property: "og:description",
        content: "Choose a new password for your UBoardAsia account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash ?? "";
    const isRecoveryLink = hash.includes("type=recovery");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecoveryLink && session)) {
        setRecovery(true);
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecoveryLink) setRecovery(true);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit() {
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in again.");
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth" });
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
            <CardTitle className="text-center">Set a new password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!ready ? (
              <p className="text-center text-sm text-muted-foreground">Validating link…</p>
            ) : !recovery ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid or has expired. Request a new one from the
                  sign-in page.
                </p>
                <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
                  Back to sign in
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={submit} disabled={loading}>
                  Update password
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
