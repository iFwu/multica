"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import type {
  Agentflow,
  AgentflowTrigger,
  AgentflowRun,
  Agent,
  CreateAgentflowRequest,
} from "@/shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAgentflowStore } from "@/features/agentflows";
import { useWorkspaceStore } from "@/features/workspace";
import { api } from "@/shared/api";

// ---------------------------------------------------------------------------
// Run status config
// ---------------------------------------------------------------------------

const runStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-muted-foreground" },
  running: { label: "Running", icon: Loader2, color: "text-success" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-success" },
  failed: { label: "Failed", icon: XCircle, color: "text-destructive" },
};

// ---------------------------------------------------------------------------
// Create Dialog
// ---------------------------------------------------------------------------

function CreateAgentflowDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const create = useAgentflowStore((s) => s.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [cron, setCron] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && agents.length > 0 && !agentId && agents[0]) {
      setAgentId(agents[0].id);
    }
  }, [open, agents, agentId]);

  const handleCreate = async () => {
    if (!title.trim() || !agentId) return;
    setCreating(true);
    try {
      const data: CreateAgentflowRequest = {
        title: title.trim(),
        description: description.trim(),
        agent_id: agentId,
        triggers: cron.trim()
          ? [
              {
                kind: "schedule",
                config: { cron: cron.trim(), timezone },
                enabled: true,
              },
            ]
          : [],
      };
      await create(data);
      toast.success("Agentflow created");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setCron("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create agentflow");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Agentflow</DialogTitle>
          <DialogDescription>
            Set up a scheduled task for an agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Daily SSL check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Prompt</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Describe what the agent should do..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Agent</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cron Schedule</Label>
              <Input
                placeholder="0 10 * * *"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                placeholder="UTC"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave cron empty to create without a schedule (manual trigger only).
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim() || !agentId}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function AgentflowDetail({ agentflow }: { agentflow: Agentflow }) {
  const agents = useWorkspaceStore((s) => s.agents);
  const { triggers, runs, runsLoading, fetchTriggers, fetchRuns, triggerRun, update, remove } =
    useAgentflowStore();
  const [tab, setTab] = useState<"runs" | "triggers" | "settings">("runs");

  const agent = agents.find((a) => a.id === agentflow.agent_id);

  useEffect(() => {
    fetchTriggers(agentflow.id);
    fetchRuns(agentflow.id);
  }, [agentflow.id, fetchTriggers, fetchRuns]);

  const handleToggleStatus = async () => {
    const newStatus = agentflow.status === "active" ? "paused" : "active";
    try {
      await update(agentflow.id, { status: newStatus });
      toast.success(newStatus === "active" ? "Agentflow activated" : "Agentflow paused");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleRunNow = async () => {
    try {
      await triggerRun(agentflow.id);
      toast.success("Run triggered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger run");
    }
  };

  const handleDelete = async () => {
    try {
      await remove(agentflow.id);
      toast.success("Agentflow deleted");
    } catch {
      toast.error("Failed to delete agentflow");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{agentflow.title}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  agentflow.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {agentflow.status === "active" ? "Active" : "Paused"}
              </span>
              {agent && <span>Agent: {agent.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRunNow}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Run Now
            </Button>
            <Button size="sm" variant="outline" onClick={handleToggleStatus}>
              {agentflow.status === "active" ? (
                <Pause className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              {agentflow.status === "active" ? "Pause" : "Activate"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6">
        <div className="flex gap-4">
          {(["runs", "triggers", "settings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "runs" && <RunsTab runs={runs} loading={runsLoading} />}
        {tab === "triggers" && <TriggersTab triggers={triggers} />}
        {tab === "settings" && <SettingsTab agentflow={agentflow} />}
      </div>
    </div>
  );
}

function RunsTab({ runs, loading }: { runs: AgentflowRun[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No runs yet. Click &quot;Run Now&quot; to trigger one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const cfg = runStatusConfig[run.status] ?? runStatusConfig.pending!;
        const Icon = cfg!.icon;
        const color = cfg!.color;
        const label = cfg!.label;
        return (
          <div
            key={run.id}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon
                className={`h-4 w-4 ${color} ${run.status === "running" ? "animate-spin" : ""}`}
              />
              <div>
                <span className="text-sm font-medium">{label}</span>
                <p className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {run.completed_at && (
                <span>
                  Completed {new Date(run.completed_at).toLocaleString()}
                </span>
              )}
              {run.error && (
                <span className="text-destructive">{run.error}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TriggersTab({ triggers }: { triggers: AgentflowTrigger[] }) {
  if (triggers.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No triggers configured. This agentflow can only be triggered manually.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {triggers.map((trigger) => {
        const config = trigger.config as { cron?: string; timezone?: string };
        return (
          <div
            key={trigger.id}
            className="flex items-center justify-between rounded-lg border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium capitalize">{trigger.kind}</span>
                {config.cron && (
                  <p className="text-xs text-muted-foreground">
                    <code>{config.cron}</code>
                    {config.timezone && ` (${config.timezone})`}
                  </p>
                )}
              </div>
            </div>
            <span
              className={`text-xs ${trigger.enabled ? "text-success" : "text-muted-foreground"}`}
            >
              {trigger.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab({ agentflow }: { agentflow: Agentflow }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Prompt</Label>
        <p className="mt-1 whitespace-pre-wrap text-sm">
          {agentflow.description || "(empty)"}
        </p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Concurrency Policy</Label>
        <p className="mt-1 text-sm">{agentflow.concurrency_policy}</p>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Created</Label>
        <p className="mt-1 text-sm">{new Date(agentflow.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AgentflowsPage() {
  const { agentflows, loading, fetch, selectedId, setSelectedId } = useAgentflowStore();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const selected = agentflows.find((af) => af.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Agentflows</h1>
          <p className="text-sm text-muted-foreground">
            Scheduled and automated agent tasks
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Agentflow
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : agentflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
              <Zap className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p>No agentflows yet</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setCreateOpen(true)}
              >
                Create one
              </Button>
            </div>
          ) : (
            <div className="py-1">
              {agentflows.map((af) => (
                <button
                  key={af.id}
                  onClick={() => setSelectedId(af.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                    selectedId === af.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{af.title}</span>
                    <span
                      className={`ml-2 h-2 w-2 flex-shrink-0 rounded-full ${
                        af.status === "active" ? "bg-success" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {af.description || "No description"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-hidden">
          {selected ? (
            <AgentflowDetail agentflow={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select an agentflow to view details
            </div>
          )}
        </div>
      </div>

      <CreateAgentflowDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
