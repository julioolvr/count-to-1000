var WebSocket = require('ws'),
    apiToken = "", //Api Token from https://api.slack.com/web (Authentication section)
    authUrl = "https://slack.com/api/rtm.start?token=" + apiToken,
    request = require("request"),
    userId = 'U0375BYGC', // Id for the user the bot is posting as
    channelId = 'G069T2UV9'; // Id of the channel the bot is posting to

request(authUrl, function(err, response, body) {
  if (!err && response.statusCode === 200) {
    var res = JSON.parse(body);
    if (res.ok) {
      connectWebSocket(res.url);
    }
  }
});

function connectWebSocket(url) {
  var ws = new WebSocket(url);

  ws.on('open', function() {
      console.log('Connected');
  });

  ws.on('message', function(message) {
      console.log('received:', message);
      message = JSON.parse(message);

      if (message.channel === channelId && message.type === 'message' && message.user !== userId && message.text.match(/^\d+$/)) {
          var number = Number(message.text);

          if (number) {
              var next = number + 1;
              console.log('received number:', number, 'sending:', next);
              ws.send(JSON.stringify({ channel: channelId, id: 1, text: String(next), type: "message" }));
          }
      }
  });
}
