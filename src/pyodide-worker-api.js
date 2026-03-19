import { v4 as uuidv4 } from 'uuid';

// const EXECUTION_TIME_LIMIT = 300000;
const EXECUTION_TIME_LIMIT = 3000;

export default class PyodideWorkerApi {

    constructor(options = {}) {

        this.workers = [];
        this.queue = [];
        this.jobs = {};

        this.maxWorkers = navigator.hardwareConcurrency ?? 4;
        this.minWorkers = this.maxWorkers < 4 ? this.maxWorkers : 4;

        this.workerOptions = options;

        for (let i = 0; i < this.minWorkers; i++) {

            console.log(`Creating worker ${i}`);
            this.createWorker();

        }

    }

    createWorker() {

        console.log('Creating a worker');

        const worker = new PyodideWorker(this.workerOptions);

        this.workers.push(worker);

        return worker;

    }

    getAvailableWorker() {

        console.log('Getting an available worker');

        for (const worker of this.workers) {

            if (worker.isAvailable) {
                console.log('Found an available worker');
                return worker;
            }

        }

        if (this.workers.length < this.maxWorkers) {
            console.log('All workers are busy. Creating a new worker.');
            return this.createWorker();
        }

        console.log('Max workers have been created. No workers available');
        return null;

    }

    createJob(script, context) {

        const id = uuidv4();

        console.log(`Creating a job ${id}`)

        const { promise, resolve, reject } = getPromiseResolveReject();

        const job = {
            script,
            context,
            worker: null,
            promise,
            resolve,
            reject,
            timeoutFunctionId: null,
            execute: function () {

                this.timeoutFunctionId = setTimeout(() => {

                    const executionTimeLimitInMinutes = EXECUTION_TIME_LIMIT / 60 / 1000;
                    const message = `Time limit of ${executionTimeLimitInMinutes} minute(s) exceeded`;

                    this.worker.interruptPythonExecution(message);


                }, EXECUTION_TIME_LIMIT);

                return this.worker.executePython(this.script, this.context, this.promise, this.resolve, this.reject);


            },
            interrupt: function () {

                this.worker.interruptPythonExecution(`Execution interrupted`);

            },
            getResult: function () {

                return this.promise;

            }
        };

        this.jobs[id] = job;

        return id;

    }

    addJobToQueue(jobId) {

        console.log(`Adding a job ${jobId} to queue`);

        this.queue.push(jobId);

    }

    allocateWorkerToJob(jobId, worker) {

        console.log(`Allocating a worker to job ${jobId}`);

        const job = this.getJob(jobId);
        job.worker = worker;
        worker.setUnavailable();
        worker.setExecutionId(uuidv4());

    }

    releaseWorkerFromJob(jobId, worker) {

        console.log(`Releasing a worker from job ${jobId}`);

        const job = this.getJob(jobId);
        job.worker = null;
        worker.setAvailable();

    }

    getJob(jobId) {

        return this.jobs[jobId];

    }

    removeJob(jobId) {

        this.queue = this.queue.filter((id) => id !== jobId);
        console.log(`Removed job ${jobId} from the queue`);

        delete this.jobs[jobId];
        console.log(`Deleted job ${jobId}`);

    }

    executePython(script, context, options = {}) {

        console.log(`Executing Python code`)

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

        this.boundListener = this.messageListener.bind(this);
        this.instance.addEventListener('message', this.boundListener);

        this.stdoutFunction = options.stdoutFunction;
        this.stderrFunction = options.stderrFunction;
        this.stdinFunction = options.stdinFunction;

        this.currentExecution = {
            promise: null,
            resolve: null,
            reject: null,
            interruptBuffer: new Uint8Array(new SharedArrayBuffer(1))
        }

    }

    reset() {

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

    setExecutionId(executionId) {

        this.executionId = executionId;

    }

    executePython(script, context, promise, resolve, reject) {

        if (this.currentExecution.promise !== null) {
            throw new Error(`Cannot call the "executePython" function second time if the first execution is still in progress`);
        }

        this.currentExecution.promise = promise;
        this.currentExecution.resolve = resolve;
        this.currentExecution.reject = reject;
        this.currentExecution.interruptBuffer[0] = 0;

        this.instance.postMessage({ command: 'setInterruptBuffer', interruptBuffer: this.currentExecution.interruptBuffer, executionId: this.executionId });
        this.instance.postMessage({ command: 'runCode', context, python: script, executionId: this.executionId });

        return promise;

    }

    interruptPythonExecution(message) {

        console.log('INTERRUPTING')

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
        if (!this.currentExecution.resolve) {
            console.warn(`Resolve is not defined`)
            return;
        }

        if (this.executionId !== event.data.id) {
            console.warn(`Received a message from pyodide worker for the wrong executionId`);
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