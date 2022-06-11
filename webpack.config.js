const path = require('path');
module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    output: {
    	path: path.resolve(__dirname, 'dist'),
			filename: 'bundle.js',
			libraryTarget: 'var',
			library: 'Sesame'
		},
    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                include: path.resolve(__dirname, 'src'),
                use: 'ts-loader',
            },
            {
                test: /\.js$/i,
                include: path.resolve(__dirname, 'src'),
                use: {
                    loader: 'babel-loader', options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.css$/i,
                include: path.resolve(__dirname, 'src'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },],
    },
    devServer: {
        static: 'dist',
    },
};
