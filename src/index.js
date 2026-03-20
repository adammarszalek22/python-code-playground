import * as monaco from 'monaco-editor';

import PyodideWorkerApi from './pyodide-worker-api.js';

import './styles.css';

// Code Editor
const executeCodeButton = document.getElementById('execute-code');
const openSaveSnippetButton = document.getElementById('open-save-snippet');
const saveSnippetPopup = document.getElementById('save-snippet-pop-up');
const codeSnippetName = document.getElementById('code-snippet-name');
const closeSaveSnippetButton = document.getElementById('close-save-snippet');
const saveSnippetButton = document.getElementById('save-snippet');
const retrieveSnippetInput = document.getElementById('retrieve-snippet');
const removeSnippetInput = document.getElementById('remove-snippet');
const savedSnippetsDatalist = document.getElementById('saved-snippets');
const loader = document.getElementById('loader');
const monacoCodeEditor = document.getElementById('container');

// Terminal
const stopTerminalButton = document.getElementById('stop-terminal');
const terminal = document.getElementById('terminal');

const pyodideWorkerApi = new PyodideWorkerApi({ stdoutFunction: addOutputToTerminal, stderrFunction: addOutputToTerminal });

let job = null;

const editorInstance = monaco.editor.create(monacoCodeEditor, {
    value: 'print("Hello world!")',
    language: 'python'
});

for (const key of Object.keys(localStorage)) {

    const regex = /code-snippet-(.+)/;

    const match = regex.exec(key);

    if (match) {

        const name = match.at(1);
        addToDatalist(name);

    }

}

executeCodeButton.addEventListener('click', async function() {

    main(editorInstance.getValue(), {});

});

saveSnippetButton.addEventListener('click', saveSnippet);
retrieveSnippetInput.addEventListener('change', retrieveSnippet);
removeSnippetInput.addEventListener('change', removeSnippet);

stopTerminalButton.addEventListener('click', stopExecution);

openSaveSnippetButton.addEventListener('click', showSaveSnippetPopup);
closeSaveSnippetButton.addEventListener('click', hideShowSnippetPopup);

async function main(script, context) {

    showLoader();

    await new Promise(requestAnimationFrame);

    try {

        job = await pyodideWorkerApi.executePython(script, context);
        await job.getResult();

    } catch (error) {

        console.log(error);

    } finally {

        hideLoader();

    }

}

function addToDatalist(name) {

    const option = document.createElement('option');
    option.value = name;
    savedSnippetsDatalist.appendChild(option);

}

function removeFromDatalist(name) {

    for (const option of savedSnippetsDatalist.children) {

        if (option.value === name) {
            option.remove();
        }

    }

}

function saveSnippet() {

    const name = codeSnippetName.value;

    if (!name) {
        return alert(`Please enter a snippet name`);
    }

    const key = `code-snippet-${name}`;

    const code = editorInstance.getValue();

    localStorage.setItem(key, code);

    addToDatalist(name);

    codeSnippetName.value = '';
    saveSnippetPopup.classList.remove('show');

}

function retrieveSnippet() {

    const name = this.value;

    const key = `code-snippet-${name}`;

    const code = localStorage.getItem(key);

    if (code) {
        editorInstance.setValue(code);
    }

}

function removeSnippet() {

    const name = this.value;

    const key = `code-snippet-${name}`;

    if (key) {

        localStorage.removeItem(key);
        removeFromDatalist(name);
        removeSnippetInput.value = '';

    }

}

function stopExecution() {
    job?.interrupt();
}

function addOutputToTerminal(string) {
    terminal.value += '>>>' + string + '\n';
}

function showLoader() {
    loader.classList.add('show');
}

function hideLoader() {
    loader.classList.remove('show');
}

function showSaveSnippetPopup() {
    saveSnippetPopup.classList.add('show');
}

function hideShowSnippetPopup() {
    saveSnippetPopup.classList.remove('show')
}