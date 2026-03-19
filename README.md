# Python Code Playground

A website that allows users to execute Python code in a web browser.

The idea for this has come from the coding challenges website - https://codingchallenges.substack.com/p/coding-challenge-108-online-coding.

As of right now, this locally hosted website allows you to execute basic Python code in the browser. You simply write your Python code and click 'Run' and it will execute it and print the outputs to the terminal. The `input()` functionality is not yet implemented.

There is currently a timeout of 5 min, meaning the code will stop executing. I plan on extending this timeout if a user is constantly interacting with the terminal (once the input() functionality is in place).

There are also options to save, retrieve and delete code snippets but the user experience isn't great there. Not focusing on that because I plan to create a proper workspace where a user can have multiple folders/files saved and can import other files.

# Table of contents

- [How to Run](#how-to-run)
- [Documentation and Learning Materials](#documentation-and-learning-materials)

<a name="how-to-run"></a>
## How to Run

- make sure you have Node v22.0.0 or higher
- run `npm install`
- add `.env` and copy over the content from `.env.example`
- when using for the first time, run `npm run build`
- run `node server.js`
- open `http://localhost:3000/` in your browser

<a name="documentation-and-learning-materials"></a>
## Documentation and Learning Materials

Here I am listing the resources that I learnt from to be able to build this application.

- https://codingchallenges.substack.com/p/coding-challenge-108-online-coding for step by step challenges
- https://pyodide.org/ for executing Python code in the browser and making it communicate with JavaScript.
- https://github.com/microsoft/monaco-editor (specifically https://github.com/microsoft/monaco-editor/tree/main/samples) to understand how to add the monaco editor to the website
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API, https://github.com/mdn/dom-examples/tree/main/web-workers/simple-web-worker and https://pyodide.org/en/stable/usage/webworker.html for learning about web workers