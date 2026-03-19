
import express from 'express';
import webpack from 'webpack';
import config from './webpack.config.js';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';

const app = express();

app.use((req, res, next) => {

  res.set("Cross-Origin-Opener-Policy", "same-origin");
  res.set("Cross-Origin-Embedder-Policy", "require-corp");
  next();

});

if (process.env.NODE_ENV === "production") {

    app.use(express.static("dist"));

} else {
    
    const compiler = webpack(config);

    app.use(
        webpackDevMiddleware(compiler, {
            publicPath: config.output.publicPath || "/",
        })
    );

    app.use(webpackHotMiddleware(compiler));

}

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})