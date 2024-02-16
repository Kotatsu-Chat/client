const { randomBytes } = require('crypto');
var http = require('https');
var querystring = require('querystring');

module.exports = {
  sendRequest: async function(sendback, url, type, endpoint, parameters, body = null, bodytype = 'json', auth = null) {
    // bodytype is either json or query
    var query = querystring.stringify(parameters)
    var fbody = bodytype == 'query' ? querystring.stringify(body) : JSON.stringify(body)
    var options = {
      host: url,
      protocol: "https:",
      port: 443,
      path: endpoint+'?'+query,
      method: type,
      headers: {}
    };
    if (auth)  {options.headers['Authorization'] = auth == null ? null : `Bearer ${auth}`}
    if (fbody) {options.headers['Content-Type'] = bodytype == 'query' ? 'application/x-www-form-urlencoded' : 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(fbody)}

    // Set up the request
    var id = randomBytes(8).toString()
    var req = http.request(options, function(res) {
      var status = res.statusCode
      var data = [];
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data.push(chunk);
      });
      res.on('error', function (error) {
        sendback.send(id, {'id': id, 'error': error, 'status': null, 'response': null});
      });
      res.on('end', function () {
        sendback.send(id, {'id': id, 'error': null, 'status': status, 'response': data.join('')});
      });
    });
  
    // post the data
    if (fbody != null) {
      req.write(fbody);
    }
    req.end();
    return id
  }
};