export interface Agentflow {
  id: string;
  workspace_id: string;
  agent_id: string;
  title: string;
  description: string;
  status: "active" | "paused";
  concurrency_policy: "allow" | "skip_if_active";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentflowTrigger {
  id: string;
  agentflow_id: string;
  kind: "schedule" | "webhook" | "api";
  config: Record<string, unknown>;
  enabled: boolean;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentflowRun {
  id: string;
  agentflow_id: string;
  trigger_id: string | null;
  agent_id: string;
  status: "pending" | "running" | "completed" | "failed";
  task_id: string | null;
  linked_issue_id: string | null;
  output: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateAgentflowRequest {
  title: string;
  description?: string;
  agent_id: string;
  concurrency_policy?: string;
  triggers?: {
    kind: string;
    config: Record<string, unknown>;
    enabled: boolean;
  }[];
}

export interface UpdateAgentflowRequest {
  title?: string;
  description?: string;
  status?: string;
  agent_id?: string;
  concurrency_policy?: string;
}

export interface CreateAgentflowTriggerRequest {
  kind: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface UpdateAgentflowTriggerRequest {
  config?: Record<string, unknown>;
  enabled?: boolean;
}
