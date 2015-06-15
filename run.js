var WebSocket = require('ws'),
    url = 'wss://', // Slack RTM endpoint
    ws = new WebSocket(url),
    userId = 'U0375BYGC', // Id for the user the bot is posting as
    channelId = 'G069T2UV9'; // Id of the channel the bot is posting to

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
