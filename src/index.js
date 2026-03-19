import * as monaco from 'monaco-editor';

import PyodideWorkerApi from './pyodide-worker-api.js';

import './styles.css';

// Code Editor
const executeCodeButton = document.getElementById('execute-code');
const openSaveSnippetButton = document.getElementById('open-save-snippet-pop-up');
const saveSnippetPopup = document.getElementById('save-snippet-pop-up');
const codeSnippetName = document.getElementById('code-snippet-name');
const closeSaveSnippetButton = document.getElementById("close-save-snippet-pop-up");
const saveSnippetButton = document.getElementById('save-snippet');
const retrieveInput = document.getElementById("retrieve-snippet");
const removeInput = document.getElementById("remove-snippet");
const savedSnippetsDatalist = document.getElementById("saved-snippets");
const monacoCodeEditor = document.getElementById('container');

// Terminal
const stopTerminalButton = document.getElementById('stop-terminal');
const terminal = document.getElementById('terminal');

const pyodideWorkerApi = new PyodideWorkerApi({ stdoutFunction: addOutputToTerminal, stderrFunction: addOutputToTerminal });
// const pyodideWorker = pyodideWorkerApi.createWorker();

const editorInstance = monaco.editor.create(monacoCodeEditor, {
    value: 'print("Hello world!")',
    language: 'python'
});

const savedSnippets = new Map(); // name -> code

openSaveSnippetButton.addEventListener("click", () => saveSnippetPopup.classList.add("show"));
closeSaveSnippetButton.addEventListener("click", () => saveSnippetPopup.classList.remove("show"));

saveSnippetButton.addEventListener("click", () => {

    const name = codeSnippetName.value.trim();

    if (!name) return alert("Please enter a snippet name");

    const code = editorInstance.getValue();
    savedSnippets.set(name, code);
    updateDatalist();

    codeSnippetName.value = "";
    saveSnippetPopup.classList.remove("show");

});

retrieveInput.addEventListener("change", () => {

    const name = retrieveInput.value;

    if (savedSnippets.has(name)) {
        editorInstance.setValue(savedSnippets.get(name));
    }

});

removeInput.addEventListener("change", () => {

    const name = removeInput.value;

    if (savedSnippets.has(name)) {

        savedSnippets.delete(name);
        updateDatalist();
        removeInput.value = "";

    }

});

executeCodeButton.addEventListener('click', async function() {

    main(editorInstance.getValue(), {});

});

// saveSnippetButton.addEventListener('click', function () {

//     const name = codeSnippetName.value;

//     const code = editorInstance.getValue();

//     localStorage.setItem(name, code);

//     saveSnippetPopup.classList.remove('show');

// });

function addOutputToTerminal(string) {

    terminal.value += '>>>' + string + '\n';

}

function showLoader() {
    document.getElementById("editor-loader").classList.add("show");
}

function hideLoader() {
    document.getElementById("editor-loader").classList.remove("show");
}

let job = null;

async function main(script, context) {

    showLoader();

    stopTerminalButton.addEventListener('click', stopExecution);

    try {

        // await pyodideWorker.executePython(script, context);
        job = pyodideWorkerApi.executePython(script, context);
        await job.getResult();

    } catch (error) {

        console.error(error)

    }

    hideLoader();
    stopTerminalButton.removeEventListener('click', stopExecution);

    function stopExecution() {

        job.interrupt();
        hideLoader();

    }

}

function updateDatalist() {

    savedSnippetsDatalist.innerHTML = "";

    for (const name of savedSnippets.keys()) {

        const option = document.createElement("option");
        option.value = name;
        savedSnippetsDatalist.appendChild(option);

    }

}