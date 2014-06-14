http = require('http')
faye = require('faye')
fs = require 'fs'
open = require 'open'

process.on 'uncaughtException', (err) ->
  console.warn "UNCAUGHT EXCEPTION", err

args = process.argv.slice(2)
fileName = args[0]

if not fs.existsSync(fileName)
  console.warn 'Second argument was not the name of a file in the current working directory!'
  process.exit(1)
  return

subscribePath = '/file-changes'

staticMap =
  '/faye.js':                  'faye/browser/faye-browser-min.js'
  '/runner.css':               '../build/runner.css'
  '/fontello.css':             '../vendor/fontello-846dd1e9/css/fontello.css'
  '/react-with-addons.js':     '../vendor/react-0.9.0/build/react-with-addons.js'
  '/JSXTransformer.js':        '../vendor/react-0.9.0/build/JSXTransformer.js'
  '/inspector-json.css':       '../vendor/inspector-json/inspector-json.css'
  '/inspector-json.js':        '../vendor/inspector-json/inspector-json.js'
  '/dependencies.js':          '../build/dependencies.js'
  '/jquery.js':                '../vendor/jquery-1.11.0.min.js'
  '/':                         '../runner/runner.html'

getMimeType = (path) ->
  mimes =
    'js': 'text/javascript',
    'css': 'text/css'
  ending = path.match(/(?!\.)([a-z]+)$/)[1]
  mimes[ending]

onNonFayeResponse = (request, response) ->
  unresolvedPath = staticMap[request.url]
  if unresolvedPath
    filePath = require.resolve unresolvedPath
    stat = fs.statSync filePath
    response.writeHead 200,
      'Content-Type':  getMimeType filePath
      'Content-Length': stat.size
    readStream = fs.createReadStream filePath
    readStream.pipe(response);
  else
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('Hello, non-Bayeux request');

server = http.createServer onNonFayeResponse
bayeux = new faye.NodeAdapter
  mount: subscribePath
  timeout: 45

bayeux.attach server
server.listen 8000

publish = (payload) -> bayeux.getClient().publish(subscribePath, payload)

doPush = ->
  fs.readFile fileName, {encoding:'utf-8'}, (err, data) ->
    throw err unless data
    publish data

opts =
  interval: 50
  persistent: true
fs.watchFile fileName, opts, doPush

bayeux.on 'subscribe', doPush
console.log 'Server listening on port 8000'
open 'http://localhost:8000'
