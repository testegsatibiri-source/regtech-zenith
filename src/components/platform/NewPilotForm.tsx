// Operator form to register an approved pilot customer directly.
// Authorization and audit happen server-side in `createPilotManually`.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPilotManually } from "@/lib/pilot.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Range = "1-50" | "51-200" | "201-1000" | "1000+";
type Country = "ID" | "PH" | "BOTH";

export function NewPilotForm(props: { onDone: () => void; onCancel: () => void }) {
  const fn = useServerFn(createPilotManually);
  const [f, setF] = useState({
    fullName: "",
    email: "",
    companyName: "",
    role: "HR Executive",
    employeeRange: "1-50" as Range,
    authorizedCountry: "PH" as Country,
    expires: "",
    reason: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          fullName: f.fullName,
          email: f.email,
          companyName: f.companyName,
          role: f.role,
          employeeRange: f.employeeRange,
          authorizedCountry: f.authorizedCountry,
          pilotExpiresAt: f.expires ? new Date(`${f.expires}T23:59:59Z`).toISOString() : null,
          reason: f.reason,
        },
      }),
    onSuccess: () => {
      toast.success("Pilot customer registered and approved");
      props.onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Register pilot customer</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <div>
            <Label>Contact name</Label>
            <Input required value={f.fullName} onChange={set("fullName")} />
          </div>
          <div>
            <Label>Contact e-mail (login)</Label>
            <Input required type="email" value={f.email} onChange={set("email")} />
          </div>
          <div>
            <Label>Company</Label>
            <Input required value={f.companyName} onChange={set("companyName")} />
          </div>
          <div>
            <Label>Contact role</Label>
            <Input required value={f.role} onChange={set("role")} />
          </div>
          <div>
            <Label>Employees</Label>
            <select className={sel} value={f.employeeRange} onChange={set("employeeRange")}>
              {["1-50", "51-200", "201-1000", "1000+"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Authorized country</Label>
            <select className={sel} value={f.authorizedCountry} onChange={set("authorizedCountry")}>
              <option value="PH">Philippines</option>
              <option value="ID">Indonesia</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <Label>Pilot expires (optional)</Label>
            <Input type="date" value={f.expires} onChange={set("expires")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Reason / commercial basis (required)</Label>
            <Textarea required value={f.reason} onChange={set("reason")} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={m.isPending}>
              {m.isPending ? "Saving…" : "Register & approve"}
            </Button>
            <Button type="button" variant="outline" onClick={props.onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
