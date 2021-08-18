const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

require('dotenv').config();

const SingleSignOn = require('eve-sso').default;

// The callback URI as defined in the application in the developers section
const CALLBACK_URI = `http://localhost:${process.env.PORT}/`;

const sso = new SingleSignOn(process.env.CLIENT_ID, process.env.CLIENT_SECRET, CALLBACK_URI, {
  endpoint: 'https://login.eveonline.com', // optional, defaults to this
//   userAgent: 'my-user-agent' // optional
})

module.exports = {
    mode: 'development',
    entry: {
        index: './src/index.js'
    },
    devtool: 'inline-source-map',
    devServer: {
        port: process.env.PORT,
        contentBase: './dist',
        open: false,
        before: function(app) {
            let scopes = "esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-skills.read_skills.v1 esi-clones.read_clones.v1 esi-universe.read_structures.v1 esi-corporations.read_corporation_membership.v1 esi-assets.read_assets.v1 esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1 esi-ui.open_window.v1 esi-ui.write_waypoint.v1 esi-fittings.read_fittings.v1 esi-corporations.read_structures.v1 esi-characters.read_chat_channels.v1 esi-location.read_online.v1 esi-assets.read_corporation_assets.v1".split(' ');

            app.get("/login-url", function(req, res) {
                // TODO: generate and check state
                res.send(sso.getRedirectUrl('my-state', scopes));
            });

            app.get("/sso", async function(req, res) {
                const code = req.query.code
                // NOTE: usually you'd want to validate the state (ctx.query.state) as well
              
                // Swap the one-time code for an access token
                const info = await sso.getAccessToken(code)
              
                // Usually you'd want to store the access token
                // as well as the refresh token
                console.log('info', info)
                
                // Do whatever, for example, redirect to user page
                res.json(info);
            });
          },
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Development',
            hash: true,
            myPageHeader: 'EVE Test Project',
            template: './src/index.html',
            inject: 'body'
        }),
        new NodePolyfillPlugin(),
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        fallback: {
            // "tls": require.resolve('tls'),
            // "net": require.resolve('net'),
            "tls": false,
            "net": false
            // "crypto-browserify": require.resolve('crypto-browserify'), //if you want to use this module also don't forget npm i crypto-browserify 
            // setImmediate: require.resolve('setimmediate'),
            // "async": false
        }
    }
};