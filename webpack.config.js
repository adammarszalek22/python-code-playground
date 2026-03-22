import path from "path";
import { fileURLToPath } from "url";

import webpack from 'webpack';
import HtmlWebpackPlugin from "html-webpack-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
	mode: 'development',
	entry: [
		"webpack-hot-middleware/client?reload=true",
		"./src/index.js"
	],
	output: {
		globalObject: 'self',
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: "/"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
				type: "asset/resource",
			},
		]
	},
	plugins: [
		new MonacoWebpackPlugin({
			languages: ['python', 'javascript', 'css', 'html', 'json'],
		}),
		new HtmlWebpackPlugin({
			template: './src/index.html'
		}),
		// new CopyPlugin({
		// 	patterns: [
		// 		// { from: './src/styles.css', to: 'styles.css' },
		// 		// { from: './public', to: "" }
		// 	]
		// }),
		new webpack.HotModuleReplacementPlugin()
	]
};
