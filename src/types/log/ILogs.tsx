import type { ApiLogLevel } from './LogIcon';

export type LogGroup = {
    date: string;
    levels: ILogLevelGroup[];
    levelCounts: Record<ApiLogLevel, number>;
};

export type ILogLevelGroup = {
    level: string;
    logs: Log[];
};

export type Log = {
    timestamp: string;
    level: string;
    fullLevel: string;
    message: string;
};
