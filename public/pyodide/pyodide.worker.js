importScripts('/pyodide/pyodide.js');

const pyodideReadyPromise = loadPyodide({ indexURL: '/pyodide/' });

let id = null;

self.onmessage = async (event) => {

    const { executionId, python, context, command, interruptBuffer } = event.data;

    id = executionId;

    const pyodide = await pyodideReadyPromise;

    if (command === 'initialise') {

        self.postMessage({ initialised: true, id });
        return;

    }

    if (command === "setInterruptBuffer") {

        pyodide.setInterruptBuffer(interruptBuffer);
        return;

    }

    if (command === "runCode") {

        pyodide.setStdin(
            // AM 2026-02-22 - TODO, we need to implement requesting the input from the website's terminal. Hardcoding for now.
            // 'isatty' tells python know the stream is connected to some sort of interactive terminal (sys.stdin.isatty() in the Python script will return True).
            // We set this to true because we plan to allow the user to be able to use Python's 'input()' function so that they can write code that requests input from terminal
            new StdinHandler(['some string', 'some other input', 'some other longer input'], { isatty: true }),
        );

        pyodide.setStdout({ batched: (string) => self.postMessage({ stdout: string, id }) });
        pyodide.setStderr({ batched: (string) => self.postMessage({ stderr: string, id }) });

        await pyodide.loadPackagesFromImports(python);

        const dict = pyodide.globals.get("dict");
        const globals = dict(Object.entries(context));

        try {

            const result = await pyodide.runPythonAsync(python, { globals });
            self.postMessage({ result, id });

        } catch (error) {

            self.postMessage({ error: error.message, id });

        }
        
    }

};

/**
 * Just a quick workaround to feed predefined inputs to Python's stdin
 */
class StdinHandler {

    constructor(results, options) {

        this.results = results;
        this.idx = 0;
        Object.assign(this, options);

    }

    stdin() {

        return this.results[this.idx++];

    }

}