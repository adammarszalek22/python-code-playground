import { v4 as uuidv4 } from 'uuid';

const EXECUTION_TIME_LIMIT = 300000;

export default class PyodideWorkerApi {

    constructor(options = {}) {

        this.workers = [];
        this.queue = [];
        this.jobs = {};

        this.maxWorkers = navigator.hardwareConcurrency ?? 4;
        this.minWorkers = this.maxWorkers < 4 ? this.maxWorkers : 4;

        this.workerOptions = options;

        for (let i = 0; i < this.minWorkers; i++) {

            this.createWorker();

        }

    }

    createWorker() {

        const worker = new PyodideWorker(this.workerOptions);

        this.workers.push(worker);

        return worker;

    }

    getAvailableWorker() {

        for (const worker of this.workers) {

            if (worker.isAvailable) {
                return worker;
            }

        }

        if (this.workers.length < this.maxWorkers) {
            return this.createWorker();
        }

        return null;

    }

    createJob(script, context) {

        const id = uuidv4();

        const { promise: initialisationPromise, resolve: initialisationResolve } = getPromiseResolveReject();
        const { promise: executionPromise, resolve: executionResolve, reject: executionReject } = getPromiseResolveReject();

        const job = {
            script,
            context,
            worker: null,
            timeoutFunctionId: null,
            execute: async function () {

                await this.worker.initialise(initialisationPromise, initialisationResolve, executionPromise, executionResolve, executionReject);

                this.timeoutFunctionId = setTimeout(() => {

                    const executionTimeLimitInMinutes = EXECUTION_TIME_LIMIT / 60 / 1000;
                    const message = `Time limit of ${executionTimeLimitInMinutes} minute(s) exceeded`;

                    this.worker.interruptPythonExecution(message);


                }, EXECUTION_TIME_LIMIT);

                return this.worker.executePython(this.script, this.context);


            },
            interrupt: function () {

                this.worker.interruptPythonExecution(`Execution interrupted`);

            },
            getResult: function () {

                return this.worker.currentExecution.promise;

            }
        };

        this.jobs[id] = job;

        return id;

    }

    addJobToQueue(jobId) {

        this.queue.push(jobId);

    }

    allocateWorkerToJob(jobId, worker) {

        const job = this.getJob(jobId);
        job.worker = worker;
        worker.setUnavailable();
        worker.setExecutionId(uuidv4());

    }

    releaseWorkerFromJob(jobId, worker) {

        const job = this.getJob(jobId);
        job.worker = null;
        worker.setAvailable();

    }

    getJob(jobId) {

        return this.jobs[jobId];

    }

    removeJob(jobId) {

        this.queue = this.queue.filter((id) => id !== jobId);

        delete this.jobs[jobId];

    }

    async executePython(script, context, options = {}) {

        const worker = this.getAvailableWorker();

        const jobId = options.jobId ?? this.createJob(script, context);
        const job = this.getJob(jobId);

        if (worker == null) {

            this.addJobToQueue(jobId);
            return job;

        }

        this.allocateWorkerToJob(jobId, worker);

        job
            .execute()
            .finally(() => {

                clearTimeout(job.timeoutFunctionId);
                worker.reset();

                this.releaseWorkerFromJob(jobId, worker);
                this.removeJob(jobId);
                this.triggerNextJob();

            })

        return job;

    }

    triggerNextJob() {

        const jobId = this.queue.shift();;

        if (jobId) {
            
            this.executePython(null, null, { jobId });

        }

    }

}

class PyodideWorker {

    constructor(options = {}) {

        this.executionId = null;
        this.isAvailable = true;
        this.instance = new Worker('/pyodide/pyodide.worker.js');

        this.instance.addEventListener('message', this.messageListener.bind(this));

        this.stdoutFunction = options.stdoutFunction;
        this.stderrFunction = options.stderrFunction;
        this.stdinFunction = options.stdinFunction;

        this.currentExecution = {
            initialisationPromise: null,
            initialisationResolve: null,
            promise: null,
            resolve: null,
            reject: null,
            interruptBuffer: new Uint8Array(new SharedArrayBuffer(1))
        }

    }

    reset() {

        this.currentExecution.initialisationPromise = null;
        this.currentExecution.initialisationResolve = null;
        this.currentExecution.promise = null;
        this.currentExecution.resolve = null;
        this.currentExecution.reject = null;
        this.currentExecution.interruptBuffer[0] = 0;
        this.executionId = null;

    }

    setAvailable() {

        this.isAvailable = true;

    }

    setUnavailable() {

        this.isAvailable = false;

    }

    async initialise(initialisationPromise, initialisationResolve, executionPromise, executionResolve, executionReject) {

        this.currentExecution.initialisationPromise = initialisationPromise;
        this.currentExecution.initialisationResolve = initialisationResolve;
        this.currentExecution.promise = executionPromise;
        this.currentExecution.resolve = executionResolve;
        this.currentExecution.reject = executionReject;
        this.currentExecution.interruptBuffer[0] = 0;

        this.instance.postMessage({ command: 'initialise', executionId: this.executionId });

        return this.currentExecution.initialisationPromise;

    }

    setExecutionId(executionId) {

        this.executionId = executionId;

    }

    executePython(script, context) {

        this.instance.postMessage({ command: 'setInterruptBuffer', interruptBuffer: this.currentExecution.interruptBuffer, executionId: this.executionId });
        this.instance.postMessage({ command: 'runCode', context, python: script, executionId: this.executionId });

        return this.currentExecution.promise;

    }

    interruptPythonExecution(message) {

        // 2 stands for SIGINT
        this.currentExecution.interruptBuffer[0] = 2;

        // AM 2026-03-16 - Assigning reject function to a separate variable because reset() sets it to null
        const reject = this.currentExecution.reject;

        this.currentExecution.resolve = null;
        this.currentExecution.reject = null;

        reject(message);

    }

    messageListener(event) {

        // AM 2026-03-19 - Just in case we receive any messages from the worker after interrupting the execution (the interrupt does not happen instantaneously)
        if (!this.currentExecution.promise) {
            return;
        }

        if (this.executionId !== event.data.id) {
            return;
        }

        if (event.data.initialised) {
            
            this.currentExecution.initialisationResolve();
            return;

        }

        if (event.data.stdout) {

            if (this.stdoutFunction) {
                this.stdoutFunction(event.data.stdout);
            } else {
                console.log(event.data.stdout)
            }

            return;

        }

        if (event.data.stderr) {

            if (this.stderrFunction) {
                this.stderrFunction(event.data.stderr);
            } else {
                console.error(event.data.stderr)
            }

            return;

        }

        const { id, ...rest } = event.data;

        const resolve = this.currentExecution.resolve;

        resolve(rest);

    }

}

function getPromiseResolveReject() {

    let resolve;
    let reject;

    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };

}