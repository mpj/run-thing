http = require('http')
faye = require('faye')
fs = require 'fs'

process.on 'uncaughtException', (err) ->
  console.warn "UNCAUGHT EXCEPTION", err

args = process.argv.slice(2)
fileName = args[0]

if not fs.existsSync(fileName)
  console.warn 'Second argument was not the name of a file in the current working directory!'
  process.exit(1)
  return

subscribePath = '/file-changes'

onNonFayeResponse = (request, response) ->
  if request.url is '/faye.js'
    filePath = require.resolve 'faye/browser/faye-browser-min.js'
    stat = fs.statSync filePath
    response.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Content-Length': stat.size
    });
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
