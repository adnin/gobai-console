export type SystemStatusCheck = {
  ok: boolean;
};

export type SystemStatusResponse = {
  ok: boolean;
  time: string;
  app: {
    name?: string;
    env?: string;
    debug?: boolean;
    version?: string;
    commit?: string;
  };
  runtime: {
    php?: string;
    laravel?: string;
  };
  checks: Record<string, SystemStatusCheck>;
  queue: {
    connection?: string;
    failed_jobs: number | null;
  };
  metrics: {
    orders_by_status: Record<string, number>;
    dispatch_attempts_by_status: Record<string, number>;
  };
};

export type AdminKpiRange = "today" | "7d" | "30d";
