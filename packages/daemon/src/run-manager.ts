import { ChildProcess } from 'child_process';
import { RunControlSignal, RunControlState } from '@stepforge/sdk';

type RunControl = {
    runId: string;
    workflowId: string;
    childProcess: ChildProcess;
    signal: RunControlSignal | null;
    state: RunControlState;
};

export class RunManager {
    private activeRuns: Map<string, RunControl> = new Map();

    registerRun(runId: string, workflowId: string, childProcess: ChildProcess): void {
        this.activeRuns.set(runId, {
            runId,
            workflowId,
            childProcess,
            signal: null,
            state: {
                signal: null,
                failedSteps: []
            }
        });
        console.log(`Registered run: ${runId}`);
    }

    unregisterRun(runId: string): void {
        this.activeRuns.delete(runId);
        console.log(`Unregistered run: ${runId}`);
    }

    pauseRun(runId: string): boolean {
        const run = this.activeRuns.get(runId);
        if (!run) return false;

        run.signal = 'pause';
        run.state.signal = 'pause';

        // Send signal to child process via stdin
        try {
            run.childProcess.stdin?.write(JSON.stringify({ type: 'control', signal: 'pause' }) + '\n');
            console.log(`Paused run: ${runId}`);
            return true;
        } catch (e) {
            console.error(`Failed to pause run ${runId}:`, e);
            return false;
        }
    }

    resumeRun(runId: string): boolean {
        const run = this.activeRuns.get(runId);
        if (!run) return false;

        run.signal = 'resume';
        run.state.signal = 'resume';

        // Send signal to child process via stdin
        try {
            run.childProcess.stdin?.write(JSON.stringify({ type: 'control', signal: 'resume' }) + '\n');
            console.log(`Resumed run: ${runId}`);
            return true;
        } catch (e) {
            console.error(`Failed to resume run ${runId}:`, e);
            return false;
        }
    }

    cancelRun(runId: string): boolean {
        const run = this.activeRuns.get(runId);
        if (!run) return false;

        run.signal = 'cancel';
        run.state.signal = 'cancel';

        // Send signal to child process via stdin
        try {
            run.childProcess.stdin?.write(JSON.stringify({ type: 'control', signal: 'cancel' }) + '\n');
            console.log(`Cancelled run: ${runId}`);
            return true;
        } catch (e) {
            console.error(`Failed to cancel run ${runId}:`, e);
            return false;
        }
    }

    getRunState(runId: string): RunControlState | null {
        const run = this.activeRuns.get(runId);
        return run ? run.state : null;
    }

    updateRunState(runId: string, state: Partial<RunControlState>): void {
        const run = this.activeRuns.get(runId);
        if (run) {
            run.state = { ...run.state, ...state };
        }
    }

    getAllActiveRuns(): Array<{ runId: string; workflowId: string; state: RunControlState }> {
        return Array.from(this.activeRuns.values()).map(run => ({
            runId: run.runId,
            workflowId: run.workflowId,
            state: run.state
        }));
    }

    isRunActive(runId: string): boolean {
        return this.activeRuns.has(runId);
    }
}

// Singleton instance
export const runManager = new RunManager();
