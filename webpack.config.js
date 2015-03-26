module.exports = {
    entry: './lib/app.js',
    output: {
        filename: 'bundle.js',
        path: './lib'
    },
    module: {
        loaders:[
            {tests: /\.js$/, loaders: ['jsx?harmony']}
        ]
    }
};