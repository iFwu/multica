"use client";

import { create } from "zustand";
import { api } from "@/shared/api";
import type {
  Agentflow,
  AgentflowTrigger,
  AgentflowRun,
  CreateAgentflowRequest,
  UpdateAgentflowRequest,
} from "@/shared/types";

interface AgentflowStore {
  agentflows: Agentflow[];
  loading: boolean;
  selectedId: string | null;

  fetch: () => Promise<void>;
  create: (data: CreateAgentflowRequest) => Promise<Agentflow>;
  update: (id: string, data: UpdateAgentflowRequest) => Promise<Agentflow>;
  remove: (id: string) => Promise<void>;
  triggerRun: (id: string) => Promise<AgentflowRun>;
  setSelectedId: (id: string | null) => void;

  // Detail data (loaded on demand)
  triggers: AgentflowTrigger[];
  runs: AgentflowRun[];
  runsLoading: boolean;
  fetchTriggers: (agentflowId: string) => Promise<void>;
  fetchRuns: (agentflowId: string) => Promise<void>;
}

export const useAgentflowStore = create<AgentflowStore>((set, get) => ({
  agentflows: [],
  loading: false,
  selectedId: null,
  triggers: [],
  runs: [],
  runsLoading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const agentflows = await api.listAgentflows();
      set({ agentflows });
    } finally {
      set({ loading: false });
    }
  },

  create: async (data) => {
    const agentflow = await api.createAgentflow(data);
    set((s) => ({ agentflows: [agentflow, ...s.agentflows] }));
    return agentflow;
  },

  update: async (id, data) => {
    const agentflow = await api.updateAgentflow(id, data);
    set((s) => ({
      agentflows: s.agentflows.map((af) => (af.id === id ? agentflow : af)),
    }));
    return agentflow;
  },

  remove: async (id) => {
    await api.deleteAgentflow(id);
    set((s) => ({
      agentflows: s.agentflows.filter((af) => af.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  triggerRun: async (id) => {
    const run = await api.triggerAgentflowRun(id);
    set((s) => ({ runs: [run, ...s.runs] }));
    return run;
  },

  setSelectedId: (id) => set({ selectedId: id }),

  fetchTriggers: async (agentflowId) => {
    const triggers = await api.listAgentflowTriggers(agentflowId);
    set({ triggers });
  },

  fetchRuns: async (agentflowId) => {
    set({ runsLoading: true });
    try {
      const runs = await api.listAgentflowRuns(agentflowId);
      set({ runs });
    } finally {
      set({ runsLoading: false });
    }
  },
}));
