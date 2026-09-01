import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, AlertCircle, Check, X } from "lucide-react";
import { useCompany } from "@/lib/companyContext";
import { useActivePack } from "@/lib/packs/useActivePack";
import { listEmployees } from "@/lib/data.functions";
import {
  listLeaveTypes,
  getLeaveEntitlements,
  listLeaveRequests,
  createLeaveRequest,
  decideLeaveRequest,
} from "@/lib/leave.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leave")({
  component: LeavePage,
  head: () => ({
    meta: [
      { title: "Statutory Leave — UBoard Compliance OS" },
      {
        name: "description",
        content:
          "Track statutory leave entitlements, balances and requests under the local labor code and social legislation.",
      },
      { property: "og:title", content: "Statutory Leave — UBoard Compliance OS" },
      {
        property: "og:description",
        content: "Statutory leave entitlements, balances and approvals per country pack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LeavePage() {
  const { companyId, company } = useCompany();
  const activePack = useActivePack();
  const queryClient = useQueryClient();

  const typesFn = useServerFn(listLeaveTypes);
  const entitlementsFn = useServerFn(getLeaveEntitlements);
  const requestsFn = useServerFn(listLeaveRequests);
  const createFn = useServerFn(createLeaveRequest);
  const decideFn = useServerFn(decideLeaveRequest);

  const year = new Date().getFullYear();
  const [employeeId, setEmployeeId] = useState("");
  const [leaveCode, setLeaveCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState("1");
  const [busy, setBusy] = useState(false);

  const typesQuery = useQuery({
    queryKey: ["leave-types", activePack.code],
    queryFn: () => typesFn({ data: { country: activePack.code } }),
    enabled: Boolean(activePack.code),
  });
  const employeesQuery = useQuery({
    queryKey: ["employees", companyId],
    queryFn: () => listEmployees({ data: { companyId: companyId! } }),
    enabled: Boolean(companyId),
  });
  const entitlementsQuery = useQuery({
    queryKey: ["leave-entitlements", companyId, employeeId, year],
    queryFn: () => entitlementsFn({ data: { companyId: companyId!, employeeId, year } }),
    enabled: Boolean(companyId && employeeId),
  });
  const requestsQuery = useQuery({
    queryKey: ["leave-requests", companyId],
    queryFn: () => requestsFn({ data: { companyId: companyId! } }),
    enabled: Boolean(companyId),
  });

  const types = typesQuery.data ?? [];
  const unsupported = typesQuery.isSuccess && types.length === 0;
  const employees = employeesQuery.data ?? [];

  if (!companyId) return <p className="text-muted-foreground">Create a company first.</p>;

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !leaveCode || !startDate || !endDate) {
      toast.error("Employee, leave type and dates are required");
      return;
    }
    setBusy(true);
    try {
      await createFn({
        data: {
          companyId: companyId!,
          employeeId,
          leaveCode,
          startDate,
          endDate,
          days: Number(days),
        },
      });
      toast.success("Leave request submitted");
      await queryClient.invalidateQueries({ queryKey: ["leave-requests", companyId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, status: "approved" | "rejected") {
    try {
      await decideFn({ data: { requestId, status } });
      await queryClient.invalidateQueries({ queryKey: ["leave-requests", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["leave-entitlements", companyId] });
      toast.success(`Request ${status}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statutory Leave</h1>
          <p className="text-muted-foreground">
            {company?.name} · {activePack.name}
          </p>
        </div>
      </div>

      {unsupported ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Not available for {activePack.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This country pack does not ship a statutory leave engine yet. Switch to a pack that
            provides the leave capability (e.g. Philippines) to see entitlements and balances.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Entitlements {year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {entitlementsQuery.data?.entitlements?.length ? (
                  <div className="space-y-3">
                    {entitlementsQuery.data.entitlements.map((e) => (
                      <div key={e.code} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{e.legalBasis}</p>
                          </div>
                          <Badge variant={e.eligible ? "default" : "secondary"}>
                            {e.eligible
                              ? `${e.remainingDays}/${e.entitledDays} days`
                              : "Not eligible"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{e.reason}</p>
                        {e.convertibleToCash && (
                          <p className="mt-1 text-xs text-primary">
                            Unused days convert to cash on final pay
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an employee to see statutory entitlements.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New request</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Leave type</Label>
                    <Select value={leaveCode} onValueChange={setLeaveCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.code} value={t.code}>
                            {t.title} — {t.days} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Start</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Days</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Submitting..." : "Submit request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {(requestsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave requests yet.</p>
              ) : (
                <div className="space-y-2">
                  {(requestsQuery.data ?? []).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {types.find((t) => t.code === r.leave_code)?.title ?? r.leave_code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.start_date} → {r.end_date} · {Number(r.days)} day(s) ·{" "}
                          {r.paid ? "paid" : "unpaid"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === "approved" ? "default" : "secondary"}>
                          {r.status}
                        </Badge>
                        {r.status === "submitted" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => decide(r.id, "approved")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => decide(r.id, "rejected")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
