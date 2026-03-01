import * as monaco from 'monaco-editor';

const codeEditor = document.getElementById("container");
const terminal = document.getElementById("terminal");
const runButton = document.getElementById('run');

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		if (label === 'json') {
			return './vs/language/json/json.worker.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return './vs/language/css/css.worker.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return './vs/language/html/html.worker.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './vs/language/typescript/ts.worker.js';
		}
		return './vs/editor/editor.worker.js';
	}
};

const editorInstance = monaco.editor.create(codeEditor, {
	value: ['def x():', '\tprint("Hello world!")', '', 'x()'].join('\n'),
	language: 'python'
});

terminal.value = "Initializing...\n";

runButton.addEventListener('click', evaluatePython);

async function main() {

    const pyodide = await loadPyodide();

    pyodide.setStdin(
        // AM 2026-02-22 - TODO, we need to implement requesting the input from the website's terminal. Hardcoding for now.
        // 'isatty' tells python know the stream is connected to some sort of interactive terminal (sys.stdin.isatty() in the Python script will return True).
        // We set this to true because we plan to allow the user to be able to use Python's 'input()' function so that they can write code that requests input from terminal
        new StdinHandler(["some string", "some other input", "some other longer input"], { isatty: true }),
    );

    pyodide.setStdout({ batched: (string) => addOutputToTerminal(string) })

    terminal.value = "Ready!\n";

    return pyodide;

}

let pyodideReadyPromise = main();

async function evaluatePython() {

    const pyodide = await pyodideReadyPromise;

    // addInputToTerminal();
    
    try {

        pyodide.runPython(editorInstance.getValue());
        // addOutputToTerminal(terminal);

    } catch (error) {

        addOutputToTerminal(error);

    }

}

// function addInputToTerminal() {

//     terminal.value += ">>>" + editorInstance.getValue() + "\n"

// }

function addOutputToTerminal(string) {

    terminal.value += ">>>" + string + "\n";

}

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