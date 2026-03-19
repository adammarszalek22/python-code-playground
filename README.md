# Python Code Playground

A website that allows users to execute Python code in a web browser.

The idea for this has come from the coding challenges website - https://codingchallenges.substack.com/p/coding-challenge-108-online-coding.

As of right now, this locally hosted website allows you to exeute basic Python code in the browser. You simply write your Python code and click 'Run' and it will execute it and print the outputs to the terminal. The `input()` functionality is not yet implemented.

# Table of contents

- [Documentation and Learning Materials](#documentation-and-learning-materials)

## Documentation and Learning Materials

Here I am listing the resources that I learnt from to be able to build this application.

- https://codingchallenges.substack.com/p/coding-challenge-108-online-coding for step by step challenges
- https://pyodide.org/ for executing Python code in the browser and making it communicate with JavaScript
- https://github.com/microsoft/monaco-editor (specifically https://github.com/microsoft/monaco-editor/tree/main/samples) to understand how to add the monaco editor to the website
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API, https://github.com/mdn/dom-examples/tree/main/web-workers/simple-web-worker and https://pyodide.org/en/stable/usage/webworker.html for learning about web workers