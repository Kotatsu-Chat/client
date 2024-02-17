//utility
function escapeHtml(unsafe) {
  return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

//frontend stuff
const chatlog = document.getElementById('chatlog')
const chatbox = document.getElementById('chatbox')

function clear() {
  chatlog.textContent = '';
}

function formatTimestamp(snowflake) {
  console.log(snowflake)
  var timestamp = snowflake / 2**22 + 1704067200000
  var t = new Date(snowflake / 2**22 + 1704067200000); //get actual time from snowflake
  
  var time = `${t.getHours()}:${t.getMinutes().toString().padStart(2,'0')}`
  var date = Date.now()-timestamp < 86400000 ? '' : `on ${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()}`
  return time + date
}

function log(text) {
  var log = document.createElement("div")
  log.classList.add("message")
  log.innerHTML = text
  chatlog.insertBefore(log, chatlog.firstChild)
  return log
}

function formatMessage(message) {
  return escapeHtml(message) //will be used for formatting later
}

function displayMessage(message) {
  console.log(message)
  var display = log(`<b>${escapeHtml(message.user.username)}: </b>${formatMessage(message.message.message)}`);
  var timestamp = document.createElement("small")
  timestamp.classList.add("timestamp")
  timestamp.innerHTML = formatTimestamp(message.message.snowflake)
  display.appendChild(timestamp)
}


//backend stuff
const api = window.API
var options = null
var url = null
fetch('./config.json').then((response) => response.json()).then((json) => setup(json))
var loginStage = 0 //0 = username, 1 = password, 2 = done
var username = ''
var password = ''
var token = null

function setup(json) { //initializes everything
  options = json
  url = options.server
  log("Enter username.")
}

function send(event) {
  if (event.key == "Enter" && chatbox.value) {
    var value = chatbox.value
    chatbox.value = ""
    switch (loginStage) {
      case 0:
        username = value
        clear()
        log("Enter password.")
        loginStage = 1
        break;
      case 1:
        password = value
        loginStage = 2
        login()
        break;
      case 2:
        sendMessage(value)
    }
  }
}

function login() {
  api.request(url, "POST", "/api/token", {}, {username:username, password:password}, 'query').then((logid) =>
    api.receive(logid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (1500)`)
            break;
          case 422:
            clear()
            log(`Invalid login. (1422)`);
            break;
          case 401:
            clear()
            log(`Authentication failed. (1401)`);
            log(`Enter new username.`);
            loginStage = 0
            break;
          case 200:
            token = JSON.parse(response.response).access_token
            joinChannel(4)
            break;
          default:
            log(`Unknown login error. (1${response.status})`)
        }
      }
    })
  )
}

var channel = 4

function joinChannel(target = null) {
  if (target) {channel = target};
  document.getElementById("channeltitle").innerText = `Channel ${channel}`;
  loadChannel();
}

function loadChannel() {  
  var parameters = {count: 50, type: -1}
  api.request(url, "POST", `/api/channel/${channel}/getmessages/9223372036854775807`, parameters, null, null, token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (2500)`)
            break;
          case 422:
            log(`Invalid state. (2422)`);
            break;
          case 401:
            log(`Authentication failed. (2401)`)
            break;
          case 204:
            log(`(This channel is empty.)`)
            break;
          case 200:
            clear()
            JSON.parse(response.response).forEach((element) => {
              displayMessage(element);
            });
            listen(channel)
            break;
          default:
            log(`Unknown loading error. (2${response.status})`)
        }
      }
    })
  )
}

function listen(channel) {
  var listener = new WebSocket(`wss://`+url+`/api/channel/${channel}/listen`)
  listener.addEventListener('message', (event) => {
    displayMessage(JSON.parse(event.data));
  });
}

function sendMessage(message) {
  api.request(url, "POST", `/api/channel/${channel}/sendmessage`, {}, {message:message}, 'json', token).then((loadid) =>
    api.receive(loadid, (response) => {
      if (response.error) {
        log(`Error: ${response.error}`)
      } else {
        switch (response.status) {
          case 500:
            log(`Server unavailable. (3500)`)
            break;
          case 422:
            log(`Invalid state. (3422)`);
            break;  
          case 401:
            log(`Authentication failed. (3401)`)
            break;
          case 400:
            log(`Message too long. (3400)`)
            break;
          case 201:
            break;
          default:
            log(`Unknown message error. (3${response.status})`)
        }
      }
    })
  )
}

chatbox.addEventListener("keydown", send);